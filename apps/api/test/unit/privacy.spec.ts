import { reviewerRef, userRef } from '../../src/common/privacy';

describe('pseudonimização de quem avalia', () => {
  const secret = 's3gredo';

  it('é estável para a mesma pessoa e organização', () => {
    expect(reviewerRef(secret, 'u1', 'org-a')).toBe(reviewerRef(secret, 'u1', 'org-a'));
  });

  it('é diferente entre organizações (não dá para ligar as avaliações de uma pessoa)', () => {
    expect(reviewerRef(secret, 'u1', 'org-a')).not.toBe(reviewerRef(secret, 'u1', 'org-b'));
  });

  it('não contém o identificador original', () => {
    const ref = reviewerRef(secret, 'pessoa@gmail.com', 'org-a');
    expect(ref).not.toContain('pessoa');
    expect(ref).toMatch(/^[a-f0-9]{64}$/);
  });

  it('userRef é independente da organização e do reviewerRef', () => {
    expect(userRef(secret, 'u1')).toBe(userRef(secret, 'u1'));
    expect(userRef(secret, 'u1')).not.toBe(reviewerRef(secret, 'u1', 'org-a'));
  });
});
