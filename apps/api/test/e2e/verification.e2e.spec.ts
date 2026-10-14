import { createTestApp, makePhoto, goodReview, insertOrg, makePdf, resetDb, TestCtx } from '../helpers';

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
      expect((await t.http().post('/verifications/email').send({ orgId, email: work })).status).toBe(401);
    });

    it('envia o código em inglês quando lang=en', async () => {
    const me = await t.login('ines');
    const orgId = await insertOrg(t.pool, { name: 'Oficina Sete' });
    expect((await t.http().post('/verifications/email').set(me).send({ orgId, email: 'ines@oficina7.pt', lang: 'en' })).status).toBe(202);
    const mail = t.mailer.outbox.at(-1)!;
    expect(mail.subject).toBe('Your PeekJob verification code');
    expect(mail.text).toMatch(/^Your code is \d{6}\. It confirms that you work at Oficina Sete and is valid for 10 minutes\./);
    expect(mail.text).toContain("We don't store this email.");
  });

  it('envia um código de 6 dígitos para o email de trabalho e confirma', async () => {
      const me = await t.login('u1');
      expect((await t.http().post('/verifications/email').set(me).send({ orgId, email: work })).status).toBe(202);
      const code = t.mailer.lastCodeFor(work);
      const res = await t.http().post('/verifications/email/confirm').set(me).send({ orgId, code }).expect(200);
      expect(res.body).toEqual({ verified: true, method: 'email' });

      const mine = await t.http().get('/me/verifications').set(me).expect(200);
      expect(mine.body.orgIds).toEqual([orgId]);
    });

    it('não guarda o email de trabalho nem o código em claro', async () => {
      const me = await t.login('u1');
      expect((await t.http().post('/verifications/email').set(me).send({ orgId, email: work })).status).toBe(202);
      const code = t.mailer.lastCodeFor(work);
      expect(await dump()).not.toMatch(/joana|padariaribeira|@/);
      expect(await dump()).not.toContain(code);
      expect((await t.http().post('/verifications/email/confirm').set(me).send({ orgId, code })).status).toBe(200);
      expect(await dump()).not.toMatch(/joana|padariaribeira|@/);
    });

    it('código errado: 400; ao fim de 5 tentativas o código deixa de valer (429)', async () => {
      const me = await t.login('u1');
      expect((await t.http().post('/verifications/email').set(me).send({ orgId, email: work })).status).toBe(202);
      const code = t.mailer.lastCodeFor(work);
      const wrong = code === '000000' ? '111111' : '000000';
      for (let i = 0; i < 5; i++) {
        expect((await t.http().post('/verifications/email/confirm').set(me).send({ orgId, code: wrong })).status).toBe(400);
      }
      expect((await t.http().post('/verifications/email/confirm').set(me).send({ orgId, code })).status).toBe(429);
    });

    it('código expirado (10 minutos): 400', async () => {
      const me = await t.login('u1');
      expect((await t.http().post('/verifications/email').set(me).send({ orgId, email: work })).status).toBe(202);
      await t.pool.query(`UPDATE verification_codes SET expires_at = now() - interval '1 second'`);
      expect((await t.http().post('/verifications/email/confirm').set(me).send({ orgId, code: t.mailer.lastCodeFor(work) })).status).toBe(400);
    });

    it('se a organização tiver domínios conhecidos, o email tem de ser de um deles (422)', async () => {
      await t.pool.query(`INSERT INTO org_domains (org_id, domain) VALUES ($1, 'padariaribeira.pt')`, [orgId]);
      const me = await t.login('u1');
      const res = await t.http().post('/verifications/email').set(me).send({ orgId, email: 'joana@gmail.com' }).expect(422);
      expect(res.body.code).toBe('DOMAIN_MISMATCH');
      expect((await t.http().post('/verifications/email').set(me).send({ orgId, email: work })).status).toBe(202);
    });

    it('404 para organização inexistente', async () => {
      const me = await t.login('u1');
      expect((await t.http().post('/verifications/email').set(me).send({ orgId: '00000000-0000-0000-0000-000000000000', email: work })).status).toBe(404);
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
      expect((await upload(me, pdf)).status).toBe(200);
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

    it('só aceita PDF ou fotografia JPG/PNG/WebP, e confirma pelo conteúdo, não pelo nome (415)', async () => {
      const me = await t.login('u1');
      const res = await upload(me, Buffer.from('GIF89a'), orgId, 'image/gif');
      expect(res.status).toBe(415);
      expect(res.body.message).toBe('Envia o recibo ou contrato em PDF ou numa fotografia (JPG, PNG ou WebP).');
      // diz que é JPEG mas não é
      expect((await upload(me, Buffer.from('isto não é uma imagem'), orgId, 'image/jpeg')).status).toBe(415);
    });

    it('confirma o NIF da organização e ativa-a se estava pendente', async () => {
      const pendente = await insertOrg(t.pool, { name: 'Oficina Sete', status: 'pending', nif: '500000000' });
      const me = await t.login('u1');
      expect((await upload(me, await makePdf(['Oficina Sete NIF 500000000']), pendente)).status).toBe(200);
      const org = await t.pool.query('SELECT status, nif_verified FROM organizations WHERE id = $1', [pendente]);
      expect(org.rows[0]).toEqual({ status: 'active', nif_verified: true });
    });
  });

  describe('por fotografia do recibo (OCR no servidor, só em memória)', () => {
    const photo = (cookie: { Cookie: string }, img: Buffer, type: string, id = orgId) =>
      t.http().post('/verifications/document').set(cookie).field('orgId', id).attach('file', img, { filename: 'IMG_2041.jpg', contentType: type });
    const RECIBO = ['RECIBO DE VENCIMENTO - SETEMBRO 2026', 'Padaria Ribeira, Lda', 'NIF 501 442 600', 'Trabalhador: Joana Silva', 'Contribuinte 123456789'];

    it('fotografia (JPEG, ligeiramente torta) com o NIF da organização: verificada', async () => {
      const me = await t.login('u1');
      const res = await photo(me, makePhoto(RECIBO), 'image/jpeg').expect(200);
      expect(res.body).toEqual({ verified: true, method: 'document' });
    }, 60000);

    it('PNG sem o NIF da organização: recusada (422) e nada fica guardado', async () => {
      const me = await t.login('u1');
      const res = await photo(me, makePhoto(['Outra Empresa, Lda', 'NIF 500000000', 'Trabalhador: Joana Silva'], 'image/png'), 'image/png').expect(422);
      expect(res.body.code).toBe('NIF_NOT_FOUND');
      expect(await dump()).not.toMatch(/Joana|IMG_2041/i);
    }, 60000);
  });

  describe('avaliações verificadas', () => {
    it('uma avaliação feita antes passa a verificada depois da verificação', async () => {
      const me = await t.login('u1');
      expect((await t.http().post(`/orgs/${orgId}/reviews`).set(me).send(goodReview)).status).toBe(201);
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
