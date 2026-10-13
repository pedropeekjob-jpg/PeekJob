import type { Pool, PoolClient } from 'pg';
import type { ImportedOrg } from './osm';

export const OSM_LICENSE = 'ODbL 1.0 · © contribuidores do OpenStreetMap';
/** Semelhança mínima do nome (na mesma cidade) para considerar que é a mesma organização */
export const SAME_ORG_SIMILARITY = 0.6;

export interface ImportResult {
  created: number;
  linked: number;
  skipped: number;
}

/**
 * Grava organizações importadas. Idempotente (identificador externo em org_sources).
 * - já importada → ignora
 * - mesmo NIF ou nome muito parecido na mesma cidade → junta (acrescenta o local e a proveniência)
 * - senão cria, por avaliar (status pending, source import): aparece em público com a primeira avaliação
 */
export async function importOrgs(pool: Pool, orgs: ImportedOrg[], source = 'osm', license = OSM_LICENSE): Promise<ImportResult> {
  const r: ImportResult = { created: 0, linked: 0, skipped: 0 };
  for (const o of orgs) {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      const outcome = await importOne(c, o, source, license);
      await c.query('COMMIT');
      r[outcome]++;
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      c.release();
    }
  }
  return r;
}

async function importOne(c: PoolClient, o: ImportedOrg, source: string, license: string): Promise<keyof ImportResult> {
  const known = await c.query('SELECT 1 FROM org_sources WHERE source = $1 AND external_id = $2', [source, o.externalId]);
  if (known.rowCount) return 'skipped';

  let target: string | null = null;
  if (o.nif) {
    const byNif = await c.query(`SELECT id FROM organizations WHERE nif = $1 AND status IN ('active', 'pending')`, [o.nif]);
    target = byNif.rows[0]?.id ?? null;
  }
  if (!target) {
    const byName = await c.query(
      `SELECT id FROM organizations
        WHERE status IN ('active', 'pending') AND search_city = lower(f_unaccent($2))
          AND similarity(search_name, lower(f_unaccent($1))) >= $3
        ORDER BY similarity(search_name, lower(f_unaccent($1))) DESC LIMIT 1`,
      [o.name, o.city, SAME_ORG_SIMILARITY],
    );
    target = byName.rows[0]?.id ?? null;
  }

  let outcome: keyof ImportResult = 'linked';
  if (!target) {
    const nifFree = o.nif ? !(await c.query('SELECT 1 FROM organizations WHERE nif = $1', [o.nif])).rowCount : false;
    const ins = await c.query(
      `INSERT INTO organizations (name, type, city, sector, nif, status, source)
       VALUES ($1, $2, $3, $4, $5, 'pending', 'import') RETURNING id`,
      [o.name, o.type, o.city, o.sector, nifFree ? o.nif : null],
    );
    target = ins.rows[0].id as string;
    outcome = 'created';
  }
  if (o.address || o.lat != null) {
    await c.query(`INSERT INTO org_locations (org_id, address, city, lat, lng, status) VALUES ($1, $2, $3, $4, $5, 'active')`, [
      target,
      o.address ?? o.city,
      o.city,
      o.lat,
      o.lng,
    ]);
  }
  await c.query(`INSERT INTO org_sources (org_id, field, source, license, external_id) VALUES ($1, 'name,type,sector,location', $2, $3, $4)`, [
    target,
    source,
    license,
    o.externalId,
  ]);
  return outcome;
}
