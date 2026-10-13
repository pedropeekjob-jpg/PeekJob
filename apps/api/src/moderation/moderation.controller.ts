import { Body, Controller, Get, HttpCode, Inject, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { Pool } from 'pg';
import { z } from 'zod';
import { AuthGuard, CurrentUser, Roles, type AuthUser } from '../auth/auth.guard';
import { isUuid, parse } from '../common/zod';
import { PG_POOL } from '../db/db.module';

const RejectBody = z.object({ note: z.string().trim().min(5).max(1000) });

/** Backoffice de moderação: organizações novas e resumo das filas. As denúncias estão em reports/. */
@Controller()
@UseGuards(AuthGuard)
@Roles('moderator')
export class ModerationController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get('moderation/summary')
  async summary() {
    const { rows } = await this.pool.query(`SELECT
      (SELECT count(*) FROM reports WHERE status = 'open')::int AS open_reports,
      (SELECT count(DISTINCT review_id) FROM reports WHERE status = 'open')::int AS reviews_with_reports,
      (SELECT count(*) FROM organizations WHERE status = 'pending')::int AS pending_orgs`);
    const r = rows[0];
    return { openReports: r.open_reports, reviewsWithReports: r.reviews_with_reports, pendingOrgs: r.pending_orgs };
  }

  /** Organizações criadas por quem avalia, à espera de decisão (mais antigas primeiro) */
  @Get('moderation/orgs')
  async pendingOrgs() {
    const { rows } = await this.pool.query(
      `SELECT o.id, o.name, o.type, o.city, o.nif, o.created_at,
              (SELECT count(DISTINCT author_ref) FROM reviews r WHERE r.org_id = o.id)::int AS reviewers,
              (SELECT address FROM org_locations l WHERE l.org_id = o.id LIMIT 1) AS address,
              COALESCE((
                SELECT json_agg(json_build_object('id', d.id, 'name', d.name, 'city', d.city, 'type', d.type, 'status', d.status)
                                ORDER BY similarity(d.search_name, o.search_name) DESC)
                  FROM (SELECT * FROM organizations d
                         WHERE d.id <> o.id AND d.status IN ('active', 'pending')
                           AND d.search_city = o.search_city
                           AND similarity(d.search_name, o.search_name) > 0.4
                         ORDER BY similarity(d.search_name, o.search_name) DESC LIMIT 5) d
              ), '[]'::json) AS duplicates
         FROM organizations o
        WHERE o.status = 'pending'
        ORDER BY o.created_at ASC
        LIMIT 200`,
    );
    return {
      items: rows.map((o) => ({
        id: o.id,
        name: o.name,
        type: o.type,
        city: o.city,
        nif: o.nif,
        address: o.address,
        createdAt: o.created_at,
        reviewers: o.reviewers,
        duplicates: o.duplicates,
      })),
    };
  }

  /** Rejeitar uma organização nova (ex.: não existe ou foi criada para difamar), com justificação */
  @Post('orgs/:id/reject')
  @HttpCode(200)
  async reject(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const { note } = parse(RejectBody, body);
    if (!isUuid(id)) throw new NotFoundException();
    const { rows } = await this.pool.query(
      `UPDATE organizations SET status = 'rejected', moderation_note = $2, moderated_by = $3, moderated_at = now()
        WHERE id = $1 AND status = 'pending' RETURNING id, name, status`,
      [id, note, user.id],
    );
    if (!rows[0]) throw new NotFoundException();
    return rows[0];
  }
}
