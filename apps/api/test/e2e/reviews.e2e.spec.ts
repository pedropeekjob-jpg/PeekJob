import { createTestApp, goodReview, insertOrg, resetDb, TestCtx } from '../helpers';

describe('Avaliações', () => {
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

  it('exige sessão', async () => {
    expect((await t.http().post(`/orgs/${orgId}/reviews`).send(goodReview)).status).toBe(401);
  });

  it('publica uma avaliação e calcula a média', async () => {
    const res = await t.http().post(`/orgs/${orgId}/reviews`).set(await t.login('u1')).send(goodReview).expect(201);
    expect(res.body.review).toMatchObject({ avg: 4.3, text: 'Equipa unida e horários cumpridos.', flagged: false });
    expect(res.body.supportMessage).toBeNull();
  });

  it('nunca expõe quem avaliou', async () => {
    expect((await t.http().post(`/orgs/${orgId}/reviews`).set(await t.login('pessoa@gmail.com')).send(goodReview)).status).toBe(201);
    const res = await t.http().get(`/orgs/${orgId}/reviews`).expect(200);
    const raw = JSON.stringify(res.body);
    expect(raw).not.toMatch(/pessoa|reviewer|user/i);
    const row = await t.pool.query('SELECT author_ref FROM reviews');
    expect(row.rows[0].author_ref).not.toContain('pessoa');
  });

  it('uma avaliação por pessoa por organização (409)', async () => {
    expect((await t.http().post(`/orgs/${orgId}/reviews`).set(await t.login('u1')).send(goodReview)).status).toBe(201);
    expect((await t.http().post(`/orgs/${orgId}/reviews`).set(await t.login('u1')).send(goodReview)).status).toBe(409);
  });

  it('bloqueia insultos e nomes de pessoas (422) e sugere uma versão sem eles', async () => {
    const res = await t.http()
      .post(`/orgs/${orgId}/reviews`)
      .set(await t.login('u1'))
      .send({ ...goodReview, text: 'O Ricardo é incompetente.' })
      .expect(422);
    expect(res.body).toMatchObject({ code: 'PERSONAL_ATTACK', names: ['Ricardo'], insults: ['incompetente'] });
    expect(res.body.suggestion).not.toMatch(/Ricardo|incompetente/);
    const count = await t.pool.query('SELECT count(*)::int AS n FROM reviews');
    expect(count.rows[0].n).toBe(0);
  });

  it('parâmetros do tipo de trabalho e comentários por parâmetro: guardam-se e aparecem na lista pública', async () => {
    const body = { ...goodReview, extras: { gorjetas: true, folgas_escala: 2 }, comments: { ambiente: 'Equipa sempre pronta a ajudar.', gorjetas: 'Divididas por todos.' } };
    const res = await t.http().post(`/orgs/${orgId}/reviews`).set(await t.login('u1')).send(body).expect(201);
    expect(res.body.review).toMatchObject({ extras: body.extras, comments: body.comments });
    const list = await t.http().get(`/orgs/${orgId}/reviews`).expect(200);
    expect(list.body[0] ?? list.body.items?.[0]).toMatchObject({ extras: body.extras, comments: body.comments });
  });

  it('parâmetro sim/não com nota, ou parâmetro inventado: 400', async () => {
    const login = await t.login('u1');
    expect((await t.http().post(`/orgs/${orgId}/reviews`).set(login).send({ ...goodReview, extras: { gorjetas: 4 } })).status).toBe(400);
    expect((await t.http().post(`/orgs/${orgId}/reviews`).set(login).send({ ...goodReview, extras: { inventado: true } })).status).toBe(400);
  });

  it('insulto num comentário de parâmetro: 422 a dizer qual', async () => {
    const res = await t.http()
      .post(`/orgs/${orgId}/reviews`)
      .set(await t.login('u1'))
      .send({ ...goodReview, comments: { lideranca: 'O Ricardo é incompetente.' } })
      .expect(422);
    expect(res.body).toMatchObject({ code: 'PERSONAL_ATTACK', field: 'comments.lideranca' });
    expect(res.body.suggestion).not.toMatch(/Ricardo|incompetente/);
  });

  it('possível ilegalidade num comentário de parâmetro também gera a mensagem de apoio', async () => {
    const res = await t.http()
      .post(`/orgs/${orgId}/reviews`)
      .set(await t.login('u1'))
      .send({ ...goodReview, comments: { salario: 'O salário chega sempre com atraso.' } })
      .expect(201);
    expect(res.body.review.flagged).toBe(true);
    expect(res.body.supportMessage).not.toBeNull();
  });

  describe('red flags: possível ilegalidade', () => {
    const flaggedReview = { ...goodReview, tags: ['Salário em atraso'], text: 'O salário chega com atraso e há comentários sobre o corpo.' };

    it('publica (não bloqueia) e marca a avaliação', async () => {
      const res = await t.http().post(`/orgs/${orgId}/reviews`).set(await t.login('u1')).send(flaggedReview).expect(201);
      expect(res.body.review.flagged).toBe(true);
    });

    it('envia uma mensagem privada de apoio só a quem escreveu', async () => {
      const res = await t.http().post(`/orgs/${orgId}/reviews`).set(await t.login('u1')).send(flaggedReview).expect(201);
      expect(res.body.supportMessage.kinds).toEqual(expect.arrayContaining(['incumprimento salarial', 'assédio sexual']));

      const mine = await t.http().get('/me/messages').set(await t.login('u1')).expect(200);
      expect(mine.body.items).toHaveLength(1);
      expect(mine.body.items[0]).toMatchObject({ read: false });
      expect(mine.body.items[0].contacts.map((c: { short: string }) => c.short)).toEqual(['ACT', 'CITE', 'APAV']);

      const other = await t.http().get('/me/messages').set(await t.login('u2')).expect(200);
      expect(other.body.items).toHaveLength(0);
    });

    it('a página pública mostra só o número de relatos de assédio (nunca o texto da mensagem)', async () => {
      expect((await t.http().post(`/orgs/${orgId}/reviews`).set(await t.login('u1')).send(flaggedReview)).status).toBe(201);
      expect((await t.http().post(`/orgs/${orgId}/reviews`).set(await t.login('u2')).send({ ...goodReview, text: 'Há meses que pagam com atraso.' })).status).toBe(201);
      expect((await t.http().post(`/orgs/${orgId}/reviews`).set(await t.login('u3')).send(goodReview)).status).toBe(201);
      const res = await t.http().get(`/orgs/${orgId}`).expect(200);
      expect(res.body.harassmentReports).toBe(1);
      expect(JSON.stringify(res.body)).not.toMatch(/incumprimento|kinds/);
    });

    it('marca as mensagens como lidas', async () => {
      expect((await t.http().post(`/orgs/${orgId}/reviews`).set(await t.login('u1')).send(flaggedReview)).status).toBe(201);
      const { body } = await t.http().get('/me/messages').set(await t.login('u1'));
      expect((await t.http().post(`/me/messages/${body.items[0].id}/read`).set(await t.login('u1'))).status).toBe(204);
      const after = await t.http().get('/me/messages').set(await t.login('u1'));
      expect(after.body.items[0].read).toBe(true);
    });
  });

  describe('organizações criadas por utilizadores', () => {
    it('ficam pendentes até 3 pessoas diferentes avaliarem', async () => {
      const created = await t.http().post('/orgs').set(await t.login('u1')).send({ name: 'Café do Largo', type: 'PME', city: 'Porto' }).expect(201);
      const id = created.body.id;
      expect((await t.http().post(`/orgs/${id}/reviews`).set(await t.login('u1')).send(goodReview)).status).toBe(201);
      expect((await t.http().post(`/orgs/${id}/reviews`).set(await t.login('u2')).send(goodReview)).status).toBe(201);
      expect((await t.http().get(`/orgs/${id}`)).status).toBe(404);
      const third = await t.http().post(`/orgs/${id}/reviews`).set(await t.login('u3')).send(goodReview).expect(201);
      expect(third.body.orgStatus).toBe('active');
      expect((await t.http().get(`/orgs/${id}`)).status).toBe(200);
    });
  });

  it('valida as notas (400)', async () => {
    expect((await t.http().post(`/orgs/${orgId}/reviews`).set(await t.login('u1')).send({ ...goodReview, scores: { respeito: 9 } })).status).toBe(400);
  });

  it('404 para organização inexistente ou fundida', async () => {
    expect((await t.http().post('/orgs/00000000-0000-0000-0000-000000000000/reviews').set(await t.login('u1')).send(goodReview)).status).toBe(404);
  });
});
