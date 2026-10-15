import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';

type Env = Record<string, string | undefined>;

/**
 * Em desenvolvimento, as variáveis vêm do `.env.local` que o `neon deploy` escreve na raiz
 * (ou de um `.env`). Procura da pasta atual para cima, até à raiz do repositório.
 */
export function findEnvFile(from = process.cwd()): string | null {
  let dir = from;
  for (;;) {
    for (const name of ['.env.local', '.env']) {
      const file = join(dir, name);
      if (existsSync(file)) return file;
    }
    const up = dirname(dir);
    if (up === dir || existsSync(join(dir, '.git'))) return null;
    dir = up;
  }
}

/** Linhas NOME=valor (aspas opcionais; # comenta) */
function parse(text: string): Env {
  const out: Env = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_]\w*)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

/** Carrega o ficheiro local sem substituir o que o ambiente já define; em produção, nada (o alojamento define tudo) */
export function loadLocalEnv(from = process.cwd(), env: Env = process.env): string | null {
  if (env.NODE_ENV === 'production') return null;
  const file = findEnvFile(from);
  if (!file) return null;
  for (const [k, v] of Object.entries(parse(readFileSync(file, 'utf8')))) if (env[k] === undefined) env[k] = v;
  return file;
}

/** Migrações e seed pela ligação direta do Neon (DATABASE_URL_UNPOOLED); a app usa a do pooler (DATABASE_URL) */
export const migrationUrl = (env: Env = process.env) => env.DATABASE_URL_UNPOOLED || env.DATABASE_URL;
