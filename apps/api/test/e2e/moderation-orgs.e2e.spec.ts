import { createTestApp, goodReview, insertOrg, resetDb, TestCtx } from '../helpers';

/** Backoffice de moderação: organizações novas (aprovar, rejeitar, fundir) e resumo das filas. */
describe('Moderação: organizações novas e resumo', () => {
  let t: TestCtx;
  let mod: { Cookie: string };
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.pool.end();
    await t.app.close();
  });
  beforeEach(async () => {
    await resetDb(t);
    mod = await t.login('mod', 'moderator');
  });

  it('só moderadores veem a fila (401 / 403)', async () => {
    expect((await t.http().get('/moderation/orgs')).status).toBe(401);
    expect((await t.http().get('/moderation/orgs').set(await t.login('curioso'))).status).toBe(403);
    expect((await t.http().get('/moderation/summary').set(await t.login('curioso'))).status).toBe(403);
  });

  it('lista as pendentes (mais antigas primeiro) com nº de pessoas que avaliaram e possíveis duplicados', async () => {
    const active = await insertOrg(t.pool, { name: 'Padaria Ribeira', city: 'Porto' });
    const pending = await insertOrg(t.pool, { name: 'Padaria da Ribeira', city: 'Porto', status: 'pending' });
    await insertOrg(t.pool, { name: 'Oficina Nova', city: 'Braga', status: 'pending' });
    expect((await t.http().post(`/orgs/${pending}/reviews`).set(await t.login('a')).send(goodReview)).status).toBe(201);

    const res = await t.http().get('/moderation/orgs').set(mod).expect(200);
    expect(res.body.items.map((o: { name: string }) => o.name)).toEqual(['Padaria da Ribeira', 'Oficina Nova']);
    const first = res.body.items[0];
    expect(first).toMatchObject({ id: pending, city: 'Porto', type: 'PME', reviewers: 1 });
    expect(first.duplicates).toEqual([expect.objectContaining({ id: active, name: 'Padaria Ribeira', status: 'active' })]);
    expect(res.body.items[1].duplicates).toEqual([]);
  });

  it('rejeitar: exige justificação, sai da fila e não fica pública', async () => {
    const pending = await insertOrg(t.pool, { name: 'Empresa Fantasma', status: 'pending' });
    expect((await t.http().post(`/orgs/${pending}/reject`).set(mod).send({ note: '' })).status).toBe(400);
    expect((await t.http().post(`/orgs/${pending}/reject`).set(mod).send({ note: 'Não existe; criada para difamar.' })).status).toBe(200);
    const res = await t.http().get('/moderation/orgs').set(mod).expect(200);
    expect(res.body.items).toHaveLength(0);
    expect((await t.http().get(`/orgs/${pending}`)).status).toBe(404);
    const { rows } = await t.pool.query('SELECT status FROM organizations WHERE id = $1', [pending]);
    expect(rows[0].status).toBe('rejected');
  });

  it('rejeitar só funciona em pendentes (404) e só para moderadores (403)', async () => {
    const active = await insertOrg(t.pool, { name: 'Ativa' });
    expect((await t.http().post(`/orgs/${active}/reject`).set(mod).send({ note: 'Tentativa indevida.' })).status).toBe(404);
    const pending = await insertOrg(t.pool, { name: 'Pendente', status: 'pending' });
    expect((await t.http().post(`/orgs/${pending}/reject`).set(await t.login('x')).send({ note: 'Tentativa indevida.' })).status).toBe(403);
  });

  it('resumo: denúncias em aberto e organizações pendentes', async () => {
    const org = await insertOrg(t.pool, { name: 'Padaria Ribeira' });
    await insertOrg(t.pool, { name: 'Pendente', status: 'pending' });
    const r = await t.http().post(`/orgs/${org}/reviews`).set(await t.login('autora')).send(goodReview).expect(201);
    expect((await t.http().post(`/reviews/${r.body.review.id}/reports`).send({ reason: 'ofensa' })).status).toBe(201);
    const res = await t.http().get('/moderation/summary').set(mod).expect(200);
    expect(res.body).toEqual({ openReports: 1, reviewsWithReports: 1, pendingOrgs: 1 });
  });

  it('o papel vem em /auth/me (a web mostra a moderação só a moderadores)', async () => {
    const res = await t.http().get('/auth/me').set(mod).expect(200);
    expect(res.body.user.role).toBe('moderator');
  });
});
