#!/usr/bin/env node
/**
 * Comparação visual antes/depois de um refactoring: constrói a demonstração no commit de referência e na versão
 * atual, fotografa os mesmos ecrãs e estados (telemóvel e computador) e compara píxel a píxel.
 *
 *   npm run visual:compare                 # contra origin/main
 *   npm run visual:compare -- e40436c      # contra um commit
 *
 * Relatório em visual-report/ (atual, referência e diferenças). Termina com erro se algum ecrã mudar.
 * As fontes do Google são bloqueadas nas duas versões (resultado igual com ou sem rede).
 */
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { SCENARIOS, STATE, STORAGE_KEY } from '../e2e/visual/scenarios.mjs';

const root = resolve(import.meta.dirname, '..');
const ref = process.argv[2] ?? 'origin/main';
const out = join(root, 'visual-report');
const tmp = mkdtempSync(join(tmpdir(), 'pj-visual-'));
const sh = (cmd, args, cwd = root) => execFileSync(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim();

function buildDemo(webDir, outDir) {
  execFileSync('npx', ['vite', 'build', '--outDir', outDir, '--emptyOutDir'], { cwd: webDir, stdio: 'ignore', env: { ...process.env, VITE_API_URL: '', VITE_ROUTER: '', VITE_COVERAGE: '' } });
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
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

async function shoot(port, dir) {
  mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch();
  for (const [tag, viewport, isMobile] of [['m', { width: 390, height: 844 }, true], ['d', { width: 1440, height: 900 }, false]]) {
    const ctx = await browser.newContext({ viewport, isMobile, reducedMotion: 'reduce', locale: 'pt-PT' });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    for (const s of SCENARIOS) {
      if (s.mobileOnly && tag === 'd') continue;
      const page = await ctx.newPage();
      await page.addInitScript(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [STORAGE_KEY, STATE]);
      await page.goto(`http://localhost:${port}/#${s.path}`);
      await page.waitForTimeout(600);
      if (s.run) await s.run(page);
      await page.waitForTimeout(400);
      await page.mouse.move(0, 0);
      await page.screenshot({ path: join(dir, `${tag}-${s.name}.png`), animations: 'disabled' });
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();
}

try {
  const sha = sh('git', ['rev-parse', '--short', ref]);
  console.log(`Referência: ${ref} (${sha})`);
  const wt = join(tmp, 'ref');
  sh('git', ['worktree', 'add', '--detach', wt, sha]);
  symlinkSync(join(root, 'node_modules'), join(wt, 'node_modules'));
  if (existsSync(join(root, 'apps/web/node_modules'))) symlinkSync(join(root, 'apps/web/node_modules'), join(wt, 'apps/web/node_modules'));
  if (existsSync(join(root, 'packages/shared/dist'))) sh('cp', ['-r', join(root, 'packages/shared/dist'), join(wt, 'packages/shared/dist')]);

  console.log('A construir as duas versões…');
  buildDemo(join(wt, 'apps/web'), join(tmp, 'ref-dist'));
  buildDemo(join(root, 'apps/web'), join(tmp, 'cur-dist'));

  const refSrv = await serve(join(tmp, 'ref-dist'));
  const curSrv = await serve(join(tmp, 'cur-dist'));
  rmSync(out, { recursive: true, force: true });
  console.log('A fotografar…');
  await shoot(refSrv.port, join(out, 'referencia'));
  await shoot(curSrv.port, join(out, 'atual'));
  refSrv.server.close();
  curSrv.server.close();

  mkdirSync(join(out, 'diferencas'), { recursive: true });
  const changed = [];
  for (const s of SCENARIOS) {
    for (const tag of ['m', 'd']) {
      if (s.mobileOnly && tag === 'd') continue;
      const f = `${tag}-${s.name}.png`;
      const a = PNG.sync.read(readFileSync(join(out, 'referencia', f)));
      const b = PNG.sync.read(readFileSync(join(out, 'atual', f)));
      if (a.width !== b.width || a.height !== b.height) {
        changed.push(`${f} (tamanho ${a.width}×${a.height} → ${b.width}×${b.height})`);
        continue;
      }
      const diff = new PNG({ width: a.width, height: a.height });
      const n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 });
      if (n > 0) {
        writeFileSync(join(out, 'diferencas', f), PNG.sync.write(diff));
        changed.push(`${f} (${n} px)`);
      }
    }
  }
  const total = SCENARIOS.reduce((n, s) => n + (s.mobileOnly ? 1 : 2), 0);
  console.log(changed.length ? `\n${changed.length} de ${total} ecrãs mudaram:\n  ${changed.join('\n  ')}\nVer ${out}/diferencas` : `\n${total} ecrãs iguais à referência.`);
  process.exitCode = changed.length ? 1 : 0;
} finally {
  try {
    sh('git', ['worktree', 'remove', '--force', join(tmp, 'ref')]);
  } catch {
    /* já removida */
  }
  rmSync(tmp, { recursive: true, force: true });
}
