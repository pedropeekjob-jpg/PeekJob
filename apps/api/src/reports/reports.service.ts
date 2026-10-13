import { ConflictException, HttpException, HttpStatus, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { Pool } from 'pg';
import { MAILER, type Mailer } from '../auth/mailer';
import { mailSubject } from '../common/config';
import { pick, type Lang } from '../common/lang';
import { privacySecret } from '../common/privacy';
import { isUuid } from '../common/zod';
import { isUniqueViolation, PG_POOL, tx } from '../db/db.module';

export const REPORT_REASONS = ['nome', 'ofensa', 'falso', 'privado', 'ilegal', 'outro'] as const;
export const MAX_REPORTS_PER_DAY = 10;

export interface NewReport {
  reason: (typeof REPORT_REASONS)[number];
  details: string;
  contactName?: string;
  contactEmail?: string;
  lang: Lang;
}

const ipHash = (ip: string) => createHmac('sha256', privacySecret()).update(`ip:${ip}`).digest('hex');

@Injectable()
export class ReportsService {
  private readonly log = new Logger('Moderação');
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  /** Qualquer pessoa pode denunciar; a avaliação só sai do site por decisão da moderação. */
  async create(reviewId: string, r: NewReport, reporterRef: string | null, ip: string) {
    if (!isUuid(reviewId)) throw new NotFoundException();
    const rev = await this.pool.query(`SELECT 1 FROM reviews WHERE id = $1 AND status = 'published'`, [reviewId]);
    if (!rev.rowCount) throw new NotFoundException('Avaliação não encontrada');
    const h = ipHash(ip);
    const recent = await this.pool.query(
      `SELECT count(*)::int AS n FROM reports WHERE created_at > now() - interval '1 day' AND (reporter_ip_hash = $1 OR ($2::text IS NOT NULL AND reporter_ref = $2))`,
      [h, reporterRef],
    );
    if (recent.rows[0].n >= MAX_REPORTS_PER_DAY) {
      throw new HttpException('Demasiadas denúncias. Tenta amanhã.', HttpStatus.TOO_MANY_REQUESTS);
    }
    try {
      const { rows } = await this.pool.query(
        `INSERT INTO reports (review_id, reason, details, reporter_ref, reporter_ip_hash, contact_name, contact_email, lang)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [reviewId, r.reason, r.details, reporterRef, h, r.contactName || null, r.contactEmail || null, r.lang],
      );
      return { id: rows[0].id as string, reference: (rows[0].id as string).replace(/-/g, '').slice(0, 8).toUpperCase() };
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException('Já denunciaste esta avaliação. A moderação está a analisar.');
      throw e;
    }
  }

  /** Fila: denúncias em aberto agrupadas por avaliação (mais denunciadas e mais antigas primeiro). */
  async queue() {
    const { rows } = await this.pool.query(
      `SELECT r.id AS review_id, r.text, r.tags, r.status, r.created_at AS review_created_at, o.id AS org_id, o.name AS org_name,
              json_agg(json_build_object('id', p.id, 'reason', p.reason, 'details', p.details, 'createdAt', p.created_at) ORDER BY p.created_at) AS reports,
              count(*)::int AS count, min(p.created_at) AS first_at
         FROM reports p
         JOIN reviews r ON r.id = p.review_id
         JOIN organizations o ON o.id = r.org_id
        WHERE p.status = 'open'
        GROUP BY r.id, o.id
        ORDER BY count(*) DESC, min(p.created_at) ASC
        LIMIT 200`,
    );
    return {
      items: rows.map((x) => ({
        reviewId: x.review_id,
        orgId: x.org_id,
        orgName: x.org_name,
        text: x.text,
        tags: x.tags,
        reviewStatus: x.status,
        reviewCreatedAt: x.review_created_at,
        count: x.count,
        firstReportedAt: x.first_at,
        reports: x.reports,
      })),
    };
  }

  /**
   * Decisão com justificação (exposição de motivos). Remover: a avaliação sai do site e quem a escreveu
   * recebe a explicação. Quem denunciou recebe a decisão (mensagem privada, ou email se o deixou).
   */
  async decide(reviewId: string, action: 'remove' | 'keep', note: string, moderatorId: string) {
    if (!isUuid(reviewId)) throw new NotFoundException();
    const result = await tx(this.pool, async (c) => {
      const { rows } = await c.query(
        `SELECT r.id, r.author_ref, r.status, o.name AS org_name FROM reviews r JOIN organizations o ON o.id = r.org_id WHERE r.id = $1 FOR UPDATE OF r`,
        [reviewId],
      );
      const review = rows[0];
      if (!review) throw new NotFoundException('Avaliação não encontrada');
      if (action === 'remove') await c.query(`UPDATE reviews SET status = 'removed' WHERE id = $1`, [reviewId]);
      const outcome = action === 'remove' ? 'upheld' : 'rejected';
      const closed = await c.query(
        `UPDATE reports SET status = $2, decided_at = now(), decided_by = $3, decision_note = $4
          WHERE review_id = $1 AND status = 'open'
          RETURNING id, reporter_ref, contact_email, contact_name, lang`,
        [reviewId, outcome, moderatorId, note],
      );
      if (action === 'remove') {
        await c.query(
          `INSERT INTO support_messages (user_ref, review_id, type, details) VALUES ($1, $2, 'moderation', $3)`,
          [review.author_ref, reviewId, { decision: 'removed', note, orgName: review.org_name }],
        );
      }
      const notified = new Set<string>();
      for (const r of closed.rows) {
        if (!r.reporter_ref || notified.has(r.reporter_ref) || r.reporter_ref === review.author_ref) continue;
        notified.add(r.reporter_ref);
        await c.query(
          `INSERT INTO support_messages (user_ref, review_id, type, details) VALUES ($1, $2, 'moderation', $3)`,
          [r.reporter_ref, reviewId, { decision: outcome, note, orgName: review.org_name }],
        );
      }
      return { orgName: review.org_name as string, outcome, closedCount: closed.rowCount ?? 0, contacts: closed.rows.filter((r) => r.contact_email) };
    });

    // Quem denunciou sem conta e deixou email: recebe a decisão; depois o contacto é apagado.
    const sent = new Set<string>();
    for (const c of result.contacts) {
      if (!sent.has(c.contact_email)) {
        sent.add(c.contact_email);
        const lang = c.lang as Lang;
        try {
          await this.mailer.send({
            to: c.contact_email,
            subject: mailSubject(pick(lang, 'A tua denúncia na PeekJob', 'Your report on PeekJob')),
            text: pick(
              lang,
              `Olá${c.contact_name ? ` ${c.contact_name}` : ''},\n\nAnalisámos a tua denúncia sobre uma avaliação de ${result.orgName}.\n` +
                `Decisão: ${result.outcome === 'upheld' ? 'a avaliação foi removida' : 'a avaliação mantém-se'}.\nMotivo: ${note}\n\nObrigado por ajudares a manter a PeekJob segura.`,
              `Hi${c.contact_name ? ` ${c.contact_name}` : ''},\n\nWe reviewed your report about a review of ${result.orgName}.\n` +
                `Decision: ${result.outcome === 'upheld' ? 'the review was removed' : 'the review stays'}.\nReason: ${note}\n\nThank you for helping keep PeekJob safe.`,
            ),
          });
        } catch (e) {
          this.log.error(`Falha ao enviar a decisão por email: ${(e as Error).message}`);
          continue; // o contacto fica para nova tentativa
        }
      }
      await this.pool.query(`UPDATE reports SET contact_name = NULL, contact_email = NULL WHERE id = $1`, [c.id]);
    }
    return { decision: action === 'remove' ? 'removed' : 'kept', reportsClosed: result.closedCount };
  }
}
