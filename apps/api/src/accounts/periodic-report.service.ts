import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { buildReport, CRITERION_KEYS, type ReportPeers, type ReportPeriod } from '@peekjob/shared';
import { Pool } from 'pg';
import { isUuid } from '../common/zod';
import { PG_POOL } from '../db/db.module';

/** Média por critério das comparáveis (chaves fixas, sem input do utilizador) */
const PEER_CRITERIA_SQL = `jsonb_build_object(${CRITERION_KEYS.map((k) => `'${k}', round(avg((r.scores ->> '${k}')::numeric), 1)`).join(', ')})`;

/**
 * Relatório semanal ou mensal (21/10), só para quem gere a página e tem o plano Pro: resultados, comparação com
 * organizações do mesmo setor (ou da mesma cidade), pontos fortes, o que melhorar e a relação entre os níveis de
 * satisfação. As contas são as de `buildReport` (partilhadas com a demonstração). Nunca diz quem escreveu.
 */
@Injectable()
export class PeriodicReportService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async get(orgId: string, memberRef: string, period: ReportPeriod, now = new Date()) {
    if (!isUuid(orgId)) throw new NotFoundException();
    const org = (
      await this.pool.query(
        `SELECT o.id, o.name, o.city, o.sector, o.plan, EXISTS (SELECT 1 FROM org_members m WHERE m.org_id = o.id AND m.member_ref = $2) AS member
           FROM organizations o WHERE o.id = $1 AND o.status = 'active'`,
        [orgId, memberRef],
      )
    ).rows[0];
    if (!org) throw new NotFoundException();
    if (!org.member) throw new ForbiddenException('Só quem gere a página da organização vê o relatório.');
    if (org.plan !== 'pro') throw new ForbiddenException({ code: 'PRO_REQUIRED', message: 'Os relatórios semanais e mensais fazem parte do plano Pro.' });

    const reviews = (
      await this.pool.query(
        `SELECT scores, avg, recommend, created_at FROM reviews WHERE org_id = $1 AND status = 'published' AND created_at <= $2 ORDER BY created_at`,
        [orgId, now],
      )
    ).rows.map((r) => ({ scores: r.scores, avg: Number(r.avg), recommend: r.recommend, createdAt: r.created_at as Date }));

    const report = buildReport(period, now, reviews, await this.peers(org));
    return { org: { id: org.id, name: org.name, city: org.city, sector: org.sector }, ...report };
  }

  /** Comparáveis: o mesmo setor; sem setor (ou sem outras no setor), a mesma cidade */
  private async peers(org: { id: string; sector: string | null; city: string }): Promise<ReportPeers | null> {
    const run = async (basis: 'sector' | 'city', label: string, where: string) => {
      const row = (
        await this.pool.query(
          `SELECT count(DISTINCT o.id)::int AS orgs, round(avg(r.avg), 1) AS score, ${PEER_CRITERIA_SQL} AS criteria
             FROM organizations o JOIN reviews r ON r.org_id = o.id AND r.status = 'published'
            WHERE o.status = 'active' AND o.id <> $1 AND ${where}`,
          [org.id, label],
        )
      ).rows[0];
      if (!row?.orgs) return null;
      const criteria = Object.fromEntries(CRITERION_KEYS.map((k) => [k, row.criteria?.[k] == null ? null : Number(row.criteria[k])]));
      return { basis, label, orgs: row.orgs, score: row.score == null ? null : Number(row.score), criteria };
    };
    return (
      (org.sector ? await run('sector', org.sector, 'o.sector = $2') : null) ?? (await run('city', org.city, 'lower(o.city) = lower($2)'))
    );
  }
}
