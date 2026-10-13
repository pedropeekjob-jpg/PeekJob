import { readFileSync } from 'fs';
import { Pool } from 'pg';
import { importOrgs } from './import-orgs';
import { buildOrgsQuery, listTargets, OverpassClient, parseOverpass } from './osm';

/**
 * Importar organizações do OpenStreetMap.
 *   npm run import:osm -w @peekjob/api -- --city Porto
 *   npm run import:osm -w @peekjob/api -- --district Braga
 *   npm run import:osm -w @peekjob/api -- --all              (os 308 concelhos, distrito a distrito)
 *   npm run import:osm -w @peekjob/api -- --city Lagoa --district Faro   (concelhos com o mesmo nome noutra região)
 *   npm run import:osm -w @peekjob/api -- --city Porto --file resposta.json   (sem rede)
 *   --dry-run  só conta, não grava
 * Respeita a política do Overpass: um pedido de cada vez e uma pausa entre concelhos (OSM_PAUSE_MS).
 */
function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

(async () => {
  const overpass = new OverpassClient(fetch, process.env.OVERPASS_URL || undefined);
  const pause = Number(process.env.OSM_PAUSE_MS ?? 5000);
  const dry = flag('dry-run');
  const city = arg('city');
  const district = arg('district');
  const file = arg('file');

  const municipalities = await listTargets(overpass, { city, district, all: flag('all') });
  console.log(`Concelhos: ${municipalities.length}${dry ? ' (simulação, nada é gravado)' : ''}`);
  const unknown = municipalities.filter((t) => !t.district).map((t) => t.municipality);
  if (unknown.length) console.warn(`Sem distrito (indica --district): ${unknown.join(', ')}`);

  const pool = dry ? null : new Pool({ connectionString: process.env.DATABASE_URL });
  const total = { created: 0, linked: 0, skipped: 0, found: 0 };
  for (const [i, { municipality: m, district: d }] of municipalities.entries()) {
    try {
      const json = file ? JSON.parse(readFileSync(file, 'utf8')) : await overpass.run(buildOrgsQuery(m));
      const orgs = parseOverpass(json, m, d);
      total.found += orgs.length;
      const r = pool ? await importOrgs(pool, orgs) : { created: 0, linked: 0, skipped: 0 };
      total.created += r.created;
      total.linked += r.linked;
      total.skipped += r.skipped;
      console.log(`[${i + 1}/${municipalities.length}] ${m}: ${orgs.length} encontradas · ${r.created} novas · ${r.linked} juntas · ${r.skipped} já existiam`);
    } catch (e) {
      console.error(`[${i + 1}/${municipalities.length}] ${m}: falhou (${(e as Error).message}); continua no próximo`);
    }
    if (!file && i < municipalities.length - 1) await new Promise((r) => setTimeout(r, pause));
  }
  console.log(`Total: ${total.found} encontradas · ${total.created} novas · ${total.linked} juntas · ${total.skipped} já existiam`);
  await pool?.end();
})().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
