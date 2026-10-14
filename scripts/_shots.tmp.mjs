// Fotografa os cenários visuais com as fontes reais (revisão de design; não é o teste visual)
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync, readFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { SCENARIOS, STATE, STORAGE_KEY } from '../e2e/visual/scenarios.mjs';
const [dir, out, fonts, only] = process.argv.slice(2);
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const srv = createServer((q, r) => { const f = join(dir, q.url.split('?')[0].replace(/\/$/, '/index.html')); if (!existsSync(f) || statSync(f).isDirectory()) return r.writeHead(404).end(); r.writeHead(200, { 'content-type': T[extname(f)] ?? 'application/octet-stream' }); createReadStream(f).pipe(r); }).listen(0);
const port = srv.address().port;
const face = (fam, file, w) => `@font-face{font-family:'${fam}';font-weight:${w};src:url(data:font/woff2;base64,${readFileSync(join(fonts, file)).toString('base64')}) format('woff2')}`;
const FONTS = [300, 400, 500, 600, 700].map((w) => face('Jost', `fontsource-jost-5.1.1/files/jost-latin-${w}-normal.woff2`, w)).join('') + [300, 400, 500, 600].map((w) => face('Geist', `fontsource-geist-sans-5.1.0/files/geist-sans-latin-${w}-normal.woff2`, w)).join('');
const names = only ? new Set(only.split(',')) : null;
const b = await chromium.launch();
for (const [tag, vp, mobile] of [['m', { width: 390, height: 844 }, true], ['d', { width: 1440, height: 900 }, false]]) {
  const ctx = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, locale: 'pt-PT', reducedMotion: 'reduce' });
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  for (const s of SCENARIOS) {
    if (names && !names.has(s.name)) continue;
    if (s.mobileOnly && !mobile) continue;
    const p = await ctx.newPage();
    await p.addInitScript(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [STORAGE_KEY, { ...STATE, ...(s.state ?? {}) }]);
    await p.addInitScript((css) => document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = css; document.head.append(st); }), FONTS);
    await p.goto(`http://localhost:${port}/#${s.path}`, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(300);
    try { if (s.run) await s.run(p); } catch {}
    await p.waitForTimeout(400);
    await p.screenshot({ path: join(out, `${tag}-${s.name}.png`), fullPage: true });
    await p.close();
  }
  await ctx.close();
}
await b.close(); srv.close();
