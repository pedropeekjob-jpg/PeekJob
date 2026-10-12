import { Client } from 'pg';
import { join } from 'path';
import { runMigrations } from './migrate';

(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const applied = await runMigrations(db, join(__dirname, '..', '..', 'migrations'));
  console.log(applied.length ? `Aplicadas: ${applied.join(', ')}` : 'Base de dados já atualizada.');
  await db.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
