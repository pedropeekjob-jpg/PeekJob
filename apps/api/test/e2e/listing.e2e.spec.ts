import { createTestApp, goodReview, insertOrg, resetDb, TestCtx } from '../helpers';

describe('Listas para a web', () => {
  let t: TestCtx;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.pool.end();
    await t.app.close();
  });
  beforeEach(() => resetDb(t));

  it('GET /orgs lista as organizações ativas com nota, nº de avaliações e médias por critério', async () => {
    const a = await insertOrg(t.pool, { name: 'Padaria Ribeira' });
    await insertOrg(t.pool, { name: 'Oficina Sete' });
    await insertOrg(t.pool, { name: 'Pendente', status: 'pending' });
    expect((await t.http().post(`/orgs/${a}/reviews`).set(await t.login('u1')).send(goodReview)).status).toBe(201);

    const res = await t.http().get('/orgs').expect(200);
    expect(res.body.items.map((o: { name: string }) => o.name)).toEqual(['Padaria Ribeira', 'Oficina Sete']);
    expect(res.body.items[0]).toMatchObject({ reviewsCount: 1, score: 4.3, criteria: { respeito: 5, salario: 4 } });
    expect(res.body.items[1]).toMatchObject({ reviewsCount: 0, score: null });
  });

  it('GET /orgs/:id inclui os locais ativos com coordenadas', async () => {
    const id = await insertOrg(t.pool, { name: 'Padaria Ribeira' });
    await t.pool.query(
      `INSERT INTO org_locations (org_id, label, address, city, lat, lng, status) VALUES
       ($1, 'Loja', 'Rua das Flores, 112, Porto', 'Porto', 41.1437, -8.6129, 'active'),
       ($1, 'Proposto', 'Rua X', 'Porto', null, null, 'pending')`,
      [id],
    );
    const res = await t.http().get(`/orgs/${id}`).expect(200);
    expect(res.body.locations).toEqual([
      { id: expect.any(String), label: 'Loja', address: 'Rua das Flores, 112, Porto', lat: 41.1437, lng: -8.6129 },
    ]);
  });

  it('GET /me/reviews devolve só as minhas avaliações, com o nome da organização', async () => {
    const a = await insertOrg(t.pool, { name: 'Padaria Ribeira' });
    const b = await insertOrg(t.pool, { name: 'Oficina Sete' });
    expect((await t.http().post(`/orgs/${a}/reviews`).set(await t.login('u1')).send(goodReview)).status).toBe(201);
    expect((await t.http().post(`/orgs/${b}/reviews`).set(await t.login('u2')).send(goodReview)).status).toBe(201);
    const res = await t.http().get('/me/reviews').set(await t.login('u1')).expect(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({ orgId: a, orgName: 'Padaria Ribeira', avg: 4.3, flagged: false });
    expect((await t.http().get('/me/reviews')).status).toBe(401);
  });
});
