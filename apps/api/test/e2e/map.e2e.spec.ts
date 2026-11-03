import { createTestApp, goodReview, insertOrg, resetDb, TestCtx } from '../helpers';

/**
 * Mapa das organizações já avaliadas (pedido de 03/11): pinos para ajudar quem vai avaliar a encontrar
 * o local de trabalho. Só coordenadas que já temos (sem geocodificar no pedido) e nada que aponte para uma pessoa.
 */
describe('GET /orgs/map', () => {
  let t: TestCtx;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.pool.end();
    await t.app.close();
  });
  beforeEach(() => resetDb(t));

  const place = (orgId: string, label: string, lat: number | null, lng: number | null, status = 'active') =>
    t.pool.query(`INSERT INTO org_locations (org_id, label, address, city, lat, lng, status) VALUES ($1, $2, $3, 'Porto', $4, $5, $6) RETURNING id`, [
      orgId,
      label,
      `${label}, Porto`,
      lat,
      lng,
      status,
    ]);
  const review = async (orgId: string, who: string) => expect((await t.http().post(`/orgs/${orgId}/reviews`).set(await t.login(who)).send(goodReview)).status).toBe(201);

  it('só organizações ativas com avaliações publicadas, com a nota e os locais com coordenadas', async () => {
    const a = await insertOrg(t.pool, { name: 'Padaria Ribeira' });
    await place(a, 'Loja', 41.1437, -8.6129);
    await place(a, 'Sem coordenadas', null, null);
    await place(a, 'Proposto', 41.15, -8.6, 'pending');
    await review(a, 'u1');
    const semAvaliacoes = await insertOrg(t.pool, { name: 'Oficina Sete' });
    await place(semAvaliacoes, 'Oficina', 41.16, -8.62);
    const pendente = await insertOrg(t.pool, { name: 'Pendente', status: 'pending' });
    await place(pendente, 'Sede', 41.17, -8.63);

    const res = await t.http().get('/orgs/map').expect(200);
    expect(res.body.items).toEqual([
      {
        id: a,
        name: 'Padaria Ribeira',
        type: 'Empresa',
        city: 'Porto',
        status: 'active',
        reviewsCount: 1,
        score: 4.3,
        locations: [{ id: expect.any(String), label: 'Loja', address: 'Loja, Porto', lat: 41.1437, lng: -8.6129 }],
      },
    ]);
  });

  it('nome individual fica de fora (a morada pode ser a casa de alguém)', async () => {
    const pessoa = await insertOrg(t.pool, { name: 'Joana Silva', type: 'Nome individual' });
    await place(pessoa, 'Atelier', 41.15, -8.61);
    await review(pessoa, 'u1');
    expect((await t.http().get('/orgs/map').expect(200)).body.items).toEqual([]);
  });

  it('mostra todos os locais da organização, não só os avaliados, e nunca contagens por local', async () => {
    const a = await insertOrg(t.pool, { name: 'Cafés do Norte' });
    const loja = (await place(a, 'Loja A', 41.14, -8.61)).rows[0].id;
    await place(a, 'Loja B', 41.18, -8.65);
    await review(a, 'u1');
    await t.pool.query(`UPDATE reviews SET location_id = $1`, [loja]); // a avaliação é da Loja A

    const [org] = (await t.http().get('/orgs/map').expect(200)).body.items;
    expect(org.locations.map((l: { label: string }) => l.label)).toEqual(['Loja A', 'Loja B']);
    for (const l of org.locations) expect(Object.keys(l).sort()).toEqual(['address', 'id', 'label', 'lat', 'lng']);
  });

  it('pode ficar em cache um pouco (é igual para toda a gente)', async () => {
    const res = await t.http().get('/orgs/map').expect(200);
    expect(res.headers['cache-control']).toBe('public, max-age=300');
  });
});

describe('Pesquisa pela morada (para quem procura o local de trabalho)', () => {
  let t: TestCtx;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.pool.end();
    await t.app.close();
  });
  beforeEach(() => resetDb(t));

  it('encontra a organização pela morada de um local ativo (4+ letras, sem acentos)', async () => {
    const a = await insertOrg(t.pool, { name: 'Padaria Ribeira' });
    await t.pool.query(`INSERT INTO org_locations (org_id, label, address, status) VALUES ($1, 'Fabrico', 'Rua do Freixo, 40, Porto', 'active')`, [a]);
    const b = await insertOrg(t.pool, { name: 'Oficina Sete' });
    await t.pool.query(`INSERT INTO org_locations (org_id, label, address, status) VALUES ($1, 'Proposto', 'Rua do Freixo, 99, Porto', 'pending')`, [b]);
    const names = async (q: string) => (await t.http().get('/orgs/search').query({ q }).expect(200)).body.items.map((o: { name: string }) => o.name);
    expect(await names('rua do freixo')).toEqual(['Padaria Ribeira']);
    expect(await names('FREIXÓ')).toEqual(['Padaria Ribeira']);
    expect(await names('fre')).toEqual([]);
  });
});
