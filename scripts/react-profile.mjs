#!/usr/bin/env node
/**
 * Mede o custo de render (React Profiler) antes e depois de um refactoring, nas mesmas interações.
 * Constrói a demonstração com o React de profiling no commit de referência e na versão atual, corre cada
 * interação várias vezes (CPU 4× mais lenta, como um telemóvel médio) e compara as medianas de:
 *   - commits: quantas vezes o React atualizou o ecrã;
 *   - componentes: quantos componentes voltaram a correr (os que o React saltou por memo não contam);
 *   - render (ms): tempo total de render (actualDuration da raiz).
 *
 *   npm run react:profile -- 78dcf8c            # referência = commit antes do refactoring
 *   PJ_RUNS=9 npm run react:profile -- 78dcf8c  # mais repetições
 *
 * Mede-se pelo gancho que o React chama a cada commit (o mesmo das React DevTools), sem tocar no código da app.
 */
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { createReadStream, existsSync, mkdtempSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { PROFILE_SCENARIOS } from '../e2e/visual/profile-scenarios.mjs';
import { STORAGE_KEY } from '../e2e/visual/scenarios.mjs';

const root = resolve(import.meta.dirname, '..');
const ref = process.argv[2] ?? 'origin/main';
const RUNS = Number(process.env.PJ_RUNS ?? 5);
const tmp = mkdtempSync(join(tmpdir(), 'pj-profile-'));
const sh = (cmd, args, cwd = root) => execFileSync(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim();

function build(webDir, outDir) {
  execFileSync('npx', ['vite', 'build', '--config', join(root, 'scripts/vite.profile.config.mjs'), '--outDir', outDir, '--emptyOutDir'], {
    cwd: webDir,
    stdio: 'ignore',
    env: { ...process.env, PJ_WEB_ROOT: webDir, VITE_API_URL: '', VITE_ROUTER: '', VITE_COVERAGE: '' },
  });
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
function serve(dir) {
  return new Promise((ok) => {
    const server = createServer((req, res) => {
      const file = join(dir, decodeURIComponent((req.url ?? '/').split('?')[0]).replace(/\/$/, '/index.html'));
      if (!file.startsWith(dir) || !existsSync(file) || statSync(file).isDirectory()) return res.writeHead(404).end();
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
      createReadStream(file).pipe(res);
    }).listen(0, () => ok({ server, port: server.address().port }));
  });
}

/** Gancho das DevTools: conta commits, componentes que correram e tempo de render enquanto __PJ.on */
function hook() {
  const s = { on: false, commits: 0, comps: 0, ms: 0, last: 0, profiling: false };
  window.__PJ = s;
  const COMPONENT = new Set([0, 1, 11, 14, 15]); // função, classe, forwardRef, memo
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    isDisabled: false,
    supportsFiber: true,
    renderers: new Map(),
    inject(r) {
      this.renderers.set(this.renderers.size + 1, r);
      return this.renderers.size;
    },
    onCommitFiberRoot(_id, fiberRoot) {
      const cur = fiberRoot.current;
      if (typeof cur.actualDuration === 'number') s.profiling = true;
      if (s.on) {
        let n = 0;
        const stack = [cur.child];
        while (stack.length) {
          let f = stack.pop();
          while (f) {
            // correu mesmo neste commit: começou depois do anterior e tem PerformedWork (1); um memo que saltou não tem
            if (COMPONENT.has(f.tag) && f.actualStartTime > s.last && (f.flags & 1) === 1) n++;
            if (f.child) stack.push(f.child);
            f = f.sibling;
          }
        }
        s.commits++;
        s.comps += n;
        s.ms += cur.actualDuration ?? 0;
      }
      s.last = performance.now();
    },
    onPostCommitFiberRoot() {},
    onCommitFiberUnmount() {},
    checkDCE() {},
  };
}

async function measure(port, ctx, sc) {
  const page = await ctx.newPage();
  await page.addInitScript(hook);
  if (sc.state) await page.addInitScript(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [STORAGE_KEY, sc.state]);
  const cdp = await ctx.newCDPSession(page);
  await page.goto(`http://localhost:${port}/#${sc.path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => (window.__PJ.on = true));
  await sc.run(page);
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => ({ ...window.__PJ }));
  await page.close();
  if (!r.profiling) throw new Error('A build não é de profiling (actualDuration em falta)');
  return r;
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const pct = (a, b) => (a ? `${b <= a ? '−' : '+'}${Math.round((Math.abs(b - a) / a) * 100)}%` : '—');

try {
  const sha = sh('git', ['rev-parse', '--short', ref]);
  const wt = join(tmp, 'ref');
  sh('git', ['worktree', 'add', '--detach', wt, sha]);
  symlinkSync(join(root, 'node_modules'), join(wt, 'node_modules'));
  if (existsSync(join(root, 'apps/web/node_modules'))) symlinkSync(join(root, 'apps/web/node_modules'), join(wt, 'apps/web/node_modules'));
  console.log(`Referência: ${ref} (${sha}) · ${RUNS} repetições · CPU 4×`);
  console.log('A construir as duas versões (React de profiling)…');
  build(join(wt, 'apps/web'), join(tmp, 'ref-dist'));
  build(join(root, 'apps/web'), join(tmp, 'cur-dist'));
  const servers = { ref: await serve(join(tmp, 'ref-dist')), cur: await serve(join(tmp, 'cur-dist')) };

  const browser = await chromium.launch();
  const rows = [];
  for (const [tag, viewport, isMobile] of [['telemóvel', { width: 390, height: 844 }, true], ['computador', { width: 1440, height: 900 }, false]]) {
    const ctx = await browser.newContext({ viewport, isMobile, reducedMotion: 'reduce', locale: 'pt-PT' });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    for (const sc of PROFILE_SCENARIOS) {
      if (sc.mobileOnly && !isMobile) continue;
      const res = { ref: [], cur: [] };
      for (let i = 0; i < RUNS; i++) {
        // alterna as versões para que o ruído da máquina as afete por igual
        for (const v of i % 2 ? ['cur', 'ref'] : ['ref', 'cur']) res[v].push(await measure(servers[v].port, ctx, sc));
      }
      const m = (v, k) => median(res[v].map((r) => r[k]));
      rows.push({ tag, name: sc.name, ref: { commits: m('ref', 'commits'), comps: m('ref', 'comps'), ms: m('ref', 'ms') }, cur: { commits: m('cur', 'commits'), comps: m('cur', 'comps'), ms: m('cur', 'ms') } });
      const r = rows.at(-1);
      console.log(`${tag.padEnd(10)} ${sc.name.padEnd(46)} commits ${r.ref.commits}→${r.cur.commits} · componentes ${r.ref.comps}→${r.cur.comps} (${pct(r.ref.comps, r.cur.comps)}) · render ${r.ref.ms.toFixed(1)}→${r.cur.ms.toFixed(1)} ms (${pct(r.ref.ms, r.cur.ms)})`);
    }
    await ctx.close();
  }
  await browser.close();
  Object.values(servers).forEach((s) => s.server.close());
  writeFileSync(join(root, 'react-profile.json'), JSON.stringify({ ref: sha, runs: RUNS, cpuThrottle: 4, rows }, null, 2));
  console.log('\nResultados em react-profile.json');
} finally {
  try {
    sh('git', ['worktree', 'remove', '--force', join(tmp, 'ref')]);
  } catch {
    /* já removida */
  }
  rmSync(tmp, { recursive: true, force: true });
}
