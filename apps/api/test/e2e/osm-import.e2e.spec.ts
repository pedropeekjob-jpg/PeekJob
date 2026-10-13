import { readFileSync } from 'fs';
import { join } from 'path';
import { OSM_LICENSE, importOrgs } from '../../src/import/import-orgs';
import { parseOverpass } from '../../src/import/osm';
import { createTestApp, goodReview, insertOrg, resetDb, TestCtx } from '../helpers';

/**
 * Importar organizações do OpenStreetMap (qualquer concelho do país).
 * Ficam disponíveis para avaliar (pesquisa do fluxo de avaliar) e aparecem em público com a primeira avaliação.
 */
describe('Importação do OpenStreetMap', () => {
  let t: TestCtx;
  const fixture = JSON.parse(readFileSync(join(__dirname, '..', 'fixtures', 'overpass-porto.json'), 'utf8'));
  const orgs = parseOverpass(fixture, 'Porto');

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.pool.end();
    await t.app.close();
  });
  beforeEach(() => resetDb(t));

  it('cria as organizações por avaliar, com local, coordenadas e proveniência (licença ODbL)', async () => {
    const r = await importOrgs(t.pool, orgs);
    expect(r).toEqual({ created: 7, linked: 0, skipped: 0 });
    const { rows } = await t.pool.query(`SELECT name, type, city, sector, status, source FROM organizations WHERE name = 'Padaria Ribeira'`);
    expect(rows[0]).toEqual({ name: 'Padaria Ribeira', type: 'PME', city: 'Porto', sector: 'Comércio', status: 'pending', source: 'import' });
    const loc = await t.pool.query(`SELECT l.address, l.lat, l.lng, l.status FROM org_locations l JOIN organizations o ON o.id = l.org_id WHERE o.name = 'Padaria Ribeira'`);
    expect(loc.rows[0]).toEqual({ address: 'Rua de Cima 12, 4050-123 Porto', lat: 41.1496, lng: -8.6109, status: 'active' });
    const src = await t.pool.query(`SELECT s.source, s.license, s.external_id FROM org_sources s JOIN organizations o ON o.id = s.org_id WHERE o.name = 'Padaria Ribeira'`);
    expect(src.rows).toEqual([{ source: 'osm', license: OSM_LICENSE, external_id: 'node/101' }]);
  });

  it('o NIF do OpenStreetMap fica guardado mas não verificado', async () => {
    await importOrgs(t.pool, orgs);
    const { rows } = await t.pool.query(`SELECT nif, nif_verified FROM organizations WHERE name = 'Oficina Sete'`);
    expect(rows[0]).toEqual({ nif: '513000003', nif_verified: false });
  });

  it('é idempotente: correr outra vez não duplica', async () => {
    await importOrgs(t.pool, orgs);
    expect(await importOrgs(t.pool, orgs)).toEqual({ created: 0, linked: 0, skipped: 7 });
    const { rows } = await t.pool.query('SELECT count(*)::int AS n FROM organizations');
    expect(rows[0].n).toBe(7);
  });

  it('junta a organizações que já existem (mesmo NIF, ou nome parecido na mesma cidade) em vez de duplicar', async () => {
    const padaria = await insertOrg(t.pool, { name: 'Padaria da Ribeira', city: 'Porto' });
    const oficina = await insertOrg(t.pool, { name: 'Carpintaria O7', city: 'Porto', nif: '513000003' });
    await insertOrg(t.pool, { name: 'Café Majestic', city: 'Lisboa' }); // outra cidade: é outra organização
    const r = await importOrgs(t.pool, orgs);
    expect(r).toEqual({ created: 5, linked: 2, skipped: 0 });
    const locs = await t.pool.query('SELECT org_id, address FROM org_locations WHERE org_id = ANY($1::uuid[]) ORDER BY org_id', [[padaria, oficina]]);
    expect(locs.rowCount).toBe(2);
    const majestic = await t.pool.query(`SELECT city FROM organizations WHERE name = 'Café Majestic' ORDER BY city`);
    expect(majestic.rows.map((x) => x.city)).toEqual(['Lisboa', 'Porto']);
  });

  it('aparecem na pesquisa de avaliar (não na pública) e a primeira avaliação torna-as públicas', async () => {
    await importOrgs(t.pool, orgs);
    const pub = await t.http().get('/orgs/search').query({ q: 'padaria ribeira' }).expect(200);
    expect(pub.body.items).toHaveLength(0);
    const flow = await t.http().get('/orgs/search').query({ q: 'padaria ribeira', includePending: 'true' }).expect(200);
    const id = flow.body.items[0].id;
    const r = await t.http().post(`/orgs/${id}/reviews`).set(await t.login('ana')).send(goodReview).expect(201);
    expect(r.body.orgStatus).toBe('active');
  });

  it('não enchem a fila de moderação (só entram lá as criadas por pessoas)', async () => {
    await importOrgs(t.pool, orgs);
    expect((await t.http().post('/orgs').set(await t.login('ana')).send({ name: 'Grupo Coral', type: 'Associação', city: 'Porto' })).status).toBe(201);
    const mod = await t.login('mod', 'moderator');
    const q = await t.http().get('/moderation/orgs').set(mod).expect(200);
    expect(q.body.items.map((o: { name: string }) => o.name)).toEqual(['Grupo Coral']);
    const s = await t.http().get('/moderation/summary').set(mod).expect(200);
    expect(s.body.pendingOrgs).toBe(1);
  });
});
