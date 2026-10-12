import { MIN_REVIEWERS_TO_ACTIVATE, shouldActivate } from '../../src/domain/activation';

describe('shouldActivate (organização criada por utilizadores)', () => {
  const pending = { status: 'pending' as const, nifVerified: false, distinctReviewers: 0 };

  it('fica pendente com menos de 3 pessoas a avaliar e sem NIF confirmado', () => {
    expect(shouldActivate({ ...pending, distinctReviewers: MIN_REVIEWERS_TO_ACTIVATE - 1 })).toBe(false);
  });

  it('ativa com 3 pessoas diferentes a avaliar', () => {
    expect(shouldActivate({ ...pending, distinctReviewers: MIN_REVIEWERS_TO_ACTIVATE })).toBe(true);
  });

  it('ativa quando o NIF foi confirmado', () => {
    expect(shouldActivate({ ...pending, nifVerified: true })).toBe(true);
  });

  it('nunca reativa organizações fundidas ou rejeitadas', () => {
    expect(shouldActivate({ status: 'merged', nifVerified: true, distinctReviewers: 10 })).toBe(false);
    expect(shouldActivate({ status: 'rejected', nifVerified: true, distinctReviewers: 10 })).toBe(false);
  });
});
