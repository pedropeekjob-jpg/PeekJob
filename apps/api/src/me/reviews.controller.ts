import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, UseGuards } from '@nestjs/common';
import { UpdateReviewInput } from '@peekjob/shared';
import { Pool } from 'pg';
import { AuthGuard, CurrentUser, type AuthUser } from '../auth/auth.guard';
import { privacySecret, userRef } from '../common/privacy';
import { parse } from '../common/zod';
import { PG_POOL } from '../db/db.module';
import { ReviewsService } from '../reviews/reviews.service';

/** As minhas avaliações (só a própria pessoa): ver, editar e apagar sem apagar a conta. */
@Controller('me/reviews')
@UseGuards(AuthGuard)
export class MyReviewsController {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly reviews: ReviewsService,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const { rows } = await this.pool.query(
      `SELECT r.id, r.org_id, o.name AS org_name, r.scores, r.avg, r.recommend, r.tags, r.text, r.extras, r.comments, r.job, r.flagged, r.verified, r.created_at, r.edited_at
         FROM reviews r JOIN organizations o ON o.id = r.org_id
        WHERE r.author_ref = $1 ORDER BY r.created_at DESC`,
      [userRef(privacySecret(), user.id)],
    );
    return {
      items: rows.map((r) => ({
        id: r.id, orgId: r.org_id, orgName: r.org_name, scores: r.scores, avg: Number(r.avg), recommend: r.recommend,
        tags: r.tags, text: r.text, extras: r.extras, comments: r.comments, job: r.job, flagged: r.flagged, verified: r.verified, createdAt: r.created_at, editedAt: r.edited_at,
      })),
    };
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.reviews.update(id, parse(UpdateReviewInput, body), userRef(privacySecret(), user.id));
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.reviews.remove(id, userRef(privacySecret(), user.id));
  }
}
