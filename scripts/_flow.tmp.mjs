// Fotografa o fluxo de avaliar (telemóvel) numa build de demonstração, com as fontes reais
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync, readFileSync } from 'node:fs';
import { join, extname } from 'node:path';
const [dir, out, fonts, which] = process.argv.slice(2);
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const srv = createServer((q, r) => { const f = join(dir, q.url.split('?')[0].replace(/\/$/, '/index.html')); if (!existsSync(f) || statSync(f).isDirectory()) return r.writeHead(404).end(); r.writeHead(200, { 'content-type': T[extname(f)] ?? 'application/octet-stream' }); createReadStream(f).pipe(r); }).listen(0);
const port = srv.address().port;
const face = (fam, file, w) => `@font-face{font-family:'${fam}';font-weight:${w};src:url(data:font/woff2;base64,${readFileSync(join(fonts, file)).toString('base64')}) format('woff2')}`;
const FONTS = [300, 400, 500, 600, 700].map((w) => face('Jost', `fontsource-jost-5.1.1/files/jost-latin-${w}-normal.woff2`, w)).join('') + [300, 400, 500, 600].map((w) => face('Geist', `fontsource-geist-sans-5.1.0/files/geist-sans-latin-${w}-normal.woff2`, w)).join('');
const base = { prefs: ['respeito', 'salario', 'equilibrio'], onboarded: true };
const draft = { draft: { orgId: 'oficina-sete', locationId: null, scores: { ambiente: 4, salario: 3, respeito: 4 }, recommend: null, tags: [], text: '', verified: null } };
const pub = { lastPublished: 'novo-1', myReviews: [{ id: 'novo-1', orgId: 'oficina-sete', scores: { salario: 3, equilibrio: 3, respeito: 4, ambiente: 4, lideranca: 4, estabilidade: 3, progressao: 3, proposito: 4 }, avg: 3.5, recommend: true, tags: [], text: 'Texto.', when: 'agora', flagged: false }] };
const STEPS = {
  before: [
    ['1-inicio', '/?lado=avaliar', {}],
    ['2-escolher', '/avaliar', { draft: { orgId: null } }, async (p) => { await p.getByRole('searchbox').first().fill('oficina'); await p.waitForTimeout(700); }],
    ['3-local', '/avaliar?org=oficina-sete', {}],
    ['4-verificar', '/avaliar/verificar', draft],
    ['5-notas', '/avaliar/notas', draft],
    ['6-texto', '/avaliar/texto', draft],
    ['7-feito', '/avaliar/feito', pub],
  ],
  after: [
    ['1-inicio', '/?lado=avaliar', {}, async (p) => { await p.getByRole('searchbox').first().fill('oficina'); }],
    ['2-escolher', '/avaliar?q=oficina', { draft: { orgId: null } }, async (p) => { await p.waitForTimeout(700); }],
    ['3-notas', '/avaliar/notas', draft],
    ['4-feito', '/avaliar/feito', pub],
  ],
}[which];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-PT', reducedMotion: 'reduce' });
await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
for (const [name, path, state, run] of STEPS) {
  const p = await ctx.newPage();
  await p.addInitScript(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), ['peekjob-poc-v1', { ...base, ...state }]);
  await p.addInitScript((css) => document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = css; document.head.append(st); }), FONTS);
  await p.goto(`http://localhost:${port}/#${path}`, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(500);
  if (run) await run(p);
  await p.waitForTimeout(300);
  await p.screenshot({ path: join(out, `${which}-${name}.png`) });
  await p.close();
}
await b.close(); srv.close();
