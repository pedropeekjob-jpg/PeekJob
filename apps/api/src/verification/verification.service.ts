import { BadRequestException, HttpException, HttpStatus, Inject, Injectable, NotFoundException, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { randomInt } from 'crypto';
import { Pool, PoolClient } from 'pg';
import { MAILER, type Mailer } from '../auth/mailer';
import { sha256 } from '../auth/crypto';
import { isUuid } from '../common/zod';
import { PG_POOL, tx } from '../db/db.module';
import { shouldActivate } from '../domain/activation';
import { extractNifs } from './nif-extract';

export const CODE_MINUTES = 10;
export const MAX_CODE_ATTEMPTS = 5;

@Injectable()
export class VerificationService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  private async org(id: string, c: Pool | PoolClient = this.pool) {
    if (!isUuid(id)) throw new NotFoundException();
    const { rows } = await c.query(`SELECT id, name, nif, status, nif_verified FROM organizations WHERE id = $1 AND status IN ('active', 'pending')`, [id]);
    if (!rows[0]) throw new NotFoundException();
    return rows[0] as { id: string; name: string; nif: string | null; status: 'active' | 'pending'; nif_verified: boolean };
  }

  /** Envia um código para o email de trabalho. O email só existe em memória durante o envio. */
  async sendEmailCode(userRef: string, orgId: string, workEmail: string) {
    const org = await this.org(orgId);
    const domain = workEmail.split('@')[1]?.toLowerCase();
    const domains = (await this.pool.query('SELECT domain FROM org_domains WHERE org_id = $1', [orgId])).rows.map((r) => r.domain);
    if (domains.length && !domains.includes(domain)) {
      throw new UnprocessableEntityException({ code: 'DOMAIN_MISMATCH', message: 'Usa o email da organização ou verifica com um recibo.' });
    }
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.pool.query(
      `INSERT INTO verification_codes (user_ref, org_id, code_hash, expires_at)
       VALUES ($1, $2, $3, now() + make_interval(mins => $4))
       ON CONFLICT (user_ref, org_id) DO UPDATE SET code_hash = EXCLUDED.code_hash, attempts = 0, expires_at = EXCLUDED.expires_at, created_at = now()`,
      [userRef, orgId, sha256(`${userRef}:${code}`), CODE_MINUTES],
    );
    try {
      await this.mailer.send({
        to: workEmail,
        subject: 'Código de verificação PeekJob',
        text: `O teu código é ${code}. Serve para confirmar que trabalhas em ${org.name} e é válido durante ${CODE_MINUTES} minutos.\nNão guardamos este email.`,
      });
    } catch {
      await this.pool.query('DELETE FROM verification_codes WHERE user_ref = $1 AND org_id = $2', [userRef, orgId]);
      throw new ServiceUnavailableException('Não foi possível enviar o email. Tenta outra vez daqui a pouco.');
    }
  }

  async confirmEmailCode(userRef: string, orgId: string, code: string) {
    await this.org(orgId);
    return tx(this.pool, async (c) => {
      const { rows } = await c.query(`SELECT code_hash, attempts, expires_at > now() AS valid FROM verification_codes WHERE user_ref = $1 AND org_id = $2 FOR UPDATE`, [userRef, orgId]);
      const row = rows[0];
      if (!row || !row.valid) throw new BadRequestException('Código expirado. Pede um novo.');
      if (row.attempts >= MAX_CODE_ATTEMPTS) throw new HttpException('Demasiadas tentativas. Pede um novo código.', HttpStatus.TOO_MANY_REQUESTS);
      if (row.code_hash !== sha256(`${userRef}:${code}`)) {
        await c.query('UPDATE verification_codes SET attempts = attempts + 1 WHERE user_ref = $1 AND org_id = $2', [userRef, orgId]);
        // o incremento tem de persistir mesmo com o erro: confirmar antes de lançar
        await c.query('COMMIT');
        await c.query('BEGIN');
        throw new BadRequestException('Código errado.');
      }
      await c.query('DELETE FROM verification_codes WHERE user_ref = $1 AND org_id = $2', [userRef, orgId]);
      await this.grant(c, userRef, orgId, 'email');
      return { verified: true, method: 'email' as const };
    });
  }

  /** Lê o NIF de um recibo/contrato em memória; guarda só o resultado. */
  async verifyDocument(userRef: string, orgId: string, text: string) {
    return tx(this.pool, async (c) => {
      const org = await this.org(orgId, c);
      if (!org.nif) {
        throw new UnprocessableEntityException({ code: 'ORG_WITHOUT_NIF', message: 'Esta organização ainda não tem NIF registado. Verifica por email.' });
      }
      if (!extractNifs(text).includes(org.nif.trim())) {
        throw new UnprocessableEntityException({ code: 'NIF_NOT_FOUND', message: 'Não encontrámos o NIF da organização neste documento.' });
      }
      await this.grant(c, userRef, orgId, 'document');
      if (!org.nif_verified) {
        await c.query('UPDATE organizations SET nif_verified = true WHERE id = $1', [orgId]);
        if (shouldActivate({ status: org.status, nifVerified: true, distinctReviewers: 0 })) {
          await c.query(`UPDATE organizations SET status = 'active', activated_at = now() WHERE id = $1`, [orgId]);
        }
      }
      return { verified: true, method: 'document' as const };
    });
  }

  private async grant(c: PoolClient, userRef: string, orgId: string, method: 'email' | 'document') {
    await c.query(
      `INSERT INTO verifications (user_ref, org_id, method) VALUES ($1, $2, $3) ON CONFLICT (user_ref, org_id) DO NOTHING`,
      [userRef, orgId, method],
    );
    await c.query('UPDATE reviews SET verified = true WHERE org_id = $1 AND author_ref = $2', [orgId, userRef]);
  }

  async listMine(userRef: string): Promise<string[]> {
    const { rows } = await this.pool.query('SELECT org_id FROM verifications WHERE user_ref = $1 ORDER BY created_at', [userRef]);
    return rows.map((r) => r.org_id);
  }
}
