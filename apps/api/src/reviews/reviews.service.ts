import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { detectRedFlags, findPersonalAttacks, softenText, type CreateReviewInput, type UpdateReviewInput } from '@peekjob/shared';
import { Pool } from 'pg';
import { isUuid } from '../common/zod';
import { isUniqueViolation, PG_POOL, tx } from '../db/db.module';
import { shouldActivate } from '../domain/activation';

const round1 = (v: number) => Math.round(v * 10) / 10;
const COLUMNS = 'id, scores, avg, recommend, tags, text, flagged, verified, created_at, edited_at';

/**
 * Regras de publicação (também ao editar): insultos e nomes de pessoas bloqueiam, com uma sugestão sem eles;
 * possíveis ilegalidades não bloqueiam, marcam a avaliação e geram uma mensagem privada de apoio.
 */
function screen(input: UpdateReviewInput) {
  const attack = findPersonalAttacks(input.text);
  if (attack.blocked) {
    throw new UnprocessableEntityException({
      code: 'PERSONAL_ATTACK',
      message: 'Descreve situações, sem nomes nem insultos.',
      names: attack.names,
      insults: attack.insults,
      suggestion: softenText(input.text),
      rewriteAvailable: true,
    });
  }
  const rf = detectRedFlags(input.text, input.tags);
  const values = Object.values(input.scores).filter((v): v is number => typeof v === 'number');
  return { rf, avg: round1(values.reduce((a, b) => a + b, 0) / values.length) };
}

@Injectable()
export class ReviewsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(orgId: string, input: CreateReviewInput, authorRef: string) {
    if (!isUuid(orgId)) throw new NotFoundException();

    const { rf, avg } = screen(input);

    return tx(this.pool, async (c) => {
      const org = await c.query(`SELECT id, status, nif_verified, source FROM organizations WHERE id = $1 FOR UPDATE`, [orgId]);
      if (!org.rows[0] || !['active', 'pending'].includes(org.rows[0].status)) throw new NotFoundException();

      let review;
      try {
        await c.query('SAVEPOINT ins');
        review = (
          await c.query(
            `INSERT INTO reviews (org_id, location_id, author_ref, scores, avg, recommend, tags, text, flagged, flag_kinds, verified)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                     EXISTS (SELECT 1 FROM verifications v WHERE v.org_id = $1 AND v.user_ref = $3))
             RETURNING ${COLUMNS}`,
            [orgId, input.locationId ?? null, authorRef, input.scores, avg, input.recommend, input.tags, input.text, rf.flagged, rf.kinds],
          )
        ).rows[0];
      } catch (e) {
        if (isUniqueViolation(e)) throw new ConflictException('Já avaliaste esta organização. Podes editar a tua avaliação.');
        throw e;
      }

      let supportMessage = null;
      if (rf.flagged) {
        const m = await c.query(`INSERT INTO support_messages (user_ref, review_id, kinds) VALUES ($1, $2, $3) RETURNING id, kinds`, [authorRef, review.id, rf.kinds]);
        supportMessage = m.rows[0];
      }

      let orgStatus = org.rows[0].status as 'active' | 'pending';
      if (orgStatus === 'pending') {
        const n = await c.query(`SELECT count(DISTINCT author_ref)::int AS n FROM reviews WHERE org_id = $1`, [orgId]);
        if (shouldActivate({ status: 'pending', nifVerified: org.rows[0].nif_verified, distinctReviewers: n.rows[0].n, imported: org.rows[0].source === 'import' })) {
          await c.query(`UPDATE organizations SET status = 'active', activated_at = now() WHERE id = $1`, [orgId]);
          orgStatus = 'active';
        }
      }

      return { review: toPublic(review), supportMessage, orgStatus };
    });
  }

  /** Editar a própria avaliação publicada (retificação). Retirada pela moderação: contesta-se, não se edita. */
  async update(reviewId: string, input: UpdateReviewInput, authorRef: string) {
    if (!isUuid(reviewId)) throw new NotFoundException();
    const { rf, avg } = screen(input);
    return tx(this.pool, async (c) => {
      const cur = await c.query(`SELECT status FROM reviews WHERE id = $1 AND author_ref = $2 FOR UPDATE`, [reviewId, authorRef]);
      if (!cur.rows[0]) throw new NotFoundException();
      if (cur.rows[0].status !== 'published') {
        throw new ConflictException('Esta avaliação foi retirada pela moderação. Podes contestar a decisão nas tuas mensagens.');
      }
      const review = (
        await c.query(
          `UPDATE reviews SET scores = $2, avg = $3, recommend = $4, tags = $5, text = $6, flagged = $7, flag_kinds = $8, edited_at = clock_timestamp()
            WHERE id = $1 RETURNING ${COLUMNS}`,
          [reviewId, input.scores, avg, input.recommend, input.tags, input.text, rf.flagged, rf.kinds],
        )
      ).rows[0];
      // a mensagem de apoio vai uma só vez por avaliação
      let supportMessage = null;
      if (rf.flagged) {
        const m = await c.query(
          `INSERT INTO support_messages (user_ref, review_id, kinds) SELECT $1, $2, $3
            WHERE NOT EXISTS (SELECT 1 FROM support_messages WHERE review_id = $2) RETURNING id, kinds`,
          [authorRef, reviewId, rf.kinds],
        );
        supportMessage = m.rows[0] ?? null;
      }
      return { review: toPublic(review), supportMessage };
    });
  }

  /** Apagar a própria avaliação (com o que está ligado a ela: mensagens, denúncias, "útil", resposta) */
  async remove(reviewId: string, authorRef: string) {
    if (!isUuid(reviewId)) throw new NotFoundException();
    const r = await this.pool.query(`DELETE FROM reviews WHERE id = $1 AND author_ref = $2`, [reviewId, authorRef]);
    if (!r.rowCount) throw new NotFoundException();
  }

  async listPublic(orgId: string) {
    if (!isUuid(orgId)) throw new NotFoundException();
    const { rows } = await this.pool.query(
      `SELECT r.id, r.scores, r.avg, r.recommend, r.tags, r.text, r.flagged, r.verified, r.created_at, r.edited_at,
              (SELECT count(*)::int FROM review_helpful h WHERE h.review_id = r.id) AS helpful,
              p.text AS reply_text, p.created_at AS reply_created_at, p.updated_at AS reply_updated_at
         FROM reviews r JOIN organizations o ON o.id = r.org_id
         LEFT JOIN review_replies p ON p.review_id = r.id
        WHERE r.org_id = $1 AND r.status = 'published' AND o.status = 'active'
        ORDER BY r.created_at DESC LIMIT 50`,
      [orgId],
    );
    return rows.map((r) => ({
      ...toPublic(r),
      // resposta pública da organização (de quem gere a página)
      reply: r.reply_text ? { text: r.reply_text, createdAt: r.reply_created_at, updatedAt: r.reply_updated_at } : null,
    }));
  }
}

/** Forma pública de uma avaliação: nunca inclui o pseudónimo de quem escreveu. */
function toPublic(r: Record<string, unknown>) {
  return {
    id: r.id,
    scores: r.scores,
    avg: Number(r.avg),
    recommend: r.recommend,
    tags: r.tags,
    text: r.text,
    flagged: r.flagged,
    verified: r.verified ?? false,
    helpful: (r.helpful as number | undefined) ?? 0,
    createdAt: r.created_at,
    editedAt: r.edited_at ?? null,
  };
}
