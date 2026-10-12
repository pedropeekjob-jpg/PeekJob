import { Client } from 'pg';
import { join } from 'path';
import { runMigrations } from '../src/db/migrate';

/** Recria a base de dados de testes e aplica as migrações (PostgreSQL real, não mocks). */
export default async function globalSetup() {
  const url = new URL(process.env.TEST_DATABASE_URL ?? 'postgres://postgres@localhost:5544/peekjob_test');
  const dbName = url.pathname.slice(1);
  const admin = new Client({ connectionString: Object.assign(new URL(url.toString()), { pathname: '/postgres' }).toString() });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
  await admin.query(`CREATE DATABASE "${dbName}"`);
  await admin.end();

  const db = new Client({ connectionString: url.toString() });
  await db.connect();
  await runMigrations(db, join(__dirname, '..', 'migrations'));
  await db.end();
  process.env.TEST_DATABASE_URL = url.toString();
}
