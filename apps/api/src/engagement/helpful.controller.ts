import { Controller, Delete, ForbiddenException, Get, HttpCode, Inject, NotFoundException, Param, Put, UseGuards } from '@nestjs/common';
import { Pool } from 'pg';
import { AuthGuard, CurrentUser, type AuthUser } from '../auth/auth.guard';
import { privacySecret, userRef } from '../common/privacy';
import { isUuid } from '../common/zod';
import { PG_POOL } from '../db/db.module';

/** "Útil" numa avaliação: uma vez por pessoa, nunca na própria. A lista pública só mostra a contagem. */
@Controller()
@UseGuards(AuthGuard)
export class HelpfulController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private ref = (user: AuthUser) => userRef(privacySecret(), user.id);

  @Get('me/helpful')
  async mine(@CurrentUser() user: AuthUser) {
    const { rows } = await this.pool.query(`SELECT review_id FROM review_helpful WHERE voter_ref = $1 ORDER BY created_at DESC`, [this.ref(user)]);
    return { items: rows.map((r) => r.review_id as string) };
  }

  @Put('reviews/:id/helpful')
  @HttpCode(204)
  async mark(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    if (!isUuid(id)) throw new NotFoundException();
    const ref = this.ref(user);
    const { rows } = await this.pool.query(
      `SELECT r.author_ref FROM reviews r JOIN organizations o ON o.id = r.org_id WHERE r.id = $1 AND r.status = 'published' AND o.status = 'active'`,
      [id],
    );
    if (!rows[0]) throw new NotFoundException();
    if (rows[0].author_ref === ref) throw new ForbiddenException({ message: 'Não podes marcar a tua própria avaliação como útil.' });
    await this.pool.query(`INSERT INTO review_helpful (review_id, voter_ref) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [id, ref]);
  }

  @Delete('reviews/:id/helpful')
  @HttpCode(204)
  async unmark(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    if (!isUuid(id)) return;
    await this.pool.query(`DELETE FROM review_helpful WHERE review_id = $1 AND voter_ref = $2`, [id, this.ref(user)]);
  }
}
