import { createTestApp, goodReview, insertOrg, resetDb, TestCtx } from '../helpers';

describe('Organizações', () => {
  let t: TestCtx;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.pool.end();
    await t.app.close();
  });
  beforeEach(() => resetDb(t));

  describe('GET /orgs/search — pesquisa tolerante', () => {
    beforeEach(async () => {
      await insertOrg(t.pool, { name: 'Padaria Ribeira' });
      await insertOrg(t.pool, { name: 'Associação Mãos Dadas', type: 'Associação', city: 'Braga' });
      await insertOrg(t.pool, { name: 'Oficina Sete' });
      await insertOrg(t.pool, { name: 'Padaria Escondida', status: 'pending' });
    });

    it('encontra sem acentos, com maiúsculas e com erros de escrita', async () => {
      for (const q of ['padaria ribeira', 'PADARIA RIBEIRA', 'padaria da ribera', 'maos dadas']) {
        const res = await t.http().get('/orgs/search').query({ q }).expect(200);
        expect(res.body.items[0].name).toMatch(q.includes('maos') ? /Mãos Dadas/ : /Padaria Ribeira/);
      }
    });

    it('ordena pela semelhança', async () => {
      const res = await t.http().get('/orgs/search').query({ q: 'padaria' }).expect(200);
      expect(res.body.items.map((o: { name: string }) => o.name)).toEqual(['Padaria Ribeira']);
    });

    it('esconde organizações pendentes, a não ser no fluxo de avaliar', async () => {
      const pub = await t.http().get('/orgs/search').query({ q: 'escondida' }).expect(200);
      expect(pub.body.items).toHaveLength(0);
      const flow = await t.http().get('/orgs/search').query({ q: 'escondida', includePending: 'true' }).expect(200);
      expect(flow.body.items[0]).toMatchObject({ name: 'Padaria Escondida', status: 'pending' });
    });

    it('filtra por tipo', async () => {
      const res = await t.http().get('/orgs/search').query({ q: '', type: 'Associação' }).expect(200);
      expect(res.body.items.map((o: { name: string }) => o.name)).toEqual(['Associação Mãos Dadas']);
    });
  });

  describe('POST /orgs — avaliar uma organização que não está na lista', () => {
    const nova = { name: 'Café do Largo', type: 'PME', city: 'Porto' };

    it('exige sessão', async () => {
      await t.http().post('/orgs').send(nova).expect(401);
    });

    it('cria a organização em estado pendente', async () => {
      const res = await t.http().post('/orgs').set(await t.login('u1')).send(nova).expect(201);
      expect(res.body).toMatchObject({ name: 'Café do Largo', status: 'pending', possibleDuplicates: [] });
      expect(res.body.id).toEqual(expect.any(String));
    });

    it('valida os dados (400 com os campos em erro)', async () => {
      const res = await t.http().post('/orgs').set(await t.login('u1')).send({ ...nova, nif: '123' }).expect(400);
      expect(res.body.issues[0].path).toEqual(['nif']);
    });

    it('exige NIF a empresas em nome individual', async () => {
      await t.http().post('/orgs').set(await t.login('u1')).send({ ...nova, type: 'Nome individual' }).expect(400);
    });

    it('recusa NIF já existente e indica a organização certa (409)', async () => {
      const existing = await insertOrg(t.pool, { name: 'Padaria Ribeira', nif: '500000000' });
      const res = await t.http().post('/orgs').set(await t.login('u1')).send({ ...nova, nif: 'PT 500 000 000' }).expect(409);
      expect(res.body.existingId).toBe(existing);
    });

    it('avisa de possíveis duplicados na mesma cidade', async () => {
      await insertOrg(t.pool, { name: 'Café do Largo Lda', city: 'Porto' });
      await insertOrg(t.pool, { name: 'Café do Largo', city: 'Faro' });
      const res = await t.http().post('/orgs').set(await t.login('u1')).send(nova).expect(201);
      expect(res.body.possibleDuplicates.map((d: { name: string }) => d.name)).toEqual(['Café do Largo Lda']);
    });

    it('limita a criação a 5 organizações por pessoa por dia', async () => {
      for (let i = 0; i < 5; i++) {
        await t.http().post('/orgs').set(await t.login('u1')).send({ ...nova, name: `Loja número ${i}` }).expect(201);
      }
      await t.http().post('/orgs').set(await t.login('u1')).send({ ...nova, name: 'Loja a mais' }).expect(429);
      await t.http().post('/orgs').set(await t.login('u2')).send({ ...nova, name: 'Loja de outra pessoa' }).expect(201);
    });
  });

  describe('GET /orgs/:id', () => {
    it('devolve a organização com nota e nº de avaliações', async () => {
      const id = await insertOrg(t.pool, { name: 'Padaria Ribeira' });
      await t.http().post(`/orgs/${id}/reviews`).set(await t.login('u1')).send(goodReview).expect(201);
      const res = await t.http().get(`/orgs/${id}`).expect(200);
      expect(res.body).toMatchObject({ id, name: 'Padaria Ribeira', status: 'active', reviewsCount: 1 });
      expect(res.body.score).toBeCloseTo(4.3, 1);
      expect(res.body.criteria.respeito).toBe(5);
    });

    it('404 para pendentes e inexistentes', async () => {
      const id = await insertOrg(t.pool, { name: 'Pendente', status: 'pending' });
      await t.http().get(`/orgs/${id}`).expect(404);
      await t.http().get('/orgs/00000000-0000-0000-0000-000000000000').expect(404);
      await t.http().get('/orgs/nao-e-um-uuid').expect(404);
    });
  });

  describe('Moderação de organizações', () => {
    it('um moderador aprova uma organização pendente', async () => {
      const id = await insertOrg(t.pool, { name: 'Nova', status: 'pending' });
      await t.http().post(`/orgs/${id}/approve`).set(await t.login('u1')).expect(403);
      const res = await t.http().post(`/orgs/${id}/approve`).set(await t.login('mod', 'moderator')).expect(200);
      expect(res.body.status).toBe('active');
    });

    it('funde um duplicado: move avaliações, guarda o nome antigo como alias e redireciona', async () => {
      const target = await insertOrg(t.pool, { name: 'Padaria Ribeira' });
      const dup = await insertOrg(t.pool, { name: 'Padaria da Ribeira Lda', status: 'pending' });
      await t.http().post(`/orgs/${dup}/reviews`).set(await t.login('u1')).send(goodReview).expect(201);
      await t.http().post(`/orgs/${target}/reviews`).set(await t.login('u2')).send(goodReview).expect(201);

      await t.http().post(`/orgs/${dup}/merge`).set(await t.login('u3')).send({ targetId: target }).expect(403);
      await t.http().post(`/orgs/${dup}/merge`).set(await t.login('mod', 'moderator')).send({ targetId: target }).expect(200);

      const org = await t.http().get(`/orgs/${target}`).expect(200);
      expect(org.body.reviewsCount).toBe(2);

      const old = await t.http().get(`/orgs/${dup}`).expect(308);
      expect(old.headers.location).toBe(`/orgs/${target}`);

      const search = await t.http().get('/orgs/search').query({ q: 'padaria da ribeira lda' }).expect(200);
      expect(search.body.items[0].id).toBe(target);
    });

    it('na fusão, se a mesma pessoa avaliou as duas, fica só a avaliação mais recente', async () => {
      const target = await insertOrg(t.pool, { name: 'Oficina Sete' });
      const dup = await insertOrg(t.pool, { name: 'Oficina 7', status: 'pending' });
      await t.http().post(`/orgs/${target}/reviews`).set(await t.login('u1')).send({ ...goodReview, text: 'Antiga.' }).expect(201);
      await t.http().post(`/orgs/${dup}/reviews`).set(await t.login('u1')).send({ ...goodReview, text: 'Mais recente.' }).expect(201);
      await t.http().post(`/orgs/${dup}/merge`).set(await t.login('mod', 'moderator')).send({ targetId: target }).expect(200);
      const res = await t.http().get(`/orgs/${target}/reviews`).expect(200);
      expect(res.body.items.map((r: { text: string }) => r.text)).toEqual(['Mais recente.']);
    });
  });
});
