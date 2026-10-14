import { appealDeadline, appealInfo, isAppealable, sideOf } from '../../src/appeals/appeals';

describe('regras de contestação', () => {
  const at = new Date('2026-01-01T00:00:00Z');
  it('só decisões de moderação que afetam a pessoa', () => {
    expect(isAppealable('moderation', 'removed')).toBe(true);
    expect(isAppealable('moderation', 'rejected')).toBe(true);
    expect(isAppealable('moderation', 'upheld')).toBe(false);
    expect(isAppealable('moderation', 'appeal_confirmed')).toBe(false);
    expect(isAppealable('support', 'removed')).toBe(false);
  });
  it('prazo de 6 meses; estado do pedido quando existe', () => {
    expect(appealDeadline(at).toISOString()).toBe('2026-06-30T00:00:00.000Z');
    expect(appealInfo({ type: 'moderation', decision: 'removed', createdAt: at }, null, new Date('2026-03-01'))).toEqual({ status: 'available', until: '2026-06-30T00:00:00.000Z' });
    expect(appealInfo({ type: 'moderation', decision: 'removed', createdAt: at }, null, new Date('2026-07-01'))).toEqual({ status: 'expired' });
    expect(appealInfo({ type: 'moderation', decision: 'removed', createdAt: at }, { status: 'confirmed', note: 'x' })).toEqual({ status: 'confirmed', note: 'x' });
    expect(appealInfo({ type: 'support', decision: undefined, createdAt: at }, null)).toBeNull();
  });
  it('quem contesta', () => {
    expect(sideOf('removed')).toBe('author');
    expect(sideOf('rejected')).toBe('reporter');
  });
});
