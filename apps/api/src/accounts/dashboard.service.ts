import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CRITERION_KEYS } from '@peekjob/shared';
import { Pool } from 'pg';
import { isUuid } from '../common/zod';
import { PG_POOL } from '../db/db.module';
import { criteriaTrend, round1, tagTrend } from './accounts';

const DAY = 86_400_000;

/**
 * Painel de quem gere a página: a semana (novas, respondidas, por responder, variação da nota),
 * a posição na cidade, as etiquetas do mês e as avaliações por responder. Pro: tendências por critério
 * e comparação com o setor. Nunca diz quem escreveu.
 */
@Injectable()
export class DashboardService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async get(orgId: string, memberRef: string) {
    if (!isUuid(orgId)) throw new NotFoundException();
    const org = (
      await this.pool.query(
        `SELECT o.id, o.name, o.city, o.sector, o.plan, EXISTS (SELECT 1 FROM org_members m WHERE m.org_id = o.id AND m.member_ref = $2) AS member
           FROM organizations o WHERE o.id = $1 AND o.status = 'active'`,
        [orgId, memberRef],
      )
    ).rows[0];
    if (!org) throw new NotFoundException();
    if (!org.member) throw new ForbiddenException('Só quem gere a página da organização vê o painel.');

    const now = Date.now();
    const weekAgo = new Date(now - 7 * DAY);
    const monthAgo = new Date(now - 30 * DAY);
    const twoMonthsAgo = new Date(now - 60 * DAY);

    const reviews = (
      await this.pool.query(
        `SELECT r.id, r.scores, r.avg, r.tags, r.text, r.created_at, (p.review_id IS NOT NULL) AS answered
           FROM reviews r LEFT JOIN review_replies p ON p.review_id = r.id
          WHERE r.org_id = $1 AND r.status = 'published' ORDER BY r.created_at DESC`,
        [orgId],
      )
    ).rows as { id: string; scores: Record<string, number>; avg: string; tags: string[]; text: string; created_at: Date; answered: boolean }[];
    const answeredThisWeek = (await this.pool.query(`SELECT count(*)::int AS n FROM review_replies WHERE org_id = $1 AND created_at >= $2`, [orgId, weekAgo])).rows[0].n;

    const avg = (rows: typeof reviews) => (rows.length ? rows.reduce((a, r) => a + Number(r.avg), 0) / rows.length : null);
    const all = avg(reviews);
    const older = avg(reviews.filter((r) => r.created_at < weekAgo));
    const newReviews = reviews.filter((r) => r.created_at >= weekAgo).length;

    const rank = (
      await this.pool.query(
        `SELECT position, total FROM (
           SELECT o.id, rank() OVER (ORDER BY avg(r.avg) DESC)::int AS position, count(*) OVER ()::int AS total
             FROM organizations o JOIN reviews r ON r.org_id = o.id AND r.status = 'published'
            WHERE o.status = 'active' AND lower(o.city) = lower($2)
            GROUP BY o.id) x
          WHERE x.id = $1`,
        [orgId, org.city],
      )
    ).rows[0];

    const tags = tagTrend(
      reviews.filter((r) => r.created_at >= monthAgo).map((r) => r.tags),
      reviews.filter((r) => r.created_at < monthAgo && r.created_at >= twoMonthsAgo).map((r) => r.tags),
    );

    return {
      org: { id: org.id, name: org.name, city: org.city, plan: org.plan },
      week: {
        newReviews,
        answered: answeredThisWeek,
        unanswered: reviews.filter((r) => !r.answered).length,
        // variação da nota esta semana (0 sem avaliações novas ou sem nota antes)
        scoreDelta: all != null && older != null && newReviews ? round1(all - older) : 0,
      },
      rank: rank ? { position: rank.position, total: rank.total, city: org.city } : null,
      tags,
      pending: reviews
        .filter((r) => !r.answered)
        .slice(0, 20)
        .map((r) => ({ id: r.id, avg: Number(r.avg), scores: r.scores, tags: r.tags, text: r.text, createdAt: r.created_at })),
      pro: org.plan === 'pro' ? await this.pro(org, reviews, monthAgo) : null,
    };
  }

  /** Só no Pro: tendências por critério (face a há 30 dias) e a média do setor */
  private async pro(org: { id: string; sector: string | null }, reviews: { scores: Record<string, number>; created_at: Date }[], since: Date) {
    const criteria = criteriaTrend(
      reviews.map((r) => ({ scores: r.scores, createdAt: r.created_at })),
      CRITERION_KEYS,
      since,
    );
    const peers = org.sector
      ? (
          await this.pool.query(
            `SELECT count(*)::int AS count, round(avg(score), 1) AS score FROM (
               SELECT avg(r.avg) AS score FROM organizations o JOIN reviews r ON r.org_id = o.id AND r.status = 'published'
                WHERE o.status = 'active' AND o.sector = $1 AND o.id <> $2 GROUP BY o.id) x`,
            [org.sector, org.id],
          )
        ).rows[0]
      : null;
    return {
      criteria,
      peers: peers?.count ? { sector: org.sector, count: peers.count, score: Number(peers.score) } : null,
    };
  }
}
