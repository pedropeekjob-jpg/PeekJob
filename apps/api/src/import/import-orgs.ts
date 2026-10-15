import type { Pool } from 'pg';
import type { ImportedOrg } from './osm';

export const OSM_LICENSE = 'ODbL 1.0 · © contribuidores do OpenStreetMap';
/** Semelhança mínima do nome (na mesma cidade) para considerar que é a mesma organização */
export const SAME_ORG_SIMILARITY = 0.6;

export interface ImportResult {
  created: number;
  linked: number;
  skipped: number;
}

/** Organizações por lote: um pedido à base de dados por lote (cabe folgado no limite de parâmetros) */
export const IMPORT_BATCH_SIZE = 500;

/**
 * Grava organizações importadas, em lotes (função import_orgs_batch, migração 014). Idempotente
 * (identificador externo em org_sources). Cada lote é uma transação.
 * - já importada → ignora
 * - mesmo NIF ou nome muito parecido na mesma cidade → junta (acrescenta o local e a proveniência)
 * - senão cria, por avaliar (status pending, source import): aparece em público com a primeira avaliação
 */
export async function importOrgs(
  db: Pick<Pool, 'query'>,
  orgs: ImportedOrg[],
  source = 'osm',
  license = OSM_LICENSE,
  batchSize = IMPORT_BATCH_SIZE,
): Promise<ImportResult> {
  const total: ImportResult = { created: 0, linked: 0, skipped: 0 };
  for (let i = 0; i < orgs.length; i += batchSize) {
    const batch = orgs.slice(i, i + batchSize);
    const { rows } = await db.query<{ r: ImportResult }>('SELECT import_orgs_batch($1::jsonb, $2, $3, $4) AS r', [
      JSON.stringify(batch),
      source,
      license,
      SAME_ORG_SIMILARITY,
    ]);
    total.created += rows[0].r.created;
    total.linked += rows[0].r.linked;
    total.skipped += rows[0].r.skipped;
  }
  return total;
}
