import { ConflictException, HttpException, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CRITERION_KEYS, nifKind, type CreateOrganizationInput, type SearchOrganizationsQuery } from '@peekjob/shared';
import { Pool } from 'pg';
import { isUuid } from '../common/zod';
import { PG_POOL, tx } from '../db/db.module';
import { VIES, type ViesClient, type ViesResult } from './vies';

export const MAX_ORGS_PER_DAY = 5;
/** Semelhança mínima entre o nome escrito e o nome oficial para dar o NIF como confirmado */
export const VIES_NAME_MATCH = 0.5;
export const VIES_LICENSE = 'Comissão Europeia (VIES), reutilização autorizada';

/** NIF de pessoa singular ou empresário: o nome oficial é o nome de uma pessoa (dado pessoal) */
const isPersonalNif = (nif: string) => ['singular', 'empresario'].includes(nifKind(nif) ?? '');

export type NifCheck =
  | { status: 'confirmed' | 'name_mismatch'; officialName: string | null }
  | { status: 'exists' | 'not_found' | 'unavailable' };

export interface OrgSummary {
  id: string;
  name: string;
  type: string;
  city: string;
  district: string | null;
  status: string;
}

export class MergedOrgRedirect {
  constructor(public readonly targetId: string) {}
}

const num = (v: unknown) => (v == null ? null : Number(v));

/** Expressão SQL com a média por critério (chaves fixas, sem input do utilizador) */
const CRITERIA_SQL = `jsonb_build_object(${CRITERION_KEYS.map((k) => `'${k}', round(avg((r.scores ->> '${k}')::numeric), 1)`).join(', ')})`;

const AGG_SELECT = `
  SELECT o.id, o.name, o.type, o.city, o.district, o.sector, o.status, o.nif_verified,
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
    /** distrito ou região autónoma (null se a cidade não for um concelho ou for ambígua) */
    district: row.district ?? null,
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
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(VIES) private readonly vies: ViesClient,
  ) {}

  /** Consulta ao VIES para preencher o formulário. Para NIFs de pessoas só diz se existe. */
  async lookupNif(nif: string) {
    const r = await this.vies.check(nif);
    const personal = isPersonalNif(nif);
    return {
      nif,
      status: r.status,
      name: r.status === 'valid' && !personal ? r.name : null,
      address: r.status === 'valid' && !personal ? r.address : null,
      kind: nifKind(nif),
    };
  }

  /** Pesquisa tolerante a acentos, maiúsculas e erros (pg_trgm), incluindo nomes antigos (aliases). */
  async search(q: SearchOrganizationsQuery): Promise<OrgSummary[]> {
    const { rows } = await this.pool.query(
      `WITH input AS (SELECT lower(f_unaccent($1::text)) AS q)
       SELECT o.id, o.name, o.type, o.city, o.district, o.status,
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
    // Rede fora da transação: o VIES pode demorar (até 5 s) e nunca bloqueia a criação.
    const vies: ViesResult | null = input.nif ? await this.vies.check(input.nif) : null;
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
        `SELECT id, name, type, city, district, status FROM organizations
          WHERE status IN ('active', 'pending')
            AND search_city = lower(f_unaccent($2))
            AND similarity(search_name, lower(f_unaccent($1))) > 0.45
          ORDER BY similarity(search_name, lower(f_unaccent($1))) DESC LIMIT 5`,
        [input.name, input.city],
      );
      const { rows } = await c.query(
        `INSERT INTO organizations (name, type, city, district, nif, status, source, created_by)
         VALUES ($1, $2, $3, $4, $5, 'pending', 'user', $6)
         RETURNING id, name, type, city, district, status`,
        // sem distrito indicado, o trigger da base de dados tira-o da cidade (se for um concelho sem ambiguidade)
        [input.name, input.type, input.city, input.district ?? null, input.nif ?? null, creatorRef],
      );
      if (input.address) {
        await c.query(`INSERT INTO org_locations (org_id, address, city) VALUES ($1, $2, $3)`, [rows[0].id, input.address, input.city]);
      }
      await c.query(`INSERT INTO org_sources (org_id, field, source) VALUES ($1, 'name,type,city', 'user')`, [rows[0].id]);
      const nifCheck = vies && input.nif ? await this.applyVies(c, rows[0].id, input.name, input.nif, vies) : undefined;
      return { ...rows[0], possibleDuplicates: dups.rows, ...(nifCheck ? { nifCheck } : {}) };
    });
  }

  private async applyVies(c: { query: Pool['query'] }, orgId: string, name: string, nif: string, r: ViesResult): Promise<NifCheck> {
    if (r.status === 'unavailable') return { status: 'unavailable' };
    if (r.status === 'invalid') return { status: 'not_found' };
    if (isPersonalNif(nif)) return { status: 'exists' }; // nunca guardamos nem mostramos o nome da pessoa
    const official = r.name;
    let match = official == null; // sem nome público: o NIF existe mas não dá para comparar
    if (official) {
      const sim = await c.query(
        `SELECT greatest(similarity(a, b), word_similarity(a, b), word_similarity(b, a)) AS s
           FROM (SELECT lower(f_unaccent($1)) AS a, lower(f_unaccent($2)) AS b) x`,
        [name, official],
      );
      match = Number(sim.rows[0].s) >= VIES_NAME_MATCH;
    }
    if (!match || !official) return { status: 'name_mismatch', officialName: official };
    await c.query(`UPDATE organizations SET nif_verified = true WHERE id = $1`, [orgId]);
    if (official.toLowerCase() !== name.toLowerCase()) {
      await c.query(`INSERT INTO org_aliases (org_id, alias) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [orgId, official]);
    }
    await c.query(`INSERT INTO org_sources (org_id, field, source, license) VALUES ($1, 'nif,official_name', 'vies', $2)`, [orgId, VIES_LICENSE]);
    return { status: 'confirmed', officialName: official };
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
