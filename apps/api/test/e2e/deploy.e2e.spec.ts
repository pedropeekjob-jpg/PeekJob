import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createTestApp, insertOrg, resetDb, TestCtx } from '../helpers';

/** Em produção a API serve também a web (mesma origem: o cookie de sessão funciona no Safari/iPhone). */
describe('Publicação', () => {
  describe('com WEB_DIST', () => {
    let t: TestCtx;
    beforeAll(async () => {
      const dir = mkdtempSync(join(tmpdir(), 'pj-web-'));
      mkdirSync(join(dir, 'assets'));
      writeFileSync(join(dir, 'index.html'), '<!doctype html><title>PeekJob</title><div id="root"></div>');
      writeFileSync(join(dir, 'assets', 'app-abc123.js'), 'console.log(1)');
      process.env.WEB_DIST = dir;
      t = await createTestApp();
    });
    afterAll(async () => {
      delete process.env.WEB_DIST;
      await t.pool.end();
      await t.app.close();
    });
    beforeEach(() => resetDb(t));

    it('serve a web na raiz, sem cache no index', async () => {
      const res = await t.http().get('/').expect(200);
      expect(res.text).toContain('<title>PeekJob</title>');
      expect(res.headers['cache-control']).toMatch(/no-cache/);
    });

    it('serve os ficheiros da build com cache longa', async () => {
      const res = await t.http().get('/assets/app-abc123.js').expect(200);
      expect(res.headers['cache-control']).toMatch(/immutable/);
    });

    it('as rotas da API continuam a responder JSON', async () => {
      {
        const res = await t.http().get('/health');
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/json/);
      }
      {
        const res = await t.http().get('/orgs');
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/json/);
      }
    });
  });

  describe('sem WEB_DIST', () => {
    let t: TestCtx;
    beforeAll(async () => {
      t = await createTestApp();
    });
    afterAll(async () => {
      await t.pool.end();
      await t.app.close();
    });
    beforeEach(() => resetDb(t));

    it('não serve a web (só API)', async () => {
      expect((await t.http().get('/')).status).toBe(404);
    });

    it('se o envio do email falhar, responde 503 com uma mensagem clara', async () => {
      t.mailer.failNext = true;
      const res = await t.http().post('/auth/magic-link').send({ email: 'a@teste.pt' }).expect(503);
      expect(res.body.message).toMatch(/email/i);
      expect((await t.http().post('/auth/magic-link').send({ email: 'a@teste.pt' })).status).toBe(202);
    });

    it('o mesmo para o código de verificação (503)', async () => {
      const me = await t.login('ana');
      const orgId = await insertOrg(t.pool, { name: 'Oficina Sete' });
      t.mailer.failNext = true;
      const res = await t.http().post('/verifications/email').set(me).send({ orgId, email: 'ana@oficina7.pt' }).expect(503);
      expect(res.body.message).toMatch(/email/i);
    });
  });
});
