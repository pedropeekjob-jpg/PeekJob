import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createTestApp, resetDb, TestCtx } from '../helpers';

/**
 * Segurança antes da UAT: cabeçalhos (CSP, HSTS, iframes), limites por IP,
 * tamanho máximo dos pedidos e pedidos de outros sites (Origin).
 */
describe('Segurança', () => {
  let t: TestCtx;
  const env = { ...process.env };
  beforeAll(async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pj-web-'));
    mkdirSync(join(dir, 'assets'));
    writeFileSync(join(dir, 'index.html'), '<!doctype html><html lang="pt-PT"><head><title>PeekJob</title><!--pj:head--></head><body><div id="root"></div></body></html>');
    writeFileSync(join(dir, 'assets', 'app-abc.js'), 'console.log(1)');
    process.env.WEB_DIST = dir;
    process.env.GA_MEASUREMENT_ID = 'G-TEST123';
    t = await createTestApp();
  });
  afterAll(async () => {
    process.env = env;
    await t.pool.end();
    await t.app.close();
  });
  beforeEach(() => resetDb(t));

  const html = (path = '/') => t.http().get(path).set('accept', 'text/html');

  describe('cabeçalhos', () => {
    it('em todas as respostas: sem sniffing, sem iframes, referrer curto, sem X-Powered-By', async () => {
      for (const res of [await t.http().get('/health'), await html('/'), await t.http().get('/assets/app-abc.js')]) {
        expect(res.headers['x-content-type-options']).toBe('nosniff');
        expect(res.headers['x-frame-options']).toBe('DENY');
        expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
        expect(res.headers['permissions-policy']).toContain('camera=()');
        expect(res.headers['permissions-policy']).toContain('geolocation=()');
        expect(res.headers['cross-origin-opener-policy']).toBe('same-origin');
        expect(res.headers['x-powered-by']).toBeUndefined();
      }
    });

    it('a web tem uma CSP estrita: só scripts do próprio site e do Google Analytics, sem inline', async () => {
      const csp = (await html('/').expect(200)).headers['content-security-policy'] as string;
      const dir = (name: string) => csp.split(';').map((s) => s.trim()).find((s) => s.startsWith(name + ' ')) ?? '';
      expect(dir('default-src')).toBe("default-src 'self'");
      expect(dir('script-src')).toBe("script-src 'self' https://www.googletagmanager.com");
      expect(dir('connect-src')).toContain('https://*.google-analytics.com');
      expect(dir('font-src')).toContain('https://fonts.gstatic.com');
      expect(dir('frame-ancestors')).toBe("frame-ancestors 'none'");
      expect(dir('object-src')).toBe("object-src 'none'");
      expect(dir('base-uri')).toBe("base-uri 'self'");
      expect(dir('form-action')).toBe("form-action 'self'");
    });

    it('o index não tem scripts inline: a configuração vem de /pj-config.js', async () => {
      const page = await html('/').expect(200);
      expect(page.text).toContain('<script src="/pj-config.js"></script>');
      expect(page.text).not.toMatch(/<script>/);
      const cfg = await t.http().get('/pj-config.js').expect(200);
      expect(cfg.headers['content-type']).toMatch(/javascript/);
      expect(cfg.headers['cache-control']).toMatch(/no-cache/);
      expect(cfg.text).toBe('window.__PJ__={"gaId":"G-TEST123"};');
    });

    it('as respostas da API não carregam nada (CSP mínima)', async () => {
      const res = await t.http().get('/health').expect(200);
      expect(res.headers['content-security-policy']).toBe("default-src 'none'; frame-ancestors 'none'");
    });

    it('HSTS só em produção (na UAT e em local não)', async () => {
      expect((await t.http().get('/health')).headers['strict-transport-security']).toBeUndefined();
    });
  });

  describe('pedidos de outros sites', () => {
    it('recusa POST com Origin de outro site (403), aceita o próprio e clientes sem Origin', async () => {
      expect((await t.http().post('/auth/magic-link').set('origin', 'https://evil.example').send({ email: 'a@teste.pt' })).status).toBe(403);
      expect((await t.http().post('/auth/magic-link').set('origin', 'http://localhost:5173').send({ email: 'b@teste.pt' })).status).toBe(202);
      expect((await t.http().post('/auth/magic-link').send({ email: 'c@teste.pt' })).status).toBe(202);
    });

    it('GET de outros sites continua permitido (páginas públicas e partilhas)', async () => {
      expect((await t.http().get('/orgs').set('origin', 'https://evil.example')).status).toBe(200);
    });
  });

  describe('tamanho dos pedidos', () => {
    it('recusa JSON acima de 64 KB (413)', async () => {
      expect((await t.http().post('/reviews/rewrite').send({ text: 'a'.repeat(70 * 1024) })).status).toBe(413);
    });
  });

  describe('limites por IP', () => {
    it('link de entrada: no máximo 10 por hora a partir do mesmo IP, mesmo para emails diferentes (429 com Retry-After)', async () => {
      for (let i = 0; i < 10; i++) expect((await t.http().post('/auth/magic-link').send({ email: `p${i}@teste.pt` })).status).toBe(202);
      const res = await t.http().post('/auth/magic-link').send({ email: 'p10@teste.pt' }).expect(429);
      expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
      expect(res.body.message).toMatch(/Demasiados pedidos/);
    });

    it('trocar o token de entrada: no máximo 30 tentativas em 15 minutos', async () => {
      for (let i = 0; i < 30; i++) await t.http().post('/auth/verify').send({ token: 'x'.repeat(43) }).expect((r) => expect(r.status).not.toBe(429));
      expect((await t.http().post('/auth/verify').send({ token: 'x'.repeat(43) })).status).toBe(429);
    });

    it('pesquisa: no máximo 120 por minuto (contra recolha automática)', async () => {
      for (let i = 0; i < 120; i++) expect((await t.http().get('/orgs/search').query({ q: 'a' + i })).status).toBe(200);
      expect((await t.http().get('/orgs/search').query({ q: 'b' })).status).toBe(429);
    });

    it('o health check do alojamento nunca é limitado', async () => {
      for (let i = 0; i < 5; i++) expect((await t.http().get('/health')).status).toBe(200);
    });
  });
});
