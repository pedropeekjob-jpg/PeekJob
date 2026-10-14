import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { isUuid } from '../common/zod';
import { PG_POOL } from '../db/db.module';
import { assertNoPersonalAttack } from '../contributions/contributions.service';

/** Respostas públicas das organizações às avaliações (só quem gere a página) */
@Injectable()
export class RepliesService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** A organização da avaliação, se quem pede gere a página dela */
  private async reviewOrg(reviewId: string, memberRef: string) {
    if (!isUuid(reviewId)) throw new NotFoundException();
    const { rows } = await this.pool.query(
      `SELECT r.org_id, EXISTS (SELECT 1 FROM org_members m WHERE m.org_id = r.org_id AND m.member_ref = $2) AS member
         FROM reviews r WHERE r.id = $1 AND r.status = 'published'`,
      [reviewId, memberRef],
    );
    if (!rows[0]) throw new NotFoundException();
    if (!rows[0].member) throw new ForbiddenException('Só quem gere a página da organização pode responder.');
    return rows[0].org_id as string;
  }

  async upsert(reviewId: string, memberRef: string, text: string) {
    assertNoPersonalAttack(text);
    const orgId = await this.reviewOrg(reviewId, memberRef);
    const { rows } = await this.pool.query(
      `INSERT INTO review_replies (review_id, org_id, member_ref, text) VALUES ($1, $2, $3, $4)
       ON CONFLICT (review_id) DO UPDATE SET text = EXCLUDED.text, member_ref = EXCLUDED.member_ref, updated_at = clock_timestamp()
       RETURNING text, created_at, updated_at`,
      [reviewId, orgId, memberRef, text],
    );
    return { reply: { text: rows[0].text, createdAt: rows[0].created_at, updatedAt: rows[0].updated_at } };
  }

  async remove(reviewId: string, memberRef: string) {
    await this.reviewOrg(reviewId, memberRef);
    await this.pool.query(`DELETE FROM review_replies WHERE review_id = $1`, [reviewId]);
  }
}
