// Arranca o ambiente dos testes no browser: base de dados nova, servidor de email falso e a API a servir a web.
// Pré-requisito: builds feitas (shared, api e web com VITE_API_URL=/ VITE_ROUTER=browser).
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DB = process.env.E2E_DATABASE_URL ?? 'postgres://postgres@localhost:5544/peekjob_e2e';
const PORT = Number(process.env.E2E_PORT ?? 3200);
const MAIL_PORT = Number(process.env.E2E_MAIL_PORT ?? 4610);
export const SECRET = 'e2e-secret';

for (const f of ['apps/api/dist/main.js', 'apps/web/dist/index.html']) {
  if (!existsSync(join(root, f))) throw new Error(`Falta a build: ${f} (npm run build)`);
}

// 1) base de dados nova, migrações e organizações de exemplo
const url = new URL(DB);
const name = url.pathname.slice(1);
const admin = new pg.Client({ connectionString: Object.assign(new URL(DB), { pathname: '/postgres' }).toString() });
await admin.connect();
await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
await admin.query(`CREATE DATABASE "${name}"`);
await admin.end();
const env = { ...process.env, DATABASE_URL: DB };
execFileSync('node', ['apps/api/dist/db/migrate-cli.js'], { cwd: root, env, stdio: 'inherit' });
execFileSync('node', ['apps/api/dist/db/seed-cli.js'], { cwd: root, env, stdio: 'inherit' });

// uma avaliação publicada para os testes de denúncia
const db = new pg.Client({ connectionString: DB });
await db.connect();
await db.query(`INSERT INTO reviews (org_id, author_ref, scores, avg, recommend, tags, text)
  SELECT id, 'e2e-autor-seed', '{"ambiente": 2}', 2, false, '{}', 'Turnos mal planeados e chefia desorganizada.'
    FROM organizations WHERE name = 'Padaria Ribeira'`);
await db.end();

// 2) servidor de email falso (no lugar do Resend): guarda os emails, GET /__mails devolve-os; e Nominatim falso
const mails = [];
createServer((req, res) => {
  // Nominatim falso (geocodificação): qualquer morada fica no centro do Porto
  if (req.method === 'GET' && req.url.startsWith('/search')) {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify([{ lat: '41.1496', lon: '-8.6109' }]));
  }
  if (req.method === 'GET') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify(mails));
  }
  let b = '';
  req.on('data', (c) => (b += c));
  req.on('end', () => {
    mails.push(JSON.parse(b));
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end('{"id":"e2e"}');
  });
}).listen(MAIL_PORT);

// 3) a API como em produção (serve a web), com os limites por IP multiplicados (todos os testes vêm do mesmo IP)
const api = spawn('node', ['apps/api/dist/main.js'], {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...env,
    PORT: String(PORT),
    WEB_DIST: join(root, 'apps/web/dist'),
    WEB_ORIGIN: `http://localhost:${PORT}`,
    PRIVACY_SECRET: SECRET,
    RESEND_API_KEY: 're_e2e',
    RESEND_API_URL: `http://localhost:${MAIL_PORT}`,
    MAIL_FROM: 'PeekJob <ola@peekjob.pt>',
    VIES_URL: 'off',
    // geocodificação contra o Nominatim falso acima (nunca o real); uma ronda por minuto
    GEOCODER_URL: `http://localhost:${MAIL_PORT}`,
    GEOCODE_INTERVAL_MIN: '1',
    RATE_LIMIT_SCALE: '50',
    ANTHROPIC_API_KEY: '',
    GA_MEASUREMENT_ID: '',
    NODE_ENV: 'development',
  },
});
api.on('exit', (code) => process.exit(code ?? 1));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => api.kill(sig));
