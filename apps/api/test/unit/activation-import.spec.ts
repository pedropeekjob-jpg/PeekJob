import { shouldActivate } from '../../src/domain/activation';

describe('shouldActivate (organização importada de uma fonte aberta)', () => {
  it('já se sabe que existe: a primeira avaliação torna-a pública', () => {
    expect(shouldActivate({ status: 'pending', nifVerified: false, distinctReviewers: 1, imported: true })).toBe(true);
    expect(shouldActivate({ status: 'pending', nifVerified: false, distinctReviewers: 0, imported: true })).toBe(false);
  });
});
