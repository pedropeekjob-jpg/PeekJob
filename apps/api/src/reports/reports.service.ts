import { ConflictException, HttpException, HttpStatus, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { Pool } from 'pg';
import { MAILER, type Mailer } from '../auth/mailer';
import { mailSubject } from '../common/config';
import { pick, type Lang } from '../common/lang';
import { privacySecret } from '../common/privacy';
import { isUuid } from '../common/zod';
import { isUniqueViolation, PG_POOL, tx } from '../db/db.module';
import { CONTENT_SQL, kindOf, targetIds, type ContentKind } from './content';

export const REPORT_REASONS = ['nome', 'ofensa', 'falso', 'privado', 'ilegal', 'outro'] as const;
export const MAX_REPORTS_PER_DAY = 10;

export interface NewReport {
  reason: (typeof REPORT_REASONS)[number];
  details: string;
  contactName?: string;
  contactEmail?: string;
  lang: Lang;
}

/** Como se diz o que foi denunciado, nos emails */
const WHAT: Record<ContentKind, { pt: string; ptThe: string; en: string; enNoun: string }> = {
  review: { pt: 'uma avaliação', ptThe: 'a avaliação', en: 'a review', enNoun: 'review' },
  interview: { pt: 'uma entrevista', ptThe: 'a entrevista', en: 'an interview', enNoun: 'interview' },
};

const ipHash = (ip: string) => createHmac('sha256', privacySecret()).update(`ip:${ip}`).digest('hex');

@Injectable()
export class ReportsService {
  private readonly log = new Logger('Moderação');
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  /** Qualquer pessoa pode denunciar; a avaliação (ou entrevista) só sai do site por decisão da moderação. */
  async create(kind: ContentKind, contentId: string, r: NewReport, reporterRef: string | null, ip: string) {
    if (!isUuid(contentId)) throw new NotFoundException();
    const found = await this.pool.query(CONTENT_SQL[kind].published, [contentId]);
    if (!found.rowCount) throw new NotFoundException(kind === 'review' ? 'Avaliação não encontrada' : 'Entrevista não encontrada');
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
        `INSERT INTO reports (review_id, interview_id, reason, details, reporter_ref, reporter_ip_hash, contact_name, contact_email, lang)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [...targetIds(kind, contentId), r.reason, r.details, reporterRef, h, r.contactName || null, r.contactEmail || null, r.lang],
      );
      return { id: rows[0].id as string, reference: (rows[0].id as string).replace(/-/g, '').slice(0, 8).toUpperCase() };
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw new ConflictException(kind === 'review' ? 'Já denunciaste esta avaliação. A moderação está a analisar.' : 'Já denunciaste esta entrevista. A moderação está a analisar.');
      }
      throw e;
    }
  }

  /** Fila: denúncias em aberto agrupadas por avaliação ou entrevista (mais denunciadas e mais antigas primeiro). */
  async queue() {
    const { rows } = await this.pool.query(
      `SELECT p.review_id, coalesce(p.review_id, p.interview_id) AS content_id,
              coalesce(r.text, i.text) AS text, coalesce(r.tags, '{}') AS tags, i.role,
              coalesce(r.status, i.status) AS status, coalesce(r.created_at, i.created_at) AS content_created_at,
              o.id AS org_id, o.name AS org_name,
              json_agg(json_build_object('id', p.id, 'reason', p.reason, 'details', p.details, 'createdAt', p.created_at) ORDER BY p.created_at) AS reports,
              count(*)::int AS count, min(p.created_at) AS first_at
         FROM reports p
         LEFT JOIN reviews r ON r.id = p.review_id
         LEFT JOIN interviews i ON i.id = p.interview_id
         JOIN organizations o ON o.id = coalesce(r.org_id, i.org_id)
        WHERE p.status = 'open'
        GROUP BY p.review_id, p.interview_id, r.id, i.id, o.id
        ORDER BY count(*) DESC, min(p.created_at) ASC
        LIMIT 200`,
    );
    return {
      items: rows.map((x) => ({
        kind: kindOf(x),
        contentId: x.content_id,
        role: x.role ?? undefined,
        orgId: x.org_id,
        orgName: x.org_name,
        text: x.text,
        tags: x.tags,
        contentStatus: x.status,
        contentCreatedAt: x.content_created_at,
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
  async decide(kind: ContentKind, contentId: string, action: 'remove' | 'keep', note: string, moderatorId: string) {
    if (!isUuid(contentId)) throw new NotFoundException();
    const ids = targetIds(kind, contentId);
    const result = await tx(this.pool, async (c) => {
      const { rows } = await c.query(CONTENT_SQL[kind].lock, [contentId]);
      const content = rows[0];
      if (!content) throw new NotFoundException(kind === 'review' ? 'Avaliação não encontrada' : 'Entrevista não encontrada');
      if (action === 'remove') await c.query(CONTENT_SQL[kind].setStatus, [contentId, 'removed']);
      const outcome = action === 'remove' ? 'upheld' : 'rejected';
      const closed = await c.query(
        `UPDATE reports SET status = $2, decided_at = now(), decided_by = $3, decision_note = $4
          WHERE (review_id = $1 OR interview_id = $1) AND status = 'open'
          RETURNING id, reporter_ref, contact_email, contact_name, lang`,
        [contentId, outcome, moderatorId, note],
      );
      const tell = (userRef: string, decision: string) =>
        c.query(`INSERT INTO support_messages (user_ref, review_id, interview_id, type, details) VALUES ($1, $2, $3, 'moderation', $4)`, [
          userRef,
          ...ids,
          { decision, note, orgName: content.org_name, kind },
        ]);
      if (action === 'remove') await tell(content.author_ref, 'removed');
      const notified = new Set<string>();
      for (const r of closed.rows) {
        if (!r.reporter_ref || notified.has(r.reporter_ref) || r.reporter_ref === content.author_ref) continue;
        notified.add(r.reporter_ref);
        await tell(r.reporter_ref, outcome);
      }
      return { orgName: content.org_name as string, outcome, closedCount: closed.rowCount ?? 0, contacts: closed.rows.filter((r) => r.contact_email) };
    });

    // Quem denunciou sem conta e deixou email: recebe a decisão; depois o contacto é apagado.
    const what = WHAT[kind];
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
              `Olá${c.contact_name ? ` ${c.contact_name}` : ''},\n\nAnalisámos a tua denúncia sobre ${what.pt} de ${result.orgName}.\n` +
                `Decisão: ${what.ptThe} ${result.outcome === 'upheld' ? 'foi removida' : 'mantém-se'}.\nMotivo: ${note}\n\nObrigado por ajudares a manter a PeekJob segura.`,
              `Hi${c.contact_name ? ` ${c.contact_name}` : ''},\n\nWe reviewed your report about ${what.en} of ${result.orgName}.\n` +
                `Decision: the ${what.enNoun} ${result.outcome === 'upheld' ? 'was removed' : 'stays'}.\nReason: ${note}\n\nThank you for helping keep PeekJob safe.`,
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
