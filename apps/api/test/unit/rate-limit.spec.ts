import { RateLimiter, ruleFor } from '../../src/security/rate-limit';

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
