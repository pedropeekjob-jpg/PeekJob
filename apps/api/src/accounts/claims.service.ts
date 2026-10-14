import { BadRequestException, ConflictException, HttpException, HttpStatus, Inject, Injectable, NotFoundException, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { randomInt } from 'crypto';
import { Pool } from 'pg';
import { MAILER, type Mailer } from '../auth/mailer';
import { sha256 } from '../auth/crypto';
import { mailSubject } from '../common/config';
import { pick, type Lang } from '../common/lang';
import { isUuid } from '../common/zod';
import { isUniqueViolation, PG_POOL, tx } from '../db/db.module';
import { extractNifs } from '../verification/nif-extract';
import { CODE_MINUTES, MAX_CODE_ATTEMPTS } from '../verification/verification.service';
import { emailDomain, isPersonalDomain } from './accounts';

export interface Claimant {
  name: string;
  role: string;
}

/**
 * Reivindicar a página de uma organização: prova por email do domínio (código) ou por documento com o NIF.
 * O pedido fica pendente até a moderação aprovar (um recibo de quem lá trabalha também tem o NIF).
 */
@Injectable()
export class ClaimsService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  private async activeOrg(id: string) {
    if (!isUuid(id)) throw new NotFoundException();
    const { rows } = await this.pool.query(`SELECT id, name, nif FROM organizations WHERE id = $1 AND status = 'active'`, [id]);
    if (!rows[0]) throw new NotFoundException();
    return rows[0] as { id: string; name: string; nif: string | null };
  }

  /** Envia o código ao email de trabalho; o email só existe em memória durante o envio */
  async sendCode(memberRef: string, orgId: string, email: string, lang: Lang) {
    const org = await this.activeOrg(orgId);
    const domain = emailDomain(email);
    if (isPersonalDomain(domain)) {
      throw new UnprocessableEntityException({ code: 'PERSONAL_EMAIL', message: 'Usa o email da organização (não serve um email pessoal), ou envia um documento.' });
    }
    const known = (await this.pool.query('SELECT domain FROM org_domains WHERE org_id = $1', [orgId])).rows.map((r) => r.domain);
    if (known.length && !known.includes(domain)) {
      throw new UnprocessableEntityException({ code: 'DOMAIN_MISMATCH', message: 'Usa o email do domínio da organização, ou envia um documento.' });
    }
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.pool.query(
      `INSERT INTO org_claim_codes (member_ref, org_id, email_domain, code_hash, expires_at)
       VALUES ($1, $2, $3, $4, now() + make_interval(mins => $5))
       ON CONFLICT (member_ref, org_id) DO UPDATE
         SET email_domain = EXCLUDED.email_domain, code_hash = EXCLUDED.code_hash, attempts = 0, expires_at = EXCLUDED.expires_at, created_at = now()`,
      [memberRef, orgId, domain, sha256(`${memberRef}:${code}`), CODE_MINUTES],
    );
    try {
      await this.mailer.send({
        to: email,
        subject: mailSubject(pick(lang, 'Código para gerir a página na PeekJob', 'Your PeekJob page code')),
        text: pick(
          lang,
          `O teu código é ${code}. Serve para pedir a gestão da página de ${org.name} e é válido durante ${CODE_MINUTES} minutos.\nNão guardamos este email.`,
          `Your code is ${code}. It lets you ask to manage ${org.name}'s page and is valid for ${CODE_MINUTES} minutes.\nWe don't store this email.`,
        ),
      });
    } catch {
      await this.pool.query('DELETE FROM org_claim_codes WHERE member_ref = $1 AND org_id = $2', [memberRef, orgId]);
      throw new ServiceUnavailableException('Não foi possível enviar o email. Tenta outra vez daqui a pouco.');
    }
  }

  async confirmCode(memberRef: string, orgId: string, code: string, who: Claimant) {
    await this.activeOrg(orgId);
    return tx(this.pool, async (c) => {
      const { rows } = await c.query(
        `SELECT code_hash, email_domain, attempts, expires_at > now() AS valid FROM org_claim_codes WHERE member_ref = $1 AND org_id = $2 FOR UPDATE`,
        [memberRef, orgId],
      );
      const row = rows[0];
      if (!row?.valid) throw new BadRequestException('Código expirado. Pede um novo.');
      if (row.attempts >= MAX_CODE_ATTEMPTS) throw new HttpException('Demasiadas tentativas. Pede um novo código.', HttpStatus.TOO_MANY_REQUESTS);
      if (row.code_hash !== sha256(`${memberRef}:${code}`)) {
        await c.query('UPDATE org_claim_codes SET attempts = attempts + 1 WHERE member_ref = $1 AND org_id = $2', [memberRef, orgId]);
        // a tentativa conta mesmo com o erro: confirmar antes de lançar
        await c.query('COMMIT');
        await c.query('BEGIN');
        throw new BadRequestException('Código errado.');
      }
      await c.query('DELETE FROM org_claim_codes WHERE member_ref = $1 AND org_id = $2', [memberRef, orgId]);
      return this.insertClaim(c, orgId, memberRef, 'email', row.email_domain, who);
    });
  }

  /** Documento (certidão, declaração…) lido em memória: tem de ter o NIF da organização */
  async byDocument(memberRef: string, orgId: string, text: string, who: Claimant) {
    const org = await this.activeOrg(orgId);
    if (!org.nif) throw new UnprocessableEntityException({ code: 'ORG_WITHOUT_NIF', message: 'Esta organização ainda não tem NIF registado. Usa o email da organização.' });
    if (!extractNifs(text).includes(org.nif.trim())) {
      throw new UnprocessableEntityException({ code: 'NIF_NOT_FOUND', message: 'Não encontrámos o NIF da organização neste documento.' });
    }
    return tx(this.pool, (c) => this.insertClaim(c, orgId, memberRef, 'document', null, who));
  }

  private async insertClaim(c: Pick<Pool, 'query'>, orgId: string, memberRef: string, method: 'email' | 'document', domain: string | null, who: Claimant) {
    try {
      await c.query('SAVEPOINT claim');
      const { rows } = await c.query(
        `INSERT INTO org_claims (org_id, member_ref, method, email_domain, name, role) VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, status, method, created_at`,
        [orgId, memberRef, method, domain, who.name, who.role],
      );
      return { claim: { id: rows[0].id, status: rows[0].status, method: rows[0].method, createdAt: rows[0].created_at } };
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException('Já tens um pedido em análise para esta organização.');
      throw e;
    }
  }

  /** As páginas que giro e os meus pedidos */
  async mine(memberRef: string) {
    const orgs = await this.pool.query(
      `SELECT o.id, o.name, o.plan FROM org_members m JOIN organizations o ON o.id = m.org_id
        WHERE m.member_ref = $1 AND o.status = 'active' ORDER BY o.name`,
      [memberRef],
    );
    const claims = await this.pool.query(
      `SELECT c.id, c.org_id, o.name AS org_name, c.method, c.status, c.decision_note, c.created_at, c.decided_at
         FROM org_claims c JOIN organizations o ON o.id = c.org_id WHERE c.member_ref = $1 ORDER BY c.created_at DESC`,
      [memberRef],
    );
    return {
      orgs: orgs.rows.map((o) => ({ id: o.id, name: o.name, plan: o.plan })),
      claims: claims.rows.map((c) => ({
        id: c.id,
        orgId: c.org_id,
        orgName: c.org_name,
        method: c.method,
        status: c.status,
        note: c.decision_note,
        createdAt: c.created_at,
        decidedAt: c.decided_at,
      })),
    };
  }

  /** Fila da moderação: pedidos pendentes, mais antigos primeiro (sem pseudónimos) */
  async queue() {
    const { rows } = await this.pool.query(
      `SELECT c.id, c.org_id, o.name AS org_name, o.city, o.nif, c.method, c.email_domain, c.name, c.role, c.created_at,
              EXISTS (SELECT 1 FROM org_domains d WHERE d.org_id = c.org_id AND d.domain = c.email_domain) AS domain_known,
              (SELECT count(*)::int FROM org_members m WHERE m.org_id = c.org_id) AS members
         FROM org_claims c JOIN organizations o ON o.id = c.org_id
        WHERE c.status = 'pending' ORDER BY c.created_at`,
    );
    return {
      items: rows.map((c) => ({
        id: c.id,
        orgId: c.org_id,
        orgName: c.org_name,
        city: c.city,
        nif: c.nif,
        method: c.method,
        emailDomain: c.email_domain,
        domainKnown: c.domain_known,
        name: c.name,
        role: c.role,
        members: c.members,
        createdAt: c.created_at,
      })),
    };
  }

  async decide(id: string, action: 'approve' | 'reject', note: string, moderatorId: string) {
    if (!isUuid(id)) throw new NotFoundException();
    return tx(this.pool, async (c) => {
      const { rows } = await c.query(`SELECT id, org_id, member_ref, status FROM org_claims WHERE id = $1 FOR UPDATE`, [id]);
      const claim = rows[0];
      if (!claim) throw new NotFoundException();
      if (claim.status !== 'pending') throw new ConflictException('Este pedido já foi decidido.');
      const status = action === 'approve' ? 'approved' : 'rejected';
      await c.query(`UPDATE org_claims SET status = $2, decision_note = $3, decided_by = $4, decided_at = now() WHERE id = $1`, [id, status, note, moderatorId]);
      if (action === 'approve') {
        await c.query(`INSERT INTO org_members (org_id, member_ref) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [claim.org_id, claim.member_ref]);
      }
      return { status };
    });
  }

  /** Páginas geridas (para a moderação ligar o Pro): nº de pessoas que gerem e o plano */
  async managed() {
    const { rows } = await this.pool.query(
      `SELECT o.id, o.name, o.city, o.plan, count(m.member_ref)::int AS members
         FROM organizations o JOIN org_members m ON m.org_id = o.id
        WHERE o.status = 'active' GROUP BY o.id ORDER BY o.name LIMIT 500`,
    );
    return { items: rows.map((o) => ({ id: o.id, name: o.name, city: o.city, plan: o.plan, members: o.members })) };
  }

  /** Plano da organização (até haver pagamentos, ligado pela moderação). Nunca mexe no ranking. */
  async setPlan(orgId: string, plan: 'free' | 'pro') {
    if (!isUuid(orgId)) throw new NotFoundException();
    const { rows } = await this.pool.query(`UPDATE organizations SET plan = $2 WHERE id = $1 RETURNING id, plan`, [orgId, plan]);
    if (!rows[0]) throw new NotFoundException();
    return { id: rows[0].id, plan: rows[0].plan };
  }
}
