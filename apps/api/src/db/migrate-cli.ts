import { Client } from 'pg';
import { join } from 'path';
import { loadLocalEnv, migrationUrl } from '../common/local-env';
import { runMigrations } from './migrate';

loadLocalEnv();

(async () => {
  // ligação direta (sem pooler): as migrações correm em transações com estado de sessão
  const db = new Client({ connectionString: migrationUrl() });
  await db.connect();
  const applied = await runMigrations(db, join(__dirname, '..', '..', 'migrations'));
  console.log(applied.length ? `Aplicadas: ${applied.join(', ')}` : 'Base de dados já atualizada.');
  await db.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
