import { CleanupService } from '../../src/housekeeping/cleanup.service';
import { createTestApp, insertOrg, resetDb, TestCtx } from '../helpers';

/** Links de entrada, códigos e sessões expirados não ficam na base de dados depois do prazo */
describe('Limpeza dos dados de acesso expirados', () => {
  let t: TestCtx;
  const svc = () => t.app.get(CleanupService);
  const count = async (table: string) => (await t.pool.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n as number;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.pool.end();
    await t.app.close();
  });
  beforeEach(async () => {
    await resetDb(t);
    await t.pool.query('TRUNCATE org_claim_codes');
  });

  it('apaga links de entrada expirados há mais de um dia e mantém os recentes (contam para o limite de pedidos)', async () => {
    await t.pool.query(
      `INSERT INTO login_tokens (token_hash, email_hash, expires_at, created_at) VALUES
         ('velho', 'e1', now() - interval '2 days', now() - interval '2 days'),
         ('expirou-agora', 'e1', now() - interval '1 minute', now() - interval '16 minutes'),
         ('valido', 'e1', now() + interval '10 minutes', now())`,
    );
    const r = await svc().runOnce();
    expect(r.loginTokens).toBe(1);
    expect((await t.pool.query('SELECT token_hash FROM login_tokens ORDER BY token_hash')).rows.map((x) => x.token_hash)).toEqual(['expirou-agora', 'valido']);
  });

  it('apaga sessões e códigos de verificação expirados, sem tocar nos válidos', async () => {
    const orgId = await insertOrg(t.pool, { name: 'Padaria Central' });
    const me = await t.login('ana');
    const user = (await t.pool.query('SELECT id FROM users LIMIT 1')).rows[0].id;
    await t.pool.query(`INSERT INTO sessions (id_hash, user_id, expires_at) VALUES ('s-velha', $1, now() - interval '1 hour')`, [user]);
    await t.pool.query(
      `INSERT INTO verification_codes (user_ref, org_id, code_hash, expires_at) VALUES
         ('u1', $1, 'h', now() - interval '1 minute'), ('u2', $1, 'h', now() + interval '5 minutes')`,
      [orgId],
    );
    await t.pool.query(
      `INSERT INTO org_claim_codes (member_ref, org_id, email_domain, code_hash, expires_at) VALUES
         ('m1', $1, 'padaria.pt', 'h', now() - interval '1 minute'), ('m2', $1, 'padaria.pt', 'h', now() + interval '5 minutes')`,
      [orgId],
    );

    expect(await svc().runOnce()).toEqual({ loginTokens: 0, sessions: 1, verificationCodes: 1, claimCodes: 1 });
    expect(await count('sessions')).toBe(1);
    expect((await t.pool.query('SELECT user_ref FROM verification_codes')).rows).toEqual([{ user_ref: 'u2' }]);
    expect((await t.pool.query('SELECT member_ref FROM org_claim_codes')).rows).toEqual([{ member_ref: 'm2' }]);
    // a sessão válida continua a funcionar
    await t.http().get('/me/reviews').set(me).expect(200);
  });

  it('sem nada expirado, não apaga nada', async () => {
    expect(await svc().runOnce()).toEqual({ loginTokens: 0, sessions: 0, verificationCodes: 0, claimCodes: 0 });
  });
});
