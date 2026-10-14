import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync, readFileSync } from 'node:fs';
import { join, extname } from 'node:path';
const [dir, out, fonts] = process.argv.slice(2);
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const srv = createServer((q, r) => { const f = join(dir, q.url.split('?')[0].replace(/\/$/, '/index.html')); if (!existsSync(f) || statSync(f).isDirectory()) return r.writeHead(404).end(); r.writeHead(200, { 'content-type': T[extname(f)] ?? 'application/octet-stream' }); createReadStream(f).pipe(r); }).listen(0);
const port = srv.address().port;
const face = (fam, file, w) => `@font-face{font-family:'${fam}';font-weight:${w};src:url(data:font/woff2;base64,${readFileSync(join(fonts, file)).toString('base64')}) format('woff2')}`;
const FONTS = [400, 500, 600, 700].map((w) => face('Jost', `fontsource-jost-5.1.1/files/jost-latin-${w}-normal.woff2`, w)).join('') + [400, 500, 600].map((w) => face('Geist', `fontsource-geist-sans-5.1.0/files/geist-sans-latin-${w}-normal.woff2`, w)).join('');
const V = {
  atual: '',
  A: `[class*="_home_"]{--job-bg:#00a9af;--mk-bot-bg:#00a9af;--mk-bot-accent:#ffffff;--mk-bot-road:rgba(1,11,19,.25);--job-glow:rgba(255,255,255,.22);--peek-glow:rgba(0,169,175,.18)} [class*="_job_"]{--label:#010b13}`,
  B: `[class*="_home_"]{--peek-bg:#c4ebeb;--job-bg:#e4d6f1;--mk-top-bg:#c4ebeb;--mk-bot-bg:#e4d6f1;--mk-bot-road:#cdb6e2;--mk-top-road:rgba(0,88,93,.25);--peek-glow:rgba(255,255,255,.5);--job-glow:rgba(255,255,255,.45)} [class*="_job_"]{--label:#4e2270}`,
  C: `[class*="_home_"]{--peek-bg:#a8e1e2;--mk-top-bg:#a8e1e2;--mk-top-road:rgba(0,88,93,.3);--job-bg:#00585d;--job-fg:#ffffff;--mk-bot-bg:#00585d;--mk-bot-ink:#ffffff;--mk-bot-accent:#5fd0d4;--mk-bot-road:rgba(255,255,255,.2);--peek-glow:rgba(255,255,255,.45);--job-glow:rgba(95,208,212,.25)} [class*="_job_"]{--label:#ffffff}`,
};
const b = await chromium.launch();
for (const [tag, vp, mobile] of [['m', { width: 390, height: 760 }, true], ['d', { width: 1440, height: 860 }, false]]) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile, locale: 'pt-PT', reducedMotion: 'reduce' });
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  for (const [name, vars] of Object.entries(V)) {
    const p = await ctx.newPage();
    const css = FONTS + vars;
    await p.addInitScript((c) => document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = c; document.head.append(st); }), css);
    await p.goto(`http://localhost:${port}/#/`, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600);
    await p.screenshot({ path: join(out, `${tag}-${name}.png`) });
    await p.close();
  }
  await ctx.close();
}
await b.close(); srv.close();
