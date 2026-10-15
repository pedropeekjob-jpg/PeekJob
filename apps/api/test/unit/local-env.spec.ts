import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { findEnvFile, loadLocalEnv, migrationUrl } from '../../src/common/local-env';

describe('variáveis locais (.env.local do neon deploy)', () => {
  it('procura .env.local e depois .env, da pasta atual até à raiz do repositório', () => {
    const root = mkdtempSync(join(tmpdir(), 'env-'));
    const api = join(root, 'apps', 'api');
    mkdirSync(api, { recursive: true });
    expect(findEnvFile(api)).toBeNull();
    writeFileSync(join(root, '.env'), 'A=1\n');
    expect(findEnvFile(api)).toBe(join(root, '.env'));
    writeFileSync(join(root, '.env.local'), 'A=2\n');
    expect(findEnvFile(api)).toBe(join(root, '.env.local'));
  });

  it('carrega o ficheiro sem apagar o que já está no ambiente; em produção não carrega nada', () => {
    const root = mkdtempSync(join(tmpdir(), 'env-'));
    writeFileSync(join(root, '.env.local'), 'PJ_TEST_A=do-ficheiro\nPJ_TEST_B=do-ficheiro\n');
    const env: Record<string, string | undefined> = { PJ_TEST_B: 'ja-definida' };
    expect(loadLocalEnv(root, env)).toBe(join(root, '.env.local'));
    expect(env).toMatchObject({ PJ_TEST_A: 'do-ficheiro', PJ_TEST_B: 'ja-definida' });
    expect(loadLocalEnv(root, { NODE_ENV: 'production' })).toBeNull();
  });

  it('migrações usam a ligação direta do Neon quando existe (o pooler não guarda estado da sessão)', () => {
    expect(migrationUrl({ DATABASE_URL: 'postgres://pool', DATABASE_URL_UNPOOLED: 'postgres://direta' })).toBe('postgres://direta');
    expect(migrationUrl({ DATABASE_URL: 'postgres://pool' })).toBe('postgres://pool');
  });
});
