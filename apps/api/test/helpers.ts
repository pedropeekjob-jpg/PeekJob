import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { InMemoryMailer, MAILER } from '../src/auth/mailer';
import { configureApp } from '../src/main';

export const TEST_DB = process.env.TEST_DATABASE_URL ?? 'postgres://postgres@localhost:5544/peekjob_test';

export interface TestCtx {
  app: INestApplication;
  pool: Pool;
  mailer: InMemoryMailer;
  http: () => ReturnType<typeof request>;
  /** Entra com o link mágico (como uma pessoa real) e devolve o cabeçalho Cookie da sessão */
  login: (name: string, role?: 'moderator') => Promise<{ Cookie: string }>;
  sessions: Map<string, { Cookie: string }>;
}

export async function createTestApp(): Promise<TestCtx> {
  process.env.DATABASE_URL = TEST_DB;
  process.env.PRIVACY_SECRET = 'segredo-de-teste';
  const mailer = new InMemoryMailer();
  const mod = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(MAILER).useValue(mailer).compile();
  const app = mod.createNestApplication();
  configureApp(app);
  await app.init();
  const pool = new Pool({ connectionString: TEST_DB });
  const http = () => request(app.getHttpServer());
  const sessions = new Map<string, { Cookie: string }>();
  const login = async (name: string, role?: 'moderator') => {
    const key = `${name}:${role ?? 'user'}`;
    const cached = sessions.get(key);
    if (cached) return cached;
    const email = name.includes("@") ? name : `${name}@teste.pt`;
    await http().post('/auth/magic-link').send({ email }).expect(202);
    const token = mailer.lastTokenFor(email);
    const res = await http().post('/auth/verify').send({ token }).expect(200);
    if (role) await pool.query('UPDATE users SET role = $2 WHERE id = $1', [res.body.user.id, role]);
    const cookie = { Cookie: sessionCookie(res.headers['set-cookie']) };
    sessions.set(key, cookie);
    return cookie;
  };
  return { app, pool, mailer, http, login, sessions };
}

export function sessionCookie(setCookie: string | string[] | undefined): string {
  const list = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const c = list.find((x) => x.startsWith('pj_session='));
  if (!c) throw new Error('Sem cookie de sessão');
  return c.split(';')[0];
}

export async function resetDb(t: TestCtx) {
  await t.pool.query(
    'TRUNCATE reports, verification_codes, verifications, org_domains, support_messages, reviews, org_locations, org_aliases, org_sources, organizations, sessions, login_tokens, users RESTART IDENTITY CASCADE',
  );
  t.sessions.clear();
  t.mailer.clear();
}

export async function insertOrg(
  pool: Pool,
  o: { name: string; type?: string; city?: string; status?: string; nif?: string | null; nifVerified?: boolean },
): Promise<string> {
  const r = await pool.query(
    `INSERT INTO organizations (name, type, city, status, nif, nif_verified, source)
     VALUES ($1, $2, $3, $4, $5, $6, 'seed') RETURNING id`,
    [o.name, o.type ?? 'PME', o.city ?? 'Porto', o.status ?? 'active', o.nif ?? null, o.nifVerified ?? false],
  );
  return r.rows[0].id;
}

export const goodReview = { scores: { respeito: 5, salario: 4, equilibrio: 4 }, recommend: true, tags: ['Horários cumpridos'], text: 'Equipa unida e horários cumpridos.' };

/** Gera um PDF simples (ex.: recibo de vencimento) com as linhas dadas */
export function makePdf(lines: string[]): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const PDFDocument = require('pdfkit');
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    lines.forEach((l) => doc.text(l));
    doc.end();
  });
}
