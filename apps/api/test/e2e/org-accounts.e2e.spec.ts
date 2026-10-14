import { createTestApp, goodReview, insertOrg, makePdf, resetDb, TestCtx } from '../helpers';

type Cookie = { Cookie: string };

/**
 * Contas das organizações: reivindicar a página (aprovado pela moderação), responder em público
 * às avaliações, painel com o pulso da semana e plano Pro (nunca mexe no ranking).
 */
describe('Contas das organizações', () => {
  let t: TestCtx;
  let orgId: string;
  let mod: Cookie;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.pool.end();
    await t.app.close();
  });
  beforeEach(async () => {
    await resetDb(t);
    orgId = await insertOrg(t.pool, { name: 'Padaria Ribeira', nif: '501442600', city: 'Porto' });
    mod = await t.login('moderadora', 'moderator');
  });

  /** Pede por email e confirma o código; `status` é o esperado na confirmação */
  const claimByEmail = async (who: Cookie, email = 'gerencia@padariaribeira.pt', status = 201, org = orgId) => {
    await t.http().post(`/orgs/${org}/claim/email`).set(who).send({ email }).expect(202);
    const code = t.mailer.lastCodeFor(email)!;
    return t.http().post(`/orgs/${org}/claim/email/confirm`).set(who).send({ code, name: 'Rosa Lima', role: 'Gerente' }).expect(status);
  };
  /** Pede e aprova: devolve a sessão de quem gere a página */
  const member = async (name = 'rosa') => {
    const who = await t.login(name);
    const claim = (await claimByEmail(who, `${name}@padariaribeira.pt`)).body.claim;
    await t.http().post(`/moderation/claims/${claim.id}/decision`).set(mod).send({ action: 'approve', note: 'Domínio confirmado no site oficial.' }).expect(200);
    return who;
  };
  const review = async (who = 'ana', body: Record<string, unknown> = goodReview) =>
    (await t.http().post(`/orgs/${orgId}/reviews`).set(await t.login(who)).send(body).expect(201)).body.review.id as string;

  describe('reivindicar', () => {
    it('exige sessão; email de serviços gratuitos não serve; organização inexistente → 404', async () => {
      expect((await t.http().post(`/orgs/${orgId}/claim/email`).send({ email: 'a@padariaribeira.pt' })).status).toBe(401);
      const me = await t.login('rosa');
      const free = await t.http().post(`/orgs/${orgId}/claim/email`).set(me).send({ email: 'rosa@gmail.com' });
      expect(free.status).toBe(422);
      expect(free.body.code).toBe('PERSONAL_EMAIL');
      expect((await t.http().post('/orgs/xyz/claim/email').set(me).send({ email: 'a@padariaribeira.pt' })).status).toBe(404);
    });

    it('com domínios conhecidos, só esses servem', async () => {
      await t.pool.query(`INSERT INTO org_domains (org_id, domain) VALUES ($1, 'ribeira.pt')`, [orgId]);
      const me = await t.login('rosa');
      const res = await t.http().post(`/orgs/${orgId}/claim/email`).set(me).send({ email: 'rosa@outra.pt' });
      expect(res.status).toBe(422);
      expect(res.body.code).toBe('DOMAIN_MISMATCH');
      await t.http().post(`/orgs/${orgId}/claim/email`).set(me).send({ email: 'rosa@ribeira.pt' }).expect(202);
    });

    it('código por email → pedido pendente (guarda o domínio, nunca o email); código errado conta tentativas', async () => {
      const me = await t.login('rosa');
      await t.http().post(`/orgs/${orgId}/claim/email`).set(me).send({ email: 'Rosa@PadariaRibeira.pt' }).expect(202);
      expect((await t.http().post(`/orgs/${orgId}/claim/email/confirm`).set(me).send({ code: '000000', name: 'Rosa', role: 'Gerente' })).status).toBe(400);
      const code = t.mailer.lastCodeFor('rosa@padariaribeira.pt')!;
      const res = await t.http().post(`/orgs/${orgId}/claim/email/confirm`).set(me).send({ code, name: 'Rosa Lima', role: 'Gerente' }).expect(201);
      expect(res.body.claim).toMatchObject({ status: 'pending', method: 'email' });
      const stored = JSON.stringify((await t.pool.query('SELECT * FROM org_claims')).rows);
      expect(stored).toContain('padariaribeira.pt');
      expect(stored).not.toMatch(/rosa@/i);
      const mine = (await t.http().get('/me/orgs').set(me).expect(200)).body;
      expect(mine).toEqual({ orgs: [], claims: [expect.objectContaining({ orgId, orgName: 'Padaria Ribeira', status: 'pending', method: 'email' })] });
      // um pedido em aberto de cada vez
      await claimByEmail(me, 'rosa@padariaribeira.pt', 409);
    });

    it('documento com o NIF da organização → pedido pendente; sem o NIF → 422', async () => {
      const me = await t.login('rosa');
      const send = (pdf: Buffer) =>
        t.http().post(`/orgs/${orgId}/claim/document`).set(me).field('name', 'Rosa Lima').field('role', 'Gerente').attach('file', pdf, { filename: 'certidao.pdf', contentType: 'application/pdf' });
      expect((await send(await makePdf(['Certidao permanente', 'Outra Empresa', 'NIF 500 000 000']))).status).toBe(422);
      const res = await send(await makePdf(['Certidao permanente', 'Padaria Ribeira, Lda', 'NIF 501 442 600'])).expect(201);
      expect(res.body.claim).toMatchObject({ status: 'pending', method: 'document' });
    });

    it('moderação: vê os pedidos e decide; aprovado → a página fica "gerida pela organização"', async () => {
      const me = await t.login('rosa');
      await claimByEmail(me);
      expect((await t.http().get('/moderation/claims').set(me)).status).toBe(403);
      const [claim] = (await t.http().get('/moderation/claims').set(mod).expect(200)).body.items;
      expect(claim).toMatchObject({ orgId, orgName: 'Padaria Ribeira', method: 'email', emailDomain: 'padariaribeira.pt', name: 'Rosa Lima', role: 'Gerente', domainKnown: false });
      expect(JSON.stringify(claim)).not.toMatch(/ref/);
      expect((await t.http().get(`/orgs/${orgId}`)).body.claimed).toBe(false);
      expect((await t.http().post(`/moderation/claims/${claim.id}/decision`).set(mod).send({ action: 'approve', note: 'curto' })).status).toBe(400);
      await t.http().post(`/moderation/claims/${claim.id}/decision`).set(mod).send({ action: 'approve', note: 'Domínio confirmado no site oficial.' }).expect(200);
      expect((await t.http().post(`/moderation/claims/${claim.id}/decision`).set(mod).send({ action: 'approve', note: 'Domínio confirmado no site oficial.' })).status).toBe(409);
      expect((await t.http().get(`/orgs/${orgId}`)).body.claimed).toBe(true);
      expect((await t.http().get('/me/orgs').set(me)).body.orgs).toEqual([{ id: orgId, name: 'Padaria Ribeira', plan: 'free' }]);
      expect((await t.http().get('/me/orgs').set(me)).body.claims).toEqual([expect.objectContaining({ status: 'approved' })]);
    });

    it('rejeitado: diz porquê; pode pedir outra vez', async () => {
      const me = await t.login('rosa');
      const claim = (await claimByEmail(me)).body.claim;
      await t.http().post(`/moderation/claims/${claim.id}/decision`).set(mod).send({ action: 'reject', note: 'Não conseguimos confirmar o cargo.' }).expect(200);
      expect((await t.http().get('/me/orgs').set(me)).body.claims[0]).toMatchObject({ status: 'rejected', note: 'Não conseguimos confirmar o cargo.' });
      await claimByEmail(me);
    });
  });

  describe('responder às avaliações', () => {
    it('só quem gere a página responde; a resposta aparece por baixo da avaliação', async () => {
      const id = await review();
      const stranger = await t.login('rui');
      expect((await t.http().put(`/reviews/${id}/reply`).set(stranger).send({ text: 'Obrigado!' })).status).toBe(403);
      const rosa = await member();
      expect((await t.http().put(`/reviews/${id}/reply`).set(rosa).send({ text: 'x' })).status).toBe(400);
      await t.http().put(`/reviews/${id}/reply`).set(rosa).send({ text: 'Obrigado pela avaliação. Vamos rever os horários.' }).expect(200);
      const [r] = (await t.http().get(`/orgs/${orgId}/reviews`)).body.items;
      expect(r.reply).toEqual({ text: 'Obrigado pela avaliação. Vamos rever os horários.', createdAt: expect.any(String), updatedAt: expect.any(String) });
      // editar e apagar
      await t.http().put(`/reviews/${id}/reply`).set(rosa).send({ text: 'Obrigado. Já mudámos os horários.' }).expect(200);
      expect((await t.http().get(`/orgs/${orgId}/reviews`)).body.items[0].reply.text).toBe('Obrigado. Já mudámos os horários.');
      await t.http().delete(`/reviews/${id}/reply`).set(rosa).expect(204);
      expect((await t.http().get(`/orgs/${orgId}/reviews`)).body.items[0].reply).toBeNull();
    });

    it('sem nomes nem insultos (422); avaliação inexistente → 404', async () => {
      const id = await review();
      const rosa = await member();
      const res = await t.http().put(`/reviews/${id}/reply`).set(rosa).send({ text: 'O Ricardo é um idiota.' });
      expect(res.status).toBe(422);
      expect(res.body.code).toBe('PERSONAL_ATTACK');
      expect((await t.http().put('/reviews/00000000-0000-0000-0000-000000000000/reply').set(rosa).send({ text: 'Obrigado!' })).status).toBe(404);
      expect((await t.http().put('/reviews/xyz/reply').set(rosa).send({ text: 'Obrigado!' })).status).toBe(404);
    });
  });

  describe('painel', () => {
    it('só para quem gere a página', async () => {
      expect((await t.http().get(`/orgs/${orgId}/dashboard`)).status).toBe(401);
      expect((await t.http().get(`/orgs/${orgId}/dashboard`).set(await t.login('rui'))).status).toBe(403);
    });

    it('semana: novas, respondidas, por responder, posição na cidade e etiquetas; sem Pro não há tendências', async () => {
      const other = await insertOrg(t.pool, { name: 'Café Vinha', city: 'Porto' });
      await t.http().post(`/orgs/${other}/reviews`).set(await t.login('eva')).send({ ...goodReview, scores: { respeito: 5 } }).expect(201);
      const a = await review('ana', { ...goodReview, scores: { respeito: 4, salario: 3 }, tags: ['Horários cumpridos'] });
      await review('rui', { ...goodReview, scores: { respeito: 3, salario: 2 }, tags: ['Horários cumpridos', 'Salário em atraso'] });
      // uma avaliação antiga (fora desta semana)
      const old = await review('joao', { ...goodReview, scores: { respeito: 5, salario: 5 }, tags: [] });
      await t.pool.query(`UPDATE reviews SET created_at = now() - interval '40 days' WHERE id = $1`, [old]);
      const rosa = await member();
      await t.http().put(`/reviews/${a}/reply`).set(rosa).send({ text: 'Obrigado pela avaliação.' }).expect(200);

      const d = (await t.http().get(`/orgs/${orgId}/dashboard`).set(rosa).expect(200)).body;
      expect(d.org).toEqual({ id: orgId, name: 'Padaria Ribeira', city: 'Porto', plan: 'free' });
      expect(d.week).toMatchObject({ newReviews: 2, answered: 1, unanswered: 2 });
      expect(typeof d.week.scoreDelta).toBe('number');
      expect(d.week.scoreDelta).toBeLessThan(0);
      expect(d.rank).toEqual({ position: 2, total: 2, city: 'Porto' });
      expect(d.tags).toEqual(expect.arrayContaining([{ label: 'Horários cumpridos', n: 2, up: true }, { label: 'Salário em atraso', n: 1, up: true }]));
      expect(d.pending.map((p: { id: string }) => p.id)).not.toContain(a);
      expect(d.pending).toHaveLength(2);
      expect(d.pending[0]).toEqual(expect.objectContaining({ id: expect.any(String), avg: expect.any(Number), text: goodReview.text, createdAt: expect.any(String) }));
      expect(JSON.stringify(d)).not.toMatch(/author|ref/);
      expect(d.pro).toBeNull();
    });

    it('Pro (ligado pela moderação enquanto não há pagamentos): tendências por critério e comparação com o setor; o ranking não muda', async () => {
      await t.pool.query(`UPDATE organizations SET sector = 'Restauração' WHERE id = $1`, [orgId]);
      const peer = await insertOrg(t.pool, { name: 'Café Vinha', city: 'Porto' });
      await t.pool.query(`UPDATE organizations SET sector = 'Restauração' WHERE id = $1`, [peer]);
      await t.http().post(`/orgs/${peer}/reviews`).set(await t.login('eva')).send({ ...goodReview, scores: { respeito: 2 } }).expect(201);
      await review('ana', { ...goodReview, scores: { respeito: 4 } });
      const rosa = await member();
      const before = (await t.http().get('/orgs')).body.items;

      expect((await t.http().put(`/moderation/orgs/${orgId}/plan`).set(rosa).send({ plan: 'pro' })).status).toBe(403);
      expect((await t.http().put(`/moderation/orgs/${orgId}/plan`).set(mod).send({ plan: 'gold' })).status).toBe(400);
      await t.http().put(`/moderation/orgs/${orgId}/plan`).set(mod).send({ plan: 'pro' }).expect(200);
      expect((await t.http().get('/moderation/managed').set(mod).expect(200)).body.items).toEqual([{ id: orgId, name: 'Padaria Ribeira', city: 'Porto', plan: 'pro', members: 1 }]);
      expect((await t.http().get('/moderation/managed').set(rosa)).status).toBe(403);
      expect((await t.http().put('/moderation/orgs/00000000-0000-0000-0000-000000000000/plan').set(mod).send({ plan: 'pro' })).status).toBe(404);

      const d = (await t.http().get(`/orgs/${orgId}/dashboard`).set(rosa).expect(200)).body;
      expect(d.org.plan).toBe('pro');
      expect(d.pro.criteria.respeito).toEqual({ now: 4, delta: expect.any(Number) });
      expect(d.pro.peers).toEqual({ sector: 'Restauração', count: 1, score: 2 });
      expect((await t.http().get('/orgs')).body.items).toEqual(before);
      expect((await t.http().get(`/orgs/${orgId}`)).body.plan).toBeUndefined();
    });
  });

  describe('os meus dados', () => {
    it('pedidos e páginas geridas entram no export; ao apagar a conta saem (as respostas ficam, sem ligação)', async () => {
      const id = await review();
      const rosa = await member();
      await t.http().put(`/reviews/${id}/reply`).set(rosa).send({ text: 'Obrigado pela avaliação.' }).expect(200);
      const data = (await t.http().get('/me/export').set(rosa).expect(200)).body;
      expect(data.organizationAccounts).toEqual({
        manages: [{ orgName: 'Padaria Ribeira', since: expect.any(String) }],
        claims: [expect.objectContaining({ orgName: 'Padaria Ribeira', method: 'email', emailDomain: 'padariaribeira.pt', name: 'Rosa Lima', role: 'Gerente', status: 'approved' })],
        replies: [expect.objectContaining({ orgName: 'Padaria Ribeira', text: 'Obrigado pela avaliação.' })],
      });
      await t.http().delete('/me').set(rosa).send({}).expect(204);
      expect((await t.pool.query('SELECT count(*)::int AS n FROM org_members')).rows[0].n).toBe(0);
      expect((await t.pool.query('SELECT count(*)::int AS n FROM org_claims')).rows[0].n).toBe(0);
      expect((await t.http().get(`/orgs/${orgId}/reviews`)).body.items[0].reply.text).toBe('Obrigado pela avaliação.');
      expect((await t.http().get(`/orgs/${orgId}`)).body.claimed).toBe(false);
    });
  });
});
