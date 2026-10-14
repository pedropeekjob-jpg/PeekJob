import { createTestApp, goodReview, insertOrg, resetDb, TestCtx } from '../helpers';

/** Organizações guardadas e "útil" nas avaliações: na conta (servidor), não só no browser. */
describe('Guardadas e útil (no servidor)', () => {
  let t: TestCtx;
  let orgA: string;
  let orgB: string;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.pool.end();
    await t.app.close();
  });
  beforeEach(async () => {
    await resetDb(t);
    orgA = await insertOrg(t.pool, { name: 'Padaria Ribeira' });
    orgB = await insertOrg(t.pool, { name: 'Café Vinha' });
  });

  describe('guardadas', () => {
    it('exigem sessão', async () => {
      expect((await t.http().get('/me/saved')).status).toBe(401);
      expect((await t.http().put(`/me/saved/${orgA}`)).status).toBe(401);
    });

    it('guardar, listar (mais recente primeiro), guardar de novo não duplica, tirar', async () => {
      const me = await t.login('ana');
      await t.http().put(`/me/saved/${orgA}`).set(me).expect(204);
      await t.http().put(`/me/saved/${orgB}`).set(me).expect(204);
      await t.http().put(`/me/saved/${orgA}`).set(me).expect(204);
      expect((await t.http().get('/me/saved').set(me).expect(200)).body.items).toEqual([orgB, orgA]);
      await t.http().delete(`/me/saved/${orgB}`).set(me).expect(204);
      expect((await t.http().get('/me/saved').set(me)).body.items).toEqual([orgA]);
    });

    it('são de cada pessoa', async () => {
      await t.http().put(`/me/saved/${orgA}`).set(await t.login('ana')).expect(204);
      expect((await t.http().get('/me/saved').set(await t.login('rui'))).body.items).toEqual([]);
    });

    it('organização que não existe ou id inválido: 404', async () => {
      const me = await t.login('ana');
      expect((await t.http().put('/me/saved/nao-e-uuid').set(me)).status).toBe(404);
      expect((await t.http().put('/me/saved/00000000-0000-4000-8000-000000000000').set(me)).status).toBe(404);
    });

    it('ao entrar, junta as guardadas no browser às da conta (ignora as que já não existem)', async () => {
      const me = await t.login('ana');
      await t.http().put(`/me/saved/${orgA}`).set(me).expect(204);
      const res = await t.http().post('/me/saved/merge').set(me).send({ ids: [orgB, orgA, '00000000-0000-4000-8000-000000000000', 'padaria-ribeira'] }).expect(200);
      expect(res.body.items.sort()).toEqual([orgA, orgB].sort());
    });

    it('merge valida o corpo (lista de até 200 ids)', async () => {
      const me = await t.login('ana');
      expect((await t.http().post('/me/saved/merge').set(me).send({ ids: 'x' })).status).toBe(400);
      expect((await t.http().post('/me/saved/merge').set(me).send({ ids: Array(201).fill(orgA) })).status).toBe(400);
    });
  });

  describe('útil', () => {
    async function review(author = 'autora') {
      const r = await t.http().post(`/orgs/${orgA}/reviews`).set(await t.login(author)).send(goodReview).expect(201);
      return r.body.review.id as string;
    }
    const count = async (id: string) => (await t.http().get(`/orgs/${orgA}/reviews`)).body.items.find((r: { id: string }) => r.id === id).helpful;

    it('a lista pública traz quantas pessoas acharam útil (sem dizer quem)', async () => {
      const id = await review();
      expect(await count(id)).toBe(0);
      await t.http().put(`/reviews/${id}/helpful`).set(await t.login('rui')).expect(204);
      await t.http().put(`/reviews/${id}/helpful`).set(await t.login('rui')).expect(204); // outra vez não soma
      await t.http().put(`/reviews/${id}/helpful`).set(await t.login('eva')).expect(204);
      expect(await count(id)).toBe(2);
      const body = JSON.stringify((await t.http().get(`/orgs/${orgA}/reviews`)).body);
      expect(body).not.toMatch(/voter|ref/i);
    });

    it('tirar o útil; a pessoa vê os que marcou', async () => {
      const id = await review();
      const rui = await t.login('rui');
      await t.http().put(`/reviews/${id}/helpful`).set(rui).expect(204);
      expect((await t.http().get('/me/helpful').set(rui).expect(200)).body.items).toEqual([id]);
      await t.http().delete(`/reviews/${id}/helpful`).set(rui).expect(204);
      expect((await t.http().get('/me/helpful').set(rui)).body.items).toEqual([]);
      expect(await count(id)).toBe(0);
    });

    it('não se pode marcar a própria avaliação', async () => {
      const id = await review('autora');
      expect((await t.http().put(`/reviews/${id}/helpful`).set(await t.login('autora'))).status).toBe(403);
    });

    it('exige sessão; avaliação escondida ou inexistente: 404', async () => {
      const id = await review();
      expect((await t.http().put(`/reviews/${id}/helpful`)).status).toBe(401);
      await t.pool.query(`UPDATE reviews SET status = 'hidden' WHERE id = $1`, [id]);
      expect((await t.http().put(`/reviews/${id}/helpful`).set(await t.login('rui'))).status).toBe(404);
      expect((await t.http().put('/reviews/nao-e-uuid/helpful').set(await t.login('rui'))).status).toBe(404);
    });
  });

  describe('RGPD', () => {
    it('exportar inclui as guardadas e os úteis; apagar a conta apaga-os', async () => {
      const id = (await t.http().post(`/orgs/${orgB}/reviews`).set(await t.login('autora')).send(goodReview).expect(201)).body.review.id;
      const me = await t.login('ana');
      await t.http().put(`/me/saved/${orgA}`).set(me).expect(204);
      await t.http().put(`/reviews/${id}/helpful`).set(me).expect(204);
      const data = JSON.parse((await t.http().get('/me/export').set(me).expect(200)).text);
      expect(data.saved).toEqual([expect.objectContaining({ orgName: 'Padaria Ribeira' })]);
      expect(data.helpful).toEqual([expect.objectContaining({ orgName: 'Café Vinha' })]);
      await t.http().delete('/me').set(me).send({}).expect(204);
      expect((await t.pool.query('SELECT count(*)::int AS n FROM saved_orgs')).rows[0].n).toBe(0);
      expect((await t.pool.query('SELECT count(*)::int AS n FROM review_helpful')).rows[0].n).toBe(0);
    });
  });
});
