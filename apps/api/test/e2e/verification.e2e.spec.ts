import { createTestApp, goodReview, insertOrg, makePdf, resetDb, TestCtx } from '../helpers';

/**
 * Verificação anónima: prova-se que se trabalha lá, mas guarda-se só o "sim".
 * Nem o email de trabalho, nem o ficheiro, nem o NIF de quem avalia ficam guardados.
 */
describe('Verificação anónima', () => {
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
    orgId = await insertOrg(t.pool, { name: 'Padaria Ribeira', nif: '501442600' });
  });

  const dump = async () =>
    JSON.stringify([
      (await t.pool.query('SELECT * FROM verifications')).rows,
      (await t.pool.query('SELECT * FROM verification_codes')).rows,
      (await t.pool.query('SELECT * FROM reviews')).rows,
    ]);

  describe('por email de trabalho', () => {
    const work = 'joana.silva@padariaribeira.pt';

    it('exige sessão', async () => {
      await t.http().post('/verifications/email').send({ orgId, email: work }).expect(401);
    });

    it('envia um código de 6 dígitos para o email de trabalho e confirma', async () => {
      const me = await t.login('u1');
      await t.http().post('/verifications/email').set(me).send({ orgId, email: work }).expect(202);
      const code = t.mailer.lastCodeFor(work);
      const res = await t.http().post('/verifications/email/confirm').set(me).send({ orgId, code }).expect(200);
      expect(res.body).toEqual({ verified: true, method: 'email' });

      const mine = await t.http().get('/me/verifications').set(me).expect(200);
      expect(mine.body.orgIds).toEqual([orgId]);
    });

    it('não guarda o email de trabalho nem o código em claro', async () => {
      const me = await t.login('u1');
      await t.http().post('/verifications/email').set(me).send({ orgId, email: work }).expect(202);
      const code = t.mailer.lastCodeFor(work);
      expect(await dump()).not.toMatch(/joana|padariaribeira|@/);
      expect(await dump()).not.toContain(code);
      await t.http().post('/verifications/email/confirm').set(me).send({ orgId, code }).expect(200);
      expect(await dump()).not.toMatch(/joana|padariaribeira|@/);
    });

    it('código errado: 400; ao fim de 5 tentativas o código deixa de valer (429)', async () => {
      const me = await t.login('u1');
      await t.http().post('/verifications/email').set(me).send({ orgId, email: work }).expect(202);
      const code = t.mailer.lastCodeFor(work);
      const wrong = code === '000000' ? '111111' : '000000';
      for (let i = 0; i < 5; i++) {
        await t.http().post('/verifications/email/confirm').set(me).send({ orgId, code: wrong }).expect(400);
      }
      await t.http().post('/verifications/email/confirm').set(me).send({ orgId, code }).expect(429);
    });

    it('código expirado (10 minutos): 400', async () => {
      const me = await t.login('u1');
      await t.http().post('/verifications/email').set(me).send({ orgId, email: work }).expect(202);
      await t.pool.query(`UPDATE verification_codes SET expires_at = now() - interval '1 second'`);
      await t.http().post('/verifications/email/confirm').set(me).send({ orgId, code: t.mailer.lastCodeFor(work) }).expect(400);
    });

    it('se a organização tiver domínios conhecidos, o email tem de ser de um deles (422)', async () => {
      await t.pool.query(`INSERT INTO org_domains (org_id, domain) VALUES ($1, 'padariaribeira.pt')`, [orgId]);
      const me = await t.login('u1');
      const res = await t.http().post('/verifications/email').set(me).send({ orgId, email: 'joana@gmail.com' }).expect(422);
      expect(res.body.code).toBe('DOMAIN_MISMATCH');
      await t.http().post('/verifications/email').set(me).send({ orgId, email: work }).expect(202);
    });

    it('404 para organização inexistente', async () => {
      const me = await t.login('u1');
      await t.http().post('/verifications/email').set(me).send({ orgId: '00000000-0000-0000-0000-000000000000', email: work }).expect(404);
    });
  });

  describe('por recibo ou contrato (PDF)', () => {
    const upload = (cookie: { Cookie: string }, pdf: Buffer, id = orgId, type = "application/pdf") =>
      t.http().post('/verifications/document').set(cookie).field('orgId', id).attach('file', pdf, { filename: 'recibo.pdf', contentType: type });

    it('verifica quando o documento contém o NIF da organização', async () => {
      const me = await t.login('u1');
      const pdf = await makePdf(['Recibo de vencimento — setembro', 'Entidade patronal: Padaria Ribeira, Lda', 'NIF 501 442 600', 'Trabalhador: Joana Silva, NIF 123456789']);
      const res = await upload(me, pdf).expect(200);
      expect(res.body).toEqual({ verified: true, method: 'document' });
    });

    it('não guarda o ficheiro, o nome nem o NIF de quem avalia', async () => {
      const me = await t.login('u1');
      const pdf = await makePdf(['Padaria Ribeira NIF 501442600', 'Trabalhador: Joana Silva, NIF 123456789']);
      await upload(me, pdf).expect(200);
      expect(await dump()).not.toMatch(/Joana|123456789|recibo/i);
    });

    it('recusa quando o NIF da organização não aparece (422)', async () => {
      const me = await t.login('u1');
      const pdf = await makePdf(['Outra Empresa, Lda', 'NIF 500000000']);
      const res = await upload(me, pdf).expect(422);
      expect(res.body.code).toBe('NIF_NOT_FOUND');
    });

    it('pede o método por email se a organização ainda não tiver NIF (422)', async () => {
      const semNif = await insertOrg(t.pool, { name: 'Café do Largo' });
      const me = await t.login('u1');
      const res = await upload(me, await makePdf(['NIF 501442600']), semNif).expect(422);
      expect(res.body.code).toBe('ORG_WITHOUT_NIF');
    });

    it('só aceita PDF (415)', async () => {
      const me = await t.login('u1');
      await upload(me, Buffer.from('GIF89a'), orgId, 'image/gif').expect(415);
    });

    it('confirma o NIF da organização e ativa-a se estava pendente', async () => {
      const pendente = await insertOrg(t.pool, { name: 'Oficina Sete', status: 'pending', nif: '500000000' });
      const me = await t.login('u1');
      await upload(me, await makePdf(['Oficina Sete NIF 500000000']), pendente).expect(200);
      const org = await t.pool.query('SELECT status, nif_verified FROM organizations WHERE id = $1', [pendente]);
      expect(org.rows[0]).toEqual({ status: 'active', nif_verified: true });
    });
  });

  describe('avaliações verificadas', () => {
    it('uma avaliação feita antes passa a verificada depois da verificação', async () => {
      const me = await t.login('u1');
      await t.http().post(`/orgs/${orgId}/reviews`).set(me).send(goodReview).expect(201);
      await t.http().post('/verifications/document').set(me).field('orgId', orgId)
        .attach('file', await makePdf(['NIF 501442600']), { filename: 'r.pdf', contentType: 'application/pdf' }).expect(200);
      const res = await t.http().get(`/orgs/${orgId}/reviews`).expect(200);
      expect(res.body.items[0].verified).toBe(true);
    });

    it('uma avaliação feita depois já nasce verificada', async () => {
      const me = await t.login('u1');
      await t.http().post('/verifications/document').set(me).field('orgId', orgId)
        .attach('file', await makePdf(['NIF 501442600']), { filename: 'r.pdf', contentType: 'application/pdf' }).expect(200);
      const res = await t.http().post(`/orgs/${orgId}/reviews`).set(me).send(goodReview).expect(201);
      expect(res.body.review.verified).toBe(true);
    });
  });
});
