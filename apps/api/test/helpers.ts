import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/main';

export const TEST_DB = process.env.TEST_DATABASE_URL ?? 'postgres://postgres@localhost:5544/peekjob_test';

export interface TestCtx {
  app: INestApplication;
  pool: Pool;
  http: () => ReturnType<typeof request>;
}

export async function createTestApp(): Promise<TestCtx> {
  process.env.DATABASE_URL = TEST_DB;
  process.env.PRIVACY_SECRET = 'segredo-de-teste';
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = mod.createNestApplication();
  configureApp(app);
  await app.init();
  const pool = new Pool({ connectionString: TEST_DB });
  return { app, pool, http: () => request(app.getHttpServer()) };
}

export async function resetDb(pool: Pool) {
  await pool.query('TRUNCATE support_messages, reviews, org_locations, org_aliases, org_sources, organizations RESTART IDENTITY CASCADE');
}

/** Cabeçalhos da autenticação de desenvolvimento (substituída pelo link mágico na próxima fatia) */
export const asUser = (id: string) => ({ 'x-user-id': id });
export const asModerator = (id = 'mod-1') => ({ 'x-user-id': id, 'x-user-role': 'moderator' });

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
