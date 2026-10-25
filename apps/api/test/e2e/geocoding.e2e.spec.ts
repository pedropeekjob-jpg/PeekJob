import { GEOCODER, type Geocoder, type GeoResult } from '../../src/geocoding/geocoder';
import { GeocodingService } from '../../src/geocoding/geocoding.service';
import { createTestApp, insertOrg, resetDb, TestCtx } from '../helpers';

/** Locais adicionados à mão ganham coordenadas em segundo plano (para entrarem no mapa real) */
describe('Geocodificação dos locais adicionados à mão', () => {
  let t: TestCtx;
  let answer: (address: string, city: string) => GeoResult = () => ({ lat: 41.1496, lng: -8.6109 });
  const asked: string[] = [];
  const geocoder: Geocoder = {
    geocode: async (address: string, city: string) => {
      asked.push(`${address} | ${city}`);
      return answer(address, city);
    },
  };
  const svc = () => t.app.get(GeocodingService);
  const loc = async (id: string) =>
    (await t.pool.query('SELECT lat, lng, geocode_attempts, geocode_source, geocode_next_at > now() AS waiting FROM org_locations WHERE org_id = $1', [id])).rows[0];
  const addOrg = async (address = 'Rua das Flores, 112') => {
    const me = await t.login('ana');
    const r = await t.http().post('/orgs').set(me).send({ name: `Tasca Nova ${Date.now() % 100000}`, type: 'Empresa', city: 'Porto', address }).expect(201);
    return r.body.id as string;
  };

  beforeAll(async () => {
    t = await createTestApp({ [GEOCODER]: geocoder });
  });
  afterAll(async () => {
    await t.pool.end();
    await t.app.close();
  });
  beforeEach(async () => {
    await resetDb(t);
    asked.length = 0;
    answer = () => ({ lat: 41.1496, lng: -8.6109 });
  });

  it('ao adicionar uma organização com morada, o local ganha coordenadas (sem atrasar a resposta)', async () => {
    const id = await addOrg();
    await svc().idle();
    expect(asked).toEqual(['Rua das Flores, 112 | Porto']);
    expect(await loc(id)).toMatchObject({ lat: 41.1496, lng: -8.6109, geocode_source: 'nominatim' });
  });

  it('morada não encontrada: tenta outra vez mais tarde (no máximo 3 vezes)', async () => {
    answer = () => null;
    const id = await addOrg('Rua Que Não Existe, 1');
    await svc().idle();
    expect(await loc(id)).toMatchObject({ lat: null, geocode_attempts: 1, waiting: true });
    await svc().runOnce();
    expect(asked).toHaveLength(1); // ainda não chegou a hora
    for (let i = 0; i < 4; i++) {
      await t.pool.query(`UPDATE org_locations SET geocode_next_at = now() - interval '1 second' WHERE org_id = $1`, [id]);
      await svc().runOnce();
    }
    expect(asked).toHaveLength(3);
    expect((await loc(id)).geocode_attempts).toBe(3);
  });

  it('serviço em baixo: não conta como tentativa, volta a tentar mais tarde', async () => {
    answer = () => 'unavailable';
    const id = await addOrg();
    await svc().idle();
    expect(await loc(id)).toMatchObject({ lat: null, geocode_attempts: 0, waiting: true });
  });

  it('só os locais sem coordenadas (os importados do OpenStreetMap já as têm)', async () => {
    const imported = await insertOrg(t.pool, { name: 'Café Vinha' });
    await t.pool.query(`INSERT INTO org_locations (org_id, address, city, lat, lng, status) VALUES ($1, 'Rua A', 'Porto', 41.1, -8.6, 'active')`, [imported]);
    await svc().runOnce();
    expect(asked).toEqual([]);
  });

  it('depois de aprovada, a organização mostra o local com coordenadas', async () => {
    const id = await addOrg();
    await svc().idle();
    const mod = await t.login('moderadora', 'moderator');
    await t.http().post(`/orgs/${id}/approve`).set(mod).expect(200);
    const org = (await t.http().get(`/orgs/${id}`).expect(200)).body;
    expect(org.locations).toEqual([expect.objectContaining({ address: 'Rua das Flores, 112', lat: 41.1496, lng: -8.6109 })]);
  });
});
