import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import type { Client, PoolClient } from 'pg';

/** Aplica, por ordem, os ficheiros .sql ainda não aplicados (cada um numa transação). */
export async function runMigrations(db: Client | PoolClient, dir: string): Promise<string[]> {
  await db.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const done = new Set((await db.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name as string));
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort((a, b) => a.localeCompare(b)); // 001_…, 002_… por ordem
  const applied: string[] = [];
  for (const f of files) {
    if (done.has(f)) continue;
    await db.query('BEGIN');
    try {
      await db.query(readFileSync(join(dir, f), 'utf8'));
      await db.query('INSERT INTO schema_migrations (name) VALUES ($1)', [f]);
      await db.query('COMMIT');
      applied.push(f);
    } catch (e) {
      await db.query('ROLLBACK');
      throw new Error(`Migração ${f} falhou: ${(e as Error).message}`);
    }
  }
  return applied;
}
