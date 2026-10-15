import { createTestApp, goodReview, insertOrg, resetDb, TestCtx } from '../helpers';

/** RGPD (retificação e apagamento): editar ou apagar uma avaliação publicada sem apagar a conta */
describe('Editar e apagar a minha avaliação', () => {
  let t: TestCtx;
  let orgId: string;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.pool.end();
    await t.app.close();
  });
  beforeEach(async () => {
    await resetDb(t);
    orgId = await insertOrg(t.pool, { name: 'Padaria Ribeira' });
  });

  async function publish(name = 'ana', review: object = goodReview) {
    const me = await t.login(name);
    const r = await t.http().post(`/orgs/${orgId}/reviews`).set(me).send(review).expect(201);
    return { me, id: r.body.review.id as string };
  }
  const publicList = async () => (await t.http().get(`/orgs/${orgId}/reviews`).expect(200)).body.items;

  describe('editar', () => {
    it('exige sessão', async () => {
      const { id } = await publish();
      expect((await t.http().patch(`/me/reviews/${id}`).send(goodReview)).status).toBe(401);
    });

    it('muda notas, etiquetas e texto; recalcula a média e marca como editada', async () => {
      const { me, id } = await publish();
      const res = await t
        .http()
        .patch(`/me/reviews/${id}`)
        .set(me)
        .send({ scores: { respeito: 2, salario: 3 }, recommend: false, tags: [], text: 'Mudou a gerência e os horários pioraram.' })
        .expect(200);
      expect(res.body.review).toMatchObject({ id, avg: 2.5, recommend: false, tags: [], text: 'Mudou a gerência e os horários pioraram.', editedAt: expect.any(String) });
      expect(res.body.review).not.toHaveProperty('authorRef');
      const [pub] = await publicList();
      expect(pub).toMatchObject({ id, avg: 2.5, text: 'Mudou a gerência e os horários pioraram.', editedAt: expect.any(String) });
      const mine = (await t.http().get('/me/reviews').set(me).expect(200)).body.items[0];
      expect(mine).toMatchObject({ id, avg: 2.5, editedAt: expect.any(String) });
    });

    it('uma avaliação por editar não tem data de edição', async () => {
      const { id } = await publish();
      expect((await publicList())[0]).toMatchObject({ id, editedAt: null });
    });

    it('segue as mesmas regras: nomes e insultos bloqueiam (422 com sugestão)', async () => {
      const { me, id } = await publish();
      const res = await t.http().patch(`/me/reviews/${id}`).set(me).send({ ...goodReview, text: 'O Ricardo é um idiota.' });
      expect(res.status).toBe(422);
      expect(res.body).toMatchObject({ code: 'PERSONAL_ATTACK', suggestion: expect.any(String) });
      expect((await publicList())[0].text).toBe(goodReview.text);
    });

    it('valida o pedido como ao publicar (400)', async () => {
      const { me, id } = await publish();
      expect((await t.http().patch(`/me/reviews/${id}`).set(me).send({ scores: {} })).status).toBe(400);
    });

    it('uma possível ilegalidade nova marca a avaliação e envia a mensagem de apoio (uma só vez)', async () => {
      const { me, id } = await publish();
      const flagged = { ...goodReview, text: 'O salário chega sempre com atraso.' };
      const res = await t.http().patch(`/me/reviews/${id}`).set(me).send(flagged).expect(200);
      expect(res.body.review.flagged).toBe(true);
      expect(res.body.supportMessage).toMatchObject({ kinds: ['incumprimento salarial'] });
      const again = await t.http().patch(`/me/reviews/${id}`).set(me).send(flagged).expect(200);
      expect(again.body.supportMessage).toBeNull();
      expect((await t.pool.query('SELECT count(*)::int AS n FROM support_messages WHERE review_id = $1', [id])).rows[0].n).toBe(1);
      const ok = await t.http().patch(`/me/reviews/${id}`).set(me).send(goodReview).expect(200);
      expect(ok.body.review.flagged).toBe(false);
    });

    it('só quem escreveu pode editar (404 para os outros e para ids que não existem)', async () => {
      const { id } = await publish();
      const other = await t.login('rui');
      expect((await t.http().patch(`/me/reviews/${id}`).set(other).send(goodReview)).status).toBe(404);
      expect((await t.http().patch(`/me/reviews/nao-e-um-id`).set(other).send(goodReview)).status).toBe(404);
      expect((await t.http().patch(`/me/reviews/00000000-0000-4000-8000-000000000000`).set(other).send(goodReview)).status).toBe(404);
    });

    it('uma avaliação retirada pela moderação não se edita (contesta-se nas mensagens)', async () => {
      const { me, id } = await publish();
      await t.pool.query(`UPDATE reviews SET status = 'removed' WHERE id = $1`, [id]);
      const res = await t.http().patch(`/me/reviews/${id}`).set(me).send(goodReview);
      expect(res.status).toBe(409);
    });
  });

  describe('apagar', () => {
    it('exige sessão', async () => {
      const { id } = await publish();
      expect((await t.http().delete(`/me/reviews/${id}`)).status).toBe(401);
    });

    it('apaga a avaliação e o que está ligado a ela, mantendo a conta e as outras avaliações', async () => {
      const { me, id } = await publish('ana', { ...goodReview, text: 'O salário chega sempre com atraso.' });
      const otherOrg = await insertOrg(t.pool, { name: 'Café Central' });
      await t.http().post(`/orgs/${otherOrg}/reviews`).set(me).send(goodReview).expect(201);
      const rui = await t.login('rui');
      await t.http().put(`/reviews/${id}/helpful`).set(rui).expect(204);

      await t.http().delete(`/me/reviews/${id}`).set(me).expect(204);

      expect(await publicList()).toEqual([]);
      expect((await t.pool.query('SELECT count(*)::int AS n FROM support_messages WHERE review_id = $1', [id])).rows[0].n).toBe(0);
      expect((await t.pool.query('SELECT count(*)::int AS n FROM review_helpful WHERE review_id = $1', [id])).rows[0].n).toBe(0);
      const mine = (await t.http().get('/me/reviews').set(me).expect(200)).body.items;
      expect(mine.map((r: { orgId: string }) => r.orgId)).toEqual([otherOrg]);
      // pode voltar a avaliar a mesma organização
      await t.http().post(`/orgs/${orgId}/reviews`).set(me).send(goodReview).expect(201);
    });

    it('também apaga uma avaliação retirada pela moderação', async () => {
      const { me, id } = await publish();
      await t.pool.query(`UPDATE reviews SET status = 'removed' WHERE id = $1`, [id]);
      await t.http().delete(`/me/reviews/${id}`).set(me).expect(204);
      expect((await t.pool.query('SELECT count(*)::int AS n FROM reviews')).rows[0].n).toBe(0);
    });

    it('só quem escreveu pode apagar', async () => {
      const { id } = await publish();
      const other = await t.login('rui');
      expect((await t.http().delete(`/me/reviews/${id}`).set(other)).status).toBe(404);
      expect((await t.http().delete(`/me/reviews/nao-e-um-id`).set(other)).status).toBe(404);
      expect((await publicList()).length).toBe(1);
    });
  });
});
