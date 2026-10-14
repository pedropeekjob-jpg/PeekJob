import { Body, Controller, Delete, Get, HttpCode, Inject, NotFoundException, Param, Post, Put, UseGuards } from '@nestjs/common';
import { Pool } from 'pg';
import { z } from 'zod';
import { AuthGuard, CurrentUser, type AuthUser } from '../auth/auth.guard';
import { privacySecret, userRef } from '../common/privacy';
import { isUuid, parse } from '../common/zod';
import { PG_POOL } from '../db/db.module';

/** Ao entrar, as guardadas no browser juntam-se às da conta (ids de demonstração ou apagados são ignorados) */
const MergeBody = z.object({ ids: z.array(z.string().max(64)).max(200) });

/** Organizações guardadas da pessoa (mais recentes primeiro). */
@Controller('me/saved')
@UseGuards(AuthGuard)
export class SavedController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private ref = (user: AuthUser) => userRef(privacySecret(), user.id);

  private async list(ref: string) {
    const { rows } = await this.pool.query(`SELECT org_id FROM saved_orgs WHERE user_ref = $1 ORDER BY created_at DESC`, [ref]);
    return { items: rows.map((r) => r.org_id as string) };
  }

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.list(this.ref(user));
  }

  @Put(':orgId')
  @HttpCode(204)
  async save(@Param('orgId') orgId: string, @CurrentUser() user: AuthUser) {
    if (!isUuid(orgId)) throw new NotFoundException();
    const r = await this.pool.query(
      `INSERT INTO saved_orgs (user_ref, org_id) SELECT $1, id FROM organizations WHERE id = $2 ON CONFLICT DO NOTHING RETURNING org_id`,
      [this.ref(user), orgId],
    );
    if (!r.rowCount) {
      const exists = await this.pool.query(`SELECT 1 FROM organizations WHERE id = $1`, [orgId]);
      if (!exists.rowCount) throw new NotFoundException();
    }
  }

  @Delete(':orgId')
  @HttpCode(204)
  async unsave(@Param('orgId') orgId: string, @CurrentUser() user: AuthUser) {
    if (!isUuid(orgId)) return;
    await this.pool.query(`DELETE FROM saved_orgs WHERE user_ref = $1 AND org_id = $2`, [this.ref(user), orgId]);
  }

  @Post('merge')
  @HttpCode(200)
  async merge(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const ids = [...new Set(parse(MergeBody, body).ids.filter(isUuid))];
    const ref = this.ref(user);
    if (ids.length) {
      await this.pool.query(
        `INSERT INTO saved_orgs (user_ref, org_id) SELECT $1, o.id FROM organizations o WHERE o.id = ANY($2::uuid[]) ON CONFLICT DO NOTHING`,
        [ref, ids],
      );
    }
    return this.list(ref);
  }
}
