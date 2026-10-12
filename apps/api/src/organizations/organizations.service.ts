import { ConflictException, HttpException, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CRITERION_KEYS, type CreateOrganizationInput, type SearchOrganizationsQuery } from '@peekjob/shared';
import { Pool } from 'pg';
import { isUuid } from '../common/zod';
import { PG_POOL, tx } from '../db/db.module';

export const MAX_ORGS_PER_DAY = 5;

export interface OrgSummary {
  id: string;
  name: string;
  type: string;
  city: string;
  status: string;
}

export class MergedOrgRedirect {
  constructor(public readonly targetId: string) {}
}

const num = (v: unknown) => (v == null ? null : Number(v));

/** Expressão SQL com a média por critério (chaves fixas, sem input do utilizador) */
const CRITERIA_SQL = `jsonb_build_object(${CRITERION_KEYS.map((k) => `'${k}', round(avg((r.scores ->> '${k}')::numeric), 1)`).join(', ')})`;

const AGG_SELECT = `
  SELECT o.id, o.name, o.type, o.city, o.sector, o.status, o.nif_verified,
         count(r.id)::int AS reviews_count, round(avg(r.avg), 1) AS score, ${CRITERIA_SQL} AS criteria,
         count(r.id) FILTER (WHERE r.flag_kinds && ARRAY['assédio sexual', 'assédio moral'])::int AS harassment_reports
    FROM organizations o
    LEFT JOIN reviews r ON r.org_id = o.id AND r.status = 'published'`;

function toPublicOrg(row: Record<string, any>) {
  const criteria = Object.fromEntries(CRITERION_KEYS.map((k) => [k, num(row.criteria?.[k])]));
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    city: row.city,
    sector: row.sector,
    status: row.status,
    nifVerified: row.nif_verified,
    reviewsCount: row.reviews_count,
    /** nº de avaliações que descrevem possível assédio (só o número; o conteúdo da mensagem de apoio é privado) */
    harassmentReports: row.harassment_reports,
    score: num(row.score),
    criteria,
  };
}

