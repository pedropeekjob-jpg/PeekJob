import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { detectRedFlags, findPersonalAttacks, softenText, type CreateReviewInput } from '@peekjob/shared';
import { Pool } from 'pg';
import { isUuid } from '../common/zod';
import { isUniqueViolation, PG_POOL, tx } from '../db/db.module';
import { shouldActivate } from '../domain/activation';

const round1 = (v: number) => Math.round(v * 10) / 10;

@Injectable()
export class ReviewsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(orgId: string, input: CreateReviewInput, authorRef: string) {
    if (!isUuid(orgId)) throw new NotFoundException();

    // 1. Insultos e nomes de pessoas bloqueiam; devolvemos uma sugestão sem eles.
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

    // 2. Possíveis ilegalidades não bloqueiam: marcam a avaliação e geram mensagem privada de apoio.
    const rf = detectRedFlags(input.text, input.tags);
    const values = Object.values(input.scores).filter((v): v is number => typeof v === 'number');
    const avg = round1(values.reduce((a, b) => a + b, 0) / values.length);

    return tx(this.pool, async (c) => {
      const org = await c.query(`SELECT id, status, nif_verified FROM organizations WHERE id = $1 FOR UPDATE`, [orgId]);
      if (!org.rows[0] || !['active', 'pending'].includes(org.rows[0].status)) throw new NotFoundException();

      let review;
      try {
        await c.query('SAVEPOINT ins');
        review = (
          await c.query(
            `INSERT INTO reviews (org_id, location_id, author_ref, scores, avg, recommend, tags, text, flagged, flag_kinds, verified)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                     EXISTS (SELECT 1 FROM verifications v WHERE v.org_id = $1 AND v.user_ref = $3))
             RETURNING id, scores, avg, recommend, tags, text, flagged, verified, created_at`,
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
        if (shouldActivate({ status: 'pending', nifVerified: org.rows[0].nif_verified, distinctReviewers: n.rows[0].n })) {
          await c.query(`UPDATE organizations SET status = 'active', activated_at = now() WHERE id = $1`, [orgId]);
          orgStatus = 'active';
        }
      }

      return { review: toPublic(review), supportMessage, orgStatus };
    });
  }

  async listPublic(orgId: string) {
    if (!isUuid(orgId)) throw new NotFoundException();
    const { rows } = await this.pool.query(
      `SELECT r.id, r.scores, r.avg, r.recommend, r.tags, r.text, r.flagged, r.verified, r.created_at
         FROM reviews r JOIN organizations o ON o.id = r.org_id
        WHERE r.org_id = $1 AND r.status = 'published' AND o.status = 'active'
        ORDER BY r.created_at DESC LIMIT 50`,
      [orgId],
    );
    return rows.map(toPublic);
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
    createdAt: r.created_at,
  };
}
