import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createTestApp, resetDb, TestCtx } from '../helpers';

/**
 * Dois ambientes a partir da mesma imagem:
 * - UAT (APP_ENV=uat): fechado com palavra-passe, fora do Google, faixa "ambiente de testes", emails com [UAT].
 * - Produção (APP_ENV=production): aberto, indexável.
 */
const webDir = () => {
  const dir = mkdtempSync(join(tmpdir(), 'pj-web-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html><html lang="pt-PT"><head><title>PeekJob</title><!--pj:head--></head><body><div id="root"></div></body></html>');
  return dir;
};
const basic = (u: string, p: string) => `Basic ${Buffer.from(`${u}:${p}`).toString('base64')}`;
const ENV_KEYS = ['APP_ENV', 'BASIC_AUTH_USER', 'BASIC_AUTH_PASSWORD', 'WEB_DIST'];

describe('Ambientes', () => {
  const saved: Record<string, string | undefined> = {};
  beforeAll(() => ENV_KEYS.forEach((k) => (saved[k] = process.env[k])));
  afterEach(() => ENV_KEYS.forEach((k) => (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k]))));

  describe('UAT', () => {
    let t: TestCtx;
    const auth = basic('cliente', 'segredo-uat');
    beforeAll(async () => {
      process.env.APP_ENV = 'uat';
      process.env.BASIC_AUTH_USER = 'cliente';
      process.env.BASIC_AUTH_PASSWORD = 'segredo-uat';
      process.env.WEB_DIST = webDir();
      t = await createTestApp();
    });
    afterAll(async () => {
      await t.pool.end();
      await t.app.close();
    });
    beforeEach(async () => {
      process.env.APP_ENV = 'uat';
      await resetDb(t);
    });

    it('pede palavra-passe para a web e para a API (401 com WWW-Authenticate)', async () => {
      const res = await t.http().get('/').set('accept', 'text/html').expect(401);
      expect(res.headers['www-authenticate']).toMatch(/^Basic realm="PeekJob UAT"/);
      await t.http().get('/orgs').expect(401);
      await t.http().get('/').set('authorization', basic('cliente', 'errada')).expect(401);
    });

    it('com a palavra-passe certa funciona normalmente', async () => {
      await t.http().get('/orgs').set('authorization', auth).expect(200).expect('content-type', /json/);
      await t.http().get('/').set('accept', 'text/html').set('authorization', auth).expect(200);
      const cfg = await t.http().get('/pj-config.js').set('authorization', auth).expect(200);
      expect(cfg.text).toContain('"env":"uat"');
    });

    it('o health check do alojamento não precisa de palavra-passe', async () => {
      await t.http().get('/health').expect(200);
    });

    it('fica fora do Google: X-Robots-Tag, robots.txt fechado e sem sitemap', async () => {
      const res = await t.http().get('/orgs').set('authorization', auth).expect(200);
      expect(res.headers['x-robots-tag']).toBe('noindex, nofollow');
      const robots = await t.http().get('/robots.txt').set('authorization', auth).expect(200);
      expect(robots.text).toBe('User-agent: *\nDisallow: /\n');
      await t.http().get('/sitemap.xml').set('authorization', auth).expect(404);
    });

    it('os emails levam [UAT] no assunto', async () => {
      await t.http().post('/auth/magic-link').set('authorization', auth).send({ email: 'teste@gmail.com' }).expect(202);
      expect(t.mailer.outbox.at(-1)!.subject).toBe('[UAT] O teu link de acesso à PeekJob');
    });
  });

  describe('UAT sem palavra-passe configurada', () => {
    it('recusa arrancar (nunca abrir a UAT ao público por engano)', async () => {
      process.env.APP_ENV = 'uat';
      delete process.env.BASIC_AUTH_USER;
      delete process.env.BASIC_AUTH_PASSWORD;
      await expect(createTestApp()).rejects.toThrow(/BASIC_AUTH_USER/);
    });
  });

  describe('Produção', () => {
    let t: TestCtx;
    beforeAll(async () => {
      process.env.APP_ENV = 'production';
      process.env.WEB_DIST = webDir();
      t = await createTestApp();
    });
    afterAll(async () => {
      await t.pool.end();
      await t.app.close();
    });
    beforeEach(async () => {
      process.env.APP_ENV = 'production';
      await resetDb(t);
    });

    it('aberta, indexável, sem faixa de testes e emails sem prefixo', async () => {
      const res = await t.http().get('/').set('accept', 'text/html').expect(200);
      expect(res.headers['x-robots-tag']).toBeUndefined();
      expect(res.text).not.toContain('"env"');
      await t.http().get('/sitemap.xml').expect(200);
      await t.http().post('/auth/magic-link').send({ email: 'teste@gmail.com' }).expect(202);
      expect(t.mailer.outbox.at(-1)!.subject).toBe('O teu link de acesso à PeekJob');
    });
  });
});
