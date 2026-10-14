import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { isUuid } from '../common/zod';
import { PG_POOL, tx } from '../db/db.module';
import { CONTENT_SQL, kindOf } from '../reports/content';
import { appealDeadline, isAppealable, sideOf } from './appeals';

@Injectable()
export class AppealsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** Pedir a revisão de uma decisão, a partir do aviso que a pessoa recebeu */
  async create(messageId: string, appellantRef: string, text: string) {
    if (!isUuid(messageId)) throw new NotFoundException();
    return tx(this.pool, async (c) => {
      const { rows } = await c.query(
        `SELECT m.id, m.type, m.review_id, m.interview_id, m.details, m.created_at, a.id AS appeal_id
           FROM support_messages m LEFT JOIN appeals a ON a.message_id = m.id
          WHERE m.id = $1 AND m.user_ref = $2 FOR UPDATE OF m`,
        [messageId, appellantRef],
      );
      const m = rows[0];
      if (!m) throw new NotFoundException();
      const decision = m.details?.decision;
      if (!isAppealable(m.type, decision) || (!m.review_id && !m.interview_id)) throw new ConflictException({ message: 'Esta mensagem não é uma decisão que se possa contestar.' });
      if (m.appeal_id) throw new ConflictException({ message: 'Já pediste a revisão desta decisão.' });
      if (appealDeadline(m.created_at) <= new Date()) throw new ConflictException({ message: 'O prazo para contestar (6 meses) já terminou.' });
      const r = await c.query(
        `INSERT INTO appeals (message_id, review_id, interview_id, appellant_ref, side, original_decision, original_note, text)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, status, created_at`,
        [m.id, m.review_id, m.interview_id, appellantRef, sideOf(decision), decision, m.details?.note ?? null, text],
      );
      return { id: r.rows[0].id, status: r.rows[0].status };
    });
  }

  /** Fila da moderação: pedidos em aberto, mais antigos primeiro (sem pseudónimos) */
  async queue() {
    const { rows } = await this.pool.query(
      `SELECT a.id, a.side, a.original_decision, a.original_note, a.text, a.created_at, a.review_id,
              coalesce(a.review_id, a.interview_id) AS content_id, coalesce(r.text, i.text) AS content_text,
              coalesce(r.tags, '{}') AS tags, r.avg, i.role, coalesce(r.status, i.status) AS content_status, o.name AS org_name
         FROM appeals a
         LEFT JOIN reviews r ON r.id = a.review_id
         LEFT JOIN interviews i ON i.id = a.interview_id
         JOIN organizations o ON o.id = coalesce(r.org_id, i.org_id)
        WHERE a.status = 'open' ORDER BY a.created_at`,
    );
    return {
      items: rows.map((a) => ({
        id: a.id,
        side: a.side,
        originalDecision: a.original_decision,
        originalNote: a.original_note,
        text: a.text,
        createdAt: a.created_at,
        orgName: a.org_name,
        content: {
          kind: kindOf(a),
          id: a.content_id,
          text: a.content_text,
          tags: a.tags,
          avg: a.avg == null ? undefined : Number(a.avg),
          role: a.role ?? undefined,
          status: a.content_status,
        },
      })),
    };
  }

  /**
   * Decidir o pedido (pessoa da moderação, com justificação). Reverter desfaz a decisão original:
   * a avaliação removida volta; a que se manteve é removida e quem a escreveu é avisado (e pode contestar).
   */
  async decide(id: string, action: 'reverse' | 'confirm', note: string, moderatorId: string) {
    if (!isUuid(id)) throw new NotFoundException();
    return tx(this.pool, async (c) => {
      const { rows } = await c.query(
        `SELECT a.id, a.status, a.side, a.review_id, a.interview_id, a.appellant_ref,
                coalesce(r.author_ref, i.author_ref) AS author_ref, o.name AS org_name
           FROM appeals a
           LEFT JOIN reviews r ON r.id = a.review_id
           LEFT JOIN interviews i ON i.id = a.interview_id
           JOIN organizations o ON o.id = coalesce(r.org_id, i.org_id)
          WHERE a.id = $1 FOR UPDATE OF a`,
        [id],
      );
      const a = rows[0];
      if (!a) throw new NotFoundException();
      if (a.status !== 'open') throw new ConflictException({ message: 'Este pedido já foi decidido.' });
      const reversed = action === 'reverse';
      await c.query(`UPDATE appeals SET status = $2, decision_note = $3, decided_by = $4, decided_at = now() WHERE id = $1`, [
        id,
        reversed ? 'reversed' : 'confirmed',
        note,
        moderatorId,
      ]);
      const kind = kindOf(a);
      const contentId = a.review_id ?? a.interview_id;
      const tell = (userRef: string, decision: string) =>
        c.query(`INSERT INTO support_messages (user_ref, review_id, interview_id, type, details) VALUES ($1, $2, $3, 'moderation', $4)`, [
          userRef,
          a.review_id,
          a.interview_id,
          { decision, note, orgName: a.org_name, kind },
        ]);
      if (reversed && a.side === 'author') await c.query(CONTENT_SQL[kind].setStatus, [contentId, 'published']);
      if (reversed && a.side === 'reporter') {
        await c.query(CONTENT_SQL[kind].setStatus, [contentId, 'removed']);
        await tell(a.author_ref, 'removed');
      }
      await tell(a.appellant_ref, reversed ? 'appeal_reversed' : 'appeal_confirmed');
      return { status: reversed ? 'reversed' : 'confirmed' };
    });
  }
}
