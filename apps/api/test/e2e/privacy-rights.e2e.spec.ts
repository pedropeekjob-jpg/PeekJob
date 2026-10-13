import { createTestApp, goodReview, insertOrg, resetDb, TestCtx } from '../helpers';

/** RGPD: acesso (exportar) e apagamento dos dados de cada pessoa. */
describe('Os meus dados (RGPD)', () => {
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

  async function personWithData() {
    const me = await t.login('ana@gmail.com');
    expect((await t.http().post('/verifications/email').set(me).send({ orgId, email: 'ana@padaria.pt' })).status).toBe(202);
    expect((await t.http().post('/verifications/email/confirm').set(me).send({ orgId, code: t.mailer.lastCodeFor('ana@padaria.pt') })).status).toBe(200);
    const rf = { ...goodReview, text: 'O salário chega sempre com atraso.' };
    const rev = await t.http().post(`/orgs/${orgId}/reviews`).set(me).send(rf).expect(201);
    return { me, reviewId: rev.body.review.id as string };
  }

  describe('exportar', () => {
    it('exige sessão', async () => {
      expect((await t.http().get('/me/export')).status).toBe(401);
    });

    it('devolve um ficheiro JSON com tudo o que está ligado à pessoa', async () => {
      const { me } = await personWithData();
      const res = await t.http().get('/me/export').set(me).expect(200);
      expect(res.headers['content-type']).toMatch(/json/);
      expect(res.headers['content-disposition']).toMatch(/attachment; filename="peekjob-os-meus-dados-\d{4}-\d{2}-\d{2}\.json"/);
      const data = JSON.parse(res.text);
      expect(data.account).toMatchObject({ role: 'user' });
      expect(data.account.createdAt).toBeTruthy();
      expect(data.reviews).toHaveLength(1);
      expect(data.reviews[0]).toMatchObject({ orgName: 'Padaria Ribeira', text: 'O salário chega sempre com atraso.', verified: true });
      expect(data.verifications).toEqual([expect.objectContaining({ orgName: 'Padaria Ribeira', method: 'email' })]);
      expect(data.messages.length).toBeGreaterThan(0);
      expect(data.about).toMatch(/email/);
      // nunca hashes nem identificadores internos
      expect(res.text).not.toMatch(/email_hash|author_ref|user_ref|[a-f0-9]{64}/);
    });
  });

  describe('apagar a conta', () => {
    it('apaga a conta, as avaliações, verificações e mensagens, e termina a sessão', async () => {
      const { me } = await personWithData();
      const res = await t.http().delete('/me').set(me).send({}).expect(204);
      expect(String(res.headers['set-cookie'])).toMatch(/pj_session=;/);
      expect((await t.http().get('/auth/me').set(me)).status).toBe(401);
      const counts = await t.pool.query(`SELECT
        (SELECT count(*) FROM users)::int AS users, (SELECT count(*) FROM reviews)::int AS reviews,
        (SELECT count(*) FROM verifications)::int AS verifications, (SELECT count(*) FROM support_messages)::int AS messages,
        (SELECT count(*) FROM sessions)::int AS sessions, (SELECT count(*) FROM login_tokens)::int AS tokens`);
      expect(counts.rows[0]).toEqual({ users: 0, reviews: 0, verifications: 0, messages: 0, sessions: 0, tokens: 0 });
    });

    it('pode manter as avaliações, mas deixam de estar ligadas à pessoa', async () => {
      const { me, reviewId } = await personWithData();
      expect((await t.http().delete('/me').set(me).send({ keepReviews: true })).status).toBe(204);
      const { rows } = await t.pool.query('SELECT author_ref FROM reviews WHERE id = $1', [reviewId]);
      expect(rows).toHaveLength(1);
      // voltar a entrar com o mesmo email cria uma conta nova, sem ligação à avaliação antiga
      t.sessions.clear();
      const again = await t.login('ana@gmail.com');
      const mine = await t.http().get('/me/reviews').set(again).expect(200);
      expect(mine.body.items).toHaveLength(0);
      const list = await t.http().get(`/orgs/${orgId}/reviews`).expect(200);
      expect(list.body.items).toHaveLength(1);
    });

    it('as organizações que a pessoa criou ficam, sem ligação a ela', async () => {
      const me = await t.login('criadora');
      const created = await t.http().post('/orgs').set(me).send({ name: 'Café do Largo', type: 'PME', city: 'Porto' }).expect(201);
      expect((await t.http().delete('/me').set(me).send({})).status).toBe(204);
      const { rows } = await t.pool.query('SELECT created_by FROM organizations WHERE id = $1', [created.body.id]);
      expect(rows).toEqual([{ created_by: null }]);
    });

    it('exige sessão', async () => {
      expect((await t.http().delete('/me').send({})).status).toBe(401);
    });
  });
});
