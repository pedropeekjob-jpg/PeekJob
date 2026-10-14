import { createTestApp, insertOrg, resetDb, TestCtx } from '../helpers';

const interview = { role: 'Balcão', positive: true, offer: true, difficulty: 2, steps: ['Conversa', 'Dia de experiência'], text: 'Conversa curta e um dia de experiência pago.' };
const salary = (monthlyGross: number, role = 'Balcão', paidOnTime: boolean | null = true) => ({ role, monthlyGross, paidOnTime });

/** Entrevistas e salários partilhados por quem trabalha (ou se candidatou): anónimos e agregados */
describe('Entrevistas e salários', () => {
  let t: TestCtx;
  let org: string;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.pool.end();
    await t.app.close();
  });
  beforeEach(async () => {
    await resetDb(t);
    org = await insertOrg(t.pool, { name: 'Padaria Ribeira' });
  });

  describe('entrevistas', () => {
    it('partilhar exige sessão; dados inválidos e organização inexistente são recusados', async () => {
      expect((await t.http().post(`/orgs/${org}/interviews`).send(interview)).status).toBe(401);
      const me = await t.login('ana');
      expect((await t.http().post(`/orgs/${org}/interviews`).set(me).send({ ...interview, steps: [] })).status).toBe(400);
      expect((await t.http().post('/orgs/nao-existe/interviews').set(me).send(interview)).status).toBe(404);
      expect((await t.http().post('/orgs/00000000-0000-0000-0000-000000000000/interviews').set(me).send(interview)).status).toBe(404);
    });

    it('partilhar, listar sem dizer quem foi, e o resumo', async () => {
      const res = await t.http().post(`/orgs/${org}/interviews`).set(await t.login('ana')).send(interview).expect(201);
      expect(res.body.interview).toMatchObject({ role: 'Balcão', positive: true, offer: true, steps: ['Conversa', 'Dia de experiência'] });
      await t.http().post(`/orgs/${org}/interviews`).set(await t.login('rui')).send({ ...interview, positive: false, offer: false, answered: false, difficulty: 4, steps: ['Conversa'], text: '' }).expect(201);

      const list = (await t.http().get(`/orgs/${org}/interviews`).expect(200)).body;
      expect(list.items).toHaveLength(2);
      expect(list.items[0]).toEqual({
        id: expect.any(String),
        role: 'Balcão',
        positive: false,
        offer: false,
        answered: false,
        difficulty: 4,
        steps: ['Conversa'],
        text: '',
        createdAt: expect.any(String),
      });
      expect(JSON.stringify(list)).not.toMatch(/author|ref/);
      expect(list.stats).toEqual({ positivePct: 50, offerPct: 50, answeredPct: 50, difficulty: 3, usualSteps: 'Conversa + Dia de experiência' });
    });

    it('uma por pessoa e organização', async () => {
      const me = await t.login('ana');
      await t.http().post(`/orgs/${org}/interviews`).set(me).send(interview).expect(201);
      expect((await t.http().post(`/orgs/${org}/interviews`).set(me).send(interview)).status).toBe(409);
    });

    it('nomes e insultos bloqueiam (também na função), com sugestão', async () => {
      const me = await t.login('ana');
      const res = await t.http().post(`/orgs/${org}/interviews`).set(me).send({ ...interview, text: 'O Ricardo é incompetente.' });
      expect(res.status).toBe(422);
      expect(res.body).toMatchObject({ code: 'PERSONAL_ATTACK', names: ['Ricardo'] });
      expect(res.body.suggestion).not.toMatch(/Ricardo/);
      expect((await t.http().post(`/orgs/${org}/interviews`).set(me).send({ ...interview, role: 'Assistente do Ricardo' })).status).toBe(422);
    });

    it('sem entrevistas: lista vazia e sem resumo; organizações por aprovar não mostram nada', async () => {
      expect((await t.http().get(`/orgs/${org}/interviews`).expect(200)).body).toEqual({ items: [], stats: null });
      const pending = await insertOrg(t.pool, { name: 'Nova', status: 'pending' });
      await t.http().post(`/orgs/${pending}/interviews`).set(await t.login('ana')).send(interview).expect(201);
      expect((await t.http().get(`/orgs/${pending}/interviews`)).body.items).toEqual([]);
      expect((await t.http().get('/orgs/xyz/interviews')).status).toBe(404);
    });
  });

  describe('salários', () => {
    it('partilhar exige sessão e valores plausíveis', async () => {
      expect((await t.http().post(`/orgs/${org}/salaries`).send(salary(950))).status).toBe(401);
      const me = await t.login('ana');
      expect((await t.http().post(`/orgs/${org}/salaries`).set(me).send(salary(10))).status).toBe(400);
      expect((await t.http().post('/orgs/xyz/salaries').set(me).send(salary(950))).status).toBe(404);
    });

    it(`com menos de 3 salários numa função não se mostra nenhum valor`, async () => {
      await t.http().post(`/orgs/${org}/salaries`).set(await t.login('ana')).send(salary(950)).expect(201);
      await t.http().post(`/orgs/${org}/salaries`).set(await t.login('rui')).send(salary(1000, 'balcao')).expect(201);
      const body = (await t.http().get(`/orgs/${org}/salaries`).expect(200)).body;
      expect(body).toEqual({ bands: [{ role: 'Balcão', count: 2 }], paidOnTimePct: null, total: 2 });
      expect(JSON.stringify(body)).not.toMatch(/950|1000/);
    });

    it('a partir de 3: intervalo (percentis) e valor do meio; "pagam a horas" em %', async () => {
      for (const [who, v, onTime] of [['ana', 900, true], ['rui', 950, true], ['eva', 1000, false], ['joao', 1500, null]] as const) {
        await t.http().post(`/orgs/${org}/salaries`).set(await t.login(who)).send(salary(v, 'Balcão', onTime)).expect(201);
      }
      const body = (await t.http().get(`/orgs/${org}/salaries`)).body;
      expect(body.total).toBe(4);
      expect(body.paidOnTimePct).toBe(67);
      expect(body.bands[0]).toMatchObject({ role: 'Balcão', count: 4, median: 980 });
      expect(body.bands[0].min).toBeGreaterThan(900);
      expect(body.bands[0].max).toBeLessThan(1500);
    });

    it('voltar a partilhar atualiza o salário dessa pessoa (não conta duas vezes)', async () => {
      const me = await t.login('ana');
      await t.http().post(`/orgs/${org}/salaries`).set(me).send(salary(900)).expect(201);
      await t.http().post(`/orgs/${org}/salaries`).set(me).send(salary(1200, 'Fabrico')).expect(201);
      expect((await t.http().get(`/orgs/${org}/salaries`)).body.bands).toEqual([{ role: 'Fabrico', count: 1 }]);
    });

    it('nomes de pessoas na função bloqueiam', async () => {
      const res = await t.http().post(`/orgs/${org}/salaries`).set(await t.login('ana')).send(salary(900, 'Assistente do Ricardo'));
      expect(res.status).toBe(422);
    });
  });

  describe('os meus dados e fusão de organizações', () => {
    it('entram no export e são apagados com a conta', async () => {
      const me = await t.login('ana');
      await t.http().post(`/orgs/${org}/interviews`).set(me).send(interview).expect(201);
      await t.http().post(`/orgs/${org}/salaries`).set(me).send(salary(950)).expect(201);
      const data = (await t.http().get('/me/export').set(me).expect(200)).body;
      expect(data.interviews).toEqual([expect.objectContaining({ orgName: 'Padaria Ribeira', role: 'Balcão', steps: ['Conversa', 'Dia de experiência'] })]);
      expect(data.salaries).toEqual([expect.objectContaining({ orgName: 'Padaria Ribeira', role: 'Balcão', monthlyGross: 950, paidOnTime: true })]);
      await t.http().delete('/me').set(me).send({}).expect(204);
      expect((await t.pool.query('SELECT count(*)::int AS n FROM interviews')).rows[0].n).toBe(0);
      expect((await t.pool.query('SELECT count(*)::int AS n FROM salaries')).rows[0].n).toBe(0);
    });

    it('ao fundir duas organizações passam para a que fica (a mesma pessoa conta uma vez)', async () => {
      const dup = await insertOrg(t.pool, { name: 'Padaria Ribeira Lda' });
      const ana = await t.login('ana');
      await t.http().post(`/orgs/${org}/salaries`).set(ana).send(salary(900)).expect(201);
      await t.http().post(`/orgs/${dup}/salaries`).set(ana).send(salary(950)).expect(201);
      await t.http().post(`/orgs/${dup}/interviews`).set(ana).send(interview).expect(201);
      await t.http().post(`/orgs/${dup}/interviews`).set(await t.login('rui')).send(interview).expect(201);
      await t.http().post(`/orgs/${org}/interviews`).set(ana).send(interview).expect(201);
      const mod = await t.login('mod', 'moderator');
      await t.http().post(`/orgs/${dup}/merge`).set(mod).send({ targetId: org }).expect(200);
      expect((await t.http().get(`/orgs/${org}/salaries`)).body.total).toBe(1);
      expect((await t.http().get(`/orgs/${org}/interviews`)).body.items).toHaveLength(2);
    });
  });
});
