import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createTestApp, insertOrg, resetDb, TestCtx } from '../helpers';

/** Search Console e Google Analytics: URLs reais, sitemap, robots e IDs injetados no arranque (sem rebuild). */
describe('SEO e medição', () => {
  let t: TestCtx;
  const env = { ...process.env };
  beforeAll(async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pj-web-'));
    writeFileSync(join(dir, 'index.html'), '<!doctype html><html lang="pt-PT"><head><title>PeekJob</title><!--pj:head--></head><body><div id="root"></div></body></html>');
    process.env.WEB_DIST = dir;
    process.env.WEB_ORIGIN = 'https://peekjob.pt';
    t = await createTestApp();
  });
  afterAll(async () => {
    process.env = env;
    await t.pool.end();
    await t.app.close();
  });
  beforeEach(async () => {
    await resetDb(t);
    process.env.GA_MEASUREMENT_ID = 'G-TEST123';
    process.env.GSC_VERIFICATION = 'abc_DEF-123';
  });

  const html = (path: string) => t.http().get(path).set('accept', 'text/html,application/xhtml+xml,*/*;q=0.8');

  it('injeta a verificação do Search Console e o ID do Analytics no index', async () => {
    const res = await html('/').expect(200);
    expect(res.text).toContain('<meta name="google-site-verification" content="abc_DEF-123">');
    expect(res.text).toContain('"gaId":"G-TEST123"');
    expect(res.headers['cache-control']).toMatch(/no-cache/);
  });

  it('recusa valores inválidos (não injeta nada estranho no HTML)', async () => {
    process.env.GA_MEASUREMENT_ID = 'G-X"></script><script>alert(1)';
    process.env.GSC_VERIFICATION = '"><b>';
    const res = await html('/').expect(200);
    expect(res.text).not.toContain('alert(1)');
    expect(res.text).not.toContain('<b>');
    expect(res.text).not.toContain('google-site-verification');
  });

  it('URLs da web sem # abrem a aplicação (navegação do browser)', async () => {
    const res = await html('/org/3f2a/salarios').expect(200);
    expect(res.text).toContain('<div id="root">');
    expect(res.text).toContain('"gaId":"G-TEST123"');
  });

  it('caminhos que não existem: a aplicação com 404 (sem "soft 404" no Search Console)', async () => {
    const res = await html('/nao-existe').expect(404);
    expect(res.text).toContain('<div id="root">');
  });

  it('pedidos da API (fetch) continuam a receber JSON', async () => {
    await t.http().get('/orgs').set('accept', '*/*').expect(200).expect('content-type', /json/);
    await t.http().get('/org/x').set('accept', 'application/json').expect(404);
  });

  it('robots.txt fecha as páginas pessoais e aponta o sitemap', async () => {
    const res = await t.http().get('/robots.txt').expect(200).expect('content-type', /text\/plain/);
    for (const p of ['/avaliar', '/perfil', '/apoio', '/guardadas', '/entrar', '/painel']) expect(res.text).toContain(`Disallow: ${p}`);
    expect(res.text).toContain('Sitemap: https://peekjob.pt/sitemap.xml');
  });

  it('sitemap.xml tem as páginas públicas e só as organizações ativas', async () => {
    const active = await insertOrg(t.pool, { name: 'Padaria da Ribeira' });
    const pending = await insertOrg(t.pool, { name: 'Café Novo', status: 'pending' });
    const res = await t.http().get('/sitemap.xml').expect(200).expect('content-type', /xml/);
    expect(res.text).toContain('<loc>https://peekjob.pt/</loc>');
    expect(res.text).toContain('<loc>https://peekjob.pt/ranking</loc>');
    expect(res.text).toContain(`<loc>https://peekjob.pt/org/${active}</loc>`);
    expect(res.text).not.toContain(pending);
    expect(res.text).not.toContain('/avaliar');
  });

  it('sitemap.xml indica a versão em inglês de cada página (hreflang)', async () => {
    const res = await t.http().get('/sitemap.xml').expect(200);
    expect(res.text).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(res.text).toContain('<xhtml:link rel="alternate" hreflang="pt-PT" href="https://peekjob.pt/ranking"/>');
    expect(res.text).toContain('<xhtml:link rel="alternate" hreflang="en" href="https://peekjob.pt/ranking?lang=en"/>');
    expect(res.text).toContain('<xhtml:link rel="alternate" hreflang="x-default" href="https://peekjob.pt/ranking"/>');
  });

  it('com ?lang=en o HTML já sai com lang="en-GB" (antes do JavaScript)', async () => {
    const res = await html('/sobre?lang=en').expect(200);
    expect(res.text).toContain('<html lang="en-GB"');
    const pt = await html('/sobre').expect(200);
    expect(pt.text).toContain('<html lang="pt-PT"');
  });
});