@Injectable()
export class OrganizationsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** Pesquisa tolerante a acentos, maiúsculas e erros (pg_trgm), incluindo nomes antigos (aliases). */
  async search(q: SearchOrganizationsQuery): Promise<OrgSummary[]> {
    const { rows } = await this.pool.query(
      `WITH input AS (SELECT lower(f_unaccent($1::text)) AS q)
       SELECT o.id, o.name, o.type, o.city, o.status,
              greatest(similarity(o.search_name, input.q),
                       word_similarity(input.q, o.search_name),
                       coalesce(max(similarity(a.search_alias, input.q)), 0)) AS score
         FROM organizations o
         LEFT JOIN org_aliases a ON a.org_id = o.id
         CROSS JOIN input
        WHERE o.status IN ('active', 'pending')
          AND ($2::boolean OR o.status = 'active')
          AND ($3::org_type IS NULL OR o.type = $3::org_type)
          AND (input.q = ''
               OR o.search_name % input.q
               OR input.q <% o.search_name
               OR a.search_alias % input.q
               OR o.search_name LIKE '%' || input.q || '%')
        GROUP BY o.id, input.q
        ORDER BY score DESC, o.name
        LIMIT $4`,
      [q.q, q.includePending, q.type ?? null, q.limit],
    );
    return rows.map(({ score: _s, ...o }) => o);
  }

  async create(input: CreateOrganizationInput, creatorRef: string) {
    return tx(this.pool, async (c) => {
      if (input.nif) {
        const dup = await c.query(`SELECT id FROM organizations WHERE nif = $1 AND status <> 'merged'`, [input.nif]);
        if (dup.rowCount) throw new ConflictException({ message: 'Esta organização já existe', existingId: dup.rows[0].id });
      }
      const recent = await c.query(
        `SELECT count(*)::int AS n FROM organizations WHERE created_by = $1 AND created_at > now() - interval '1 day'`,
        [creatorRef],
      );
      if (recent.rows[0].n >= MAX_ORGS_PER_DAY) {
        throw new HttpException('Limite diário de novas organizações atingido', HttpStatus.TOO_MANY_REQUESTS);
      }
      const dups = await c.query(
        `SELECT id, name, type, city, status FROM organizations
          WHERE status IN ('active', 'pending')
            AND search_city = lower(f_unaccent($2))
            AND similarity(search_name, lower(f_unaccent($1))) > 0.45
          ORDER BY similarity(search_name, lower(f_unaccent($1))) DESC LIMIT 5`,
        [input.name, input.city],
      );
      const { rows } = await c.query(
        `INSERT INTO organizations (name, type, city, nif, status, source, created_by)
         VALUES ($1, $2, $3, $4, 'pending', 'user', $5)
         RETURNING id, name, type, city, status`,
        [input.name, input.type, input.city, input.nif ?? null, creatorRef],
      );
      if (input.address) {
        await c.query(`INSERT INTO org_locations (org_id, address, city) VALUES ($1, $2, $3)`, [rows[0].id, input.address, input.city]);
      }
      await c.query(`INSERT INTO org_sources (org_id, field, source) VALUES ($1, 'name,type,city', 'user')`, [rows[0].id]);
      return { ...rows[0], possibleDuplicates: dups.rows };
    });
  }

  /** Página pública: só organizações ativas. Fundidas redirecionam para a organização certa. */
  async getPublic(id: string) {
    if (!isUuid(id)) throw new NotFoundException();
    const { rows } = await this.pool.query(
      `SELECT id, name, type, city, sector, status, merged_into, nif_verified FROM organizations WHERE id = $1`,
      [id],
    );
    const org = rows[0];
    if (!org) throw new NotFoundException();
    if (org.status === 'merged' && org.merged_into) throw new MergedOrgRedirect(org.merged_into);
    if (org.status !== 'active') throw new NotFoundException();

    const agg = await this.pool.query(`${AGG_SELECT} WHERE o.id = $1 GROUP BY o.id`, [id]);
    const locs = await this.pool.query(
      `SELECT id, label, address, lat, lng FROM org_locations WHERE org_id = $1 AND status = 'active' ORDER BY created_at`,
      [id],
    );
    return { ...toPublicOrg(agg.rows[0]), locations: locs.rows };
  }

  /** Organizações ativas com agregados (para o início e o ranking da web). */
  async listActive(limit = 200) {
    const { rows } = await this.pool.query(
      `${AGG_SELECT} WHERE o.status = 'active' GROUP BY o.id ORDER BY reviews_count DESC, o.name LIMIT $1`,
      [limit],
    );
    return rows.map(toPublicOrg);
  }

  async approve(id: string) {
    if (!isUuid(id)) throw new NotFoundException();
    const { rows } = await this.pool.query(
      `UPDATE organizations SET status = 'active', activated_at = now()
        WHERE id = $1 AND status = 'pending' RETURNING id, name, status`,
      [id],
    );
    if (!rows[0]) throw new NotFoundException();
    return rows[0];
  }

  /**
   * Funde um duplicado (source) na organização certa (target):
   * move avaliações (se a mesma pessoa avaliou as duas, fica a mais recente),
   * guarda o nome antigo como alias e passa o NIF se o target não tiver.
   */
  async merge(sourceId: string, targetId: string) {
    if (!isUuid(sourceId) || !isUuid(targetId) || sourceId === targetId) throw new NotFoundException();
    return tx(this.pool, async (c) => {
      const { rows } = await c.query(
        `SELECT id, name, nif, status FROM organizations WHERE id = ANY($1::uuid[]) FOR UPDATE`,
        [[sourceId, targetId]],
      );
      const src = rows.find((r) => r.id === sourceId);
      const dst = rows.find((r) => r.id === targetId);
      if (!src || !dst || ['merged', 'rejected'].includes(src.status) || ['merged', 'rejected'].includes(dst.status)) {
        throw new NotFoundException();
      }
      // a mesma pessoa avaliou as duas: apaga a mais antiga
      await c.query(
        `DELETE FROM reviews r USING reviews o
          WHERE r.author_ref = o.author_ref
            AND r.org_id IN ($1, $2) AND o.org_id IN ($1, $2) AND r.org_id <> o.org_id
            AND r.created_at < o.created_at`,
        [sourceId, targetId],
      );
      await c.query(`UPDATE reviews SET org_id = $2 WHERE org_id = $1`, [sourceId, targetId]);
      await c.query(`UPDATE org_locations SET org_id = $2 WHERE org_id = $1`, [sourceId, targetId]);
      await c.query(`UPDATE org_aliases SET org_id = $2 WHERE org_id = $1 AND alias NOT IN (SELECT alias FROM org_aliases WHERE org_id = $2)`, [sourceId, targetId]);
      await c.query(`INSERT INTO org_aliases (org_id, alias) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [targetId, src.name]);
      await c.query(`UPDATE organizations SET status = 'merged', merged_into = $2, nif = NULL WHERE id = $1`, [sourceId, targetId]);
      if (src.nif && !dst.nif) await c.query(`UPDATE organizations SET nif = $2 WHERE id = $1`, [targetId, src.nif]);
      return { id: targetId, mergedFrom: sourceId };
    });
  }
}
