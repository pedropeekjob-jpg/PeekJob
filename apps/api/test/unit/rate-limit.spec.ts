import { RateLimiter, rateLimitScale, ruleFor } from '../../src/security/rate-limit';

describe('RateLimiter (janela deslizante, em memória)', () => {
  it('conta por chave e liberta quando a janela passa', () => {
    const l = new RateLimiter();
    const rule = { name: 't', max: 2, windowMs: 1000 };
    expect(l.take(rule, 'ip1', 0)).toEqual({ ok: true });
    expect(l.take(rule, 'ip1', 10)).toEqual({ ok: true });
    expect(l.take(rule, 'ip1', 20)).toEqual({ ok: false, retryAfterSec: 1 });
    expect(l.take(rule, 'ip2', 20)).toEqual({ ok: true });
    expect(l.take(rule, 'ip1', 1001)).toEqual({ ok: true });
  });

  it('regras por rota; health e ficheiros estáticos ficam de fora', () => {
    expect(ruleFor('POST', '/auth/magic-link')?.name).toBe('magic-link');
    expect(ruleFor('POST', '/verifications/email/confirm')?.name).toBe('work-email');
    expect(ruleFor('GET', '/orgs/nif/500697256')?.name).toBe('nif-lookup');
    expect(ruleFor('GET', '/orgs/search')?.name).toBe('search');
    expect(ruleFor('GET', '/orgs')?.name).toBe('global');
    expect(ruleFor('GET', '/health')).toBeNull();
    expect(ruleFor('GET', '/assets/app.js')).toBeNull();
  });
});

describe('RATE_LIMIT_SCALE (só para testes de browser)', () => {
  it('multiplica os limites fora de produção', () => {
    const l = new RateLimiter(rateLimitScale({ RATE_LIMIT_SCALE: '100' }));
    const rule = { name: 't', max: 1, windowMs: 1000 };
    for (let i = 0; i < 100; i++) expect(l.take(rule, 'ip', i).ok).toBe(true);
    expect(l.take(rule, 'ip', 200).ok).toBe(false);
  });
  it('em produção recusa arrancar com limites alterados', () => {
    expect(() => rateLimitScale({ APP_ENV: 'production', RATE_LIMIT_SCALE: '100' })).toThrow(/produção/);
    expect(rateLimitScale({})).toBe(1);
    expect(() => rateLimitScale({ RATE_LIMIT_SCALE: 'abc' })).toThrow(/RATE_LIMIT_SCALE/);
  });
});
