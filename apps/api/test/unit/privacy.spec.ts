import { userRef } from '../../src/common/privacy';

/**
 * Decisão: cada pessoa tem um pseudónimo (HMAC do id com um segredo do servidor).
 * Precisamos dele para "as minhas avaliações", mensagens de apoio, exportar/apagar dados (RGPD)
 * e para detetar a mesma pessoa ao fundir organizações duplicadas.
 * Nunca é devolvido pela API e não permite chegar ao email sem o segredo e a tabela de contas.
 */
describe('pseudonimização (userRef)', () => {
  it('é estável para a mesma pessoa', () => {
    expect(userRef('s3gredo', 'u1')).toBe(userRef('s3gredo', 'u1'));
  });

  it('muda com o segredo', () => {
    expect(userRef('s3gredo', 'u1')).not.toBe(userRef('outro', 'u1'));
  });

  it('não contém o identificador original', () => {
    const ref = userRef('s3gredo', 'pessoa@gmail.com');
    expect(ref).not.toContain('pessoa');
    expect(ref).toMatch(/^[a-f0-9]{64}$/);
  });
});
