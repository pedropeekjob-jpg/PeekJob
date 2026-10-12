import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { Pool } from 'pg';
import { AuthGuard, CurrentUser, type AuthUser } from '../auth/auth.guard';
import { privacySecret, userRef } from '../common/privacy';
import { PG_POOL } from '../db/db.module';

/** As minhas avaliações (só a própria pessoa). */
@Controller('me/reviews')
@UseGuards(AuthGuard)
export class MyReviewsController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const { rows } = await this.pool.query(
      `SELECT r.id, r.org_id, o.name AS org_name, r.scores, r.avg, r.recommend, r.tags, r.text, r.flagged, r.verified, r.created_at
         FROM reviews r JOIN organizations o ON o.id = r.org_id
        WHERE r.author_ref = $1 ORDER BY r.created_at DESC`,
      [userRef(privacySecret(), user.id)],
    );
    return {
      items: rows.map((r) => ({
        id: r.id, orgId: r.org_id, orgName: r.org_name, scores: r.scores, avg: Number(r.avg), recommend: r.recommend,
        tags: r.tags, text: r.text, flagged: r.flagged, verified: r.verified, createdAt: r.created_at,
      })),
    };
  }
}
