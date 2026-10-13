import { DISTRICTS, MUNICIPALITIES } from '@peekjob/shared';
import { importOrgs } from '../../src/import/import-orgs';
import type { ImportedOrg } from '../../src/import/osm';
import { createTestApp, insertOrg, resetDb, TestCtx } from '../helpers';

/** Distrito de cada organização: na base de dados (trigger), no importador e na API, para filtrar em todo o país */
describe('Distritos', () => {
  let t: TestCtx;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.pool.end();
    await t.app.close();
  });
  beforeEach(() => resetDb(t));

  const districtOfOrg = async (id: string) => (await t.pool.query('SELECT district FROM organizations WHERE id = $1', [id])).rows[0].district;

  it('a tabela de concelhos da base de dados é igual à lista partilhada (308)', async () => {
    const { rows } = await t.pool.query('SELECT name, district FROM municipalities');
    const db = rows.map((r) => `${r.district}|${r.name}`).sort();
    const shared = DISTRICTS.flatMap((d) => MUNICIPALITIES[d].map((m) => `${d}|${m}`)).sort();
    expect(db).toEqual(shared);
  });

  it('ao gravar, o distrito vem da cidade (sem acentos nem maiúsculas); nomes repetidos e localidades ficam sem', async () => {
    expect(await districtOfOrg(await insertOrg(t.pool, { name: 'A', city: 'Matosinhos' }))).toBe('Porto');
    expect(await districtOfOrg(await insertOrg(t.pool, { name: 'B', city: 'evora' }))).toBe('Évora');
    expect(await districtOfOrg(await insertOrg(t.pool, { name: 'C', city: 'Ponta Delgada' }))).toBe('Açores');
    expect(await districtOfOrg(await insertOrg(t.pool, { name: 'D', city: 'Lagoa' }))).toBeNull();
    expect(await districtOfOrg(await insertOrg(t.pool, { name: 'E', city: 'Leça da Palmeira' }))).toBeNull();
  });

  it('o distrito indicado prevalece; mudar a cidade volta a calcular', async () => {
    const id = (await t.pool.query(`INSERT INTO organizations (name, type, city, district, source) VALUES ('F', 'PME', 'Lagoa', 'Açores', 'seed') RETURNING id`)).rows[0].id;
    expect(await districtOfOrg(id)).toBe('Açores');
    await t.pool.query(`UPDATE organizations SET city = 'Braga' WHERE id = $1`, [id]);
    expect(await districtOfOrg(id)).toBe('Braga');
  });

  it('importador: grava o distrito da consulta e completa o de organizações já existentes sem distrito', async () => {
    const existing = await insertOrg(t.pool, { name: 'Restaurante Mar', city: 'Lagoa' });
    const imported = (name: string, id: string): ImportedOrg => ({ externalId: id, name, type: 'PME', sector: 'Restauração', city: 'Lagoa', district: 'Faro', address: null, lat: null, lng: null, nif: null });
    expect(await importOrgs(t.pool, [imported('Restaurante Mar', 'node/1'), imported('Pastelaria Sol', 'node/2')])).toEqual({ created: 1, linked: 1, skipped: 0 });
    expect(await districtOfOrg(existing)).toBe('Faro');
    const { rows } = await t.pool.query(`SELECT district FROM organizations WHERE name = 'Pastelaria Sol'`);
    expect(rows[0].district).toBe('Faro');
  });

  it('API: a organização devolve o distrito; criar com cidade ou com distrito indicado', async () => {
    const id = await insertOrg(t.pool, { name: 'Café Gaia', city: 'Vila Nova de Gaia' });
    expect((await t.http().get(`/orgs/${id}`)).body.district).toBe('Porto');

    const cookie = await t.login('ana');
    const a = await t.http().post('/orgs').set(cookie).send({ name: 'Loja Algarve', type: 'PME', city: 'Lagoa', district: 'Faro' });
    expect(a.status).toBe(201);
    expect(await districtOfOrg(a.body.id)).toBe('Faro');
    const b = await t.http().post('/orgs').set(cookie).send({ name: 'Loja Braga', type: 'PME', city: 'Braga' });
    expect(await districtOfOrg(b.body.id)).toBe('Braga');
    const bad = await t.http().post('/orgs').set(cookie).send({ name: 'Loja X', type: 'PME', city: 'Braga', district: 'Galiza' });
    expect(bad.status).toBe(400);
  });
});
