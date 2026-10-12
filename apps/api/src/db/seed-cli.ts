import { readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

/**
 * Carrega organizações de demonstração (dados fictícios, os mesmos do POC).
 * Para o lançamento: substituir por um seed curado da cidade e setores escolhidos,
 * registando a origem e a licença de cada dado em org_sources.
 */
interface SeedOrg {
  name: string;
  type: string;
  city: string;
  sector?: string;
  aliases?: string[];
  locations?: { label?: string; address: string; lat?: number; lng?: number }[];
}

(async () => {
  const data: SeedOrg[] = JSON.parse(readFileSync(join(__dirname, '..', '..', 'seed', 'organizations.json'), 'utf8'));
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  let n = 0;
  for (const o of data) {
    const exists = await db.query('SELECT 1 FROM organizations WHERE name = $1 AND city = $2', [o.name, o.city]);
    if (exists.rowCount) continue;
    const { rows } = await db.query(
      `INSERT INTO organizations (name, type, city, sector, status, source, activated_at)
       VALUES ($1, $2, $3, $4, 'active', 'seed', now()) RETURNING id`,
      [o.name, o.type, o.city, o.sector ?? null],
    );
    const id = rows[0].id;
    for (const a of o.aliases ?? []) await db.query('INSERT INTO org_aliases (org_id, alias) VALUES ($1, $2)', [id, a]);
    for (const l of o.locations ?? []) {
      await db.query(
        `INSERT INTO org_locations (org_id, label, address, city, lat, lng, status) VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
        [id, l.label ?? null, l.address, o.city, l.lat ?? null, l.lng ?? null],
      );
    }
    await db.query(`INSERT INTO org_sources (org_id, field, source, license) VALUES ($1, '*', 'demo', 'dados fictícios')`, [id]);
    n++;
  }
  console.log(`Seed: ${n} organizações novas.`);
  await db.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
