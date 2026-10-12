import { extractNifs } from '../../src/verification/nif-extract';

describe('extractNifs (texto de recibos e contratos)', () => {
  it('encontra NIFs válidos com ou sem espaços, pontos e prefixo PT', () => {
    const text = 'Entidade: Padaria Ribeira NIF: 501 442 600 · Trabalhador NIF PT123.456.789 · Ref 999999999';
    expect(extractNifs(text)).toEqual(expect.arrayContaining(['501442600', '123456789']));
  });

  it('ignora números de 9 dígitos com dígito de controlo errado', () => {
    expect(extractNifs('Telefone 912345678 e referência 123456780')).not.toContain('123456780');
  });

  it('não devolve repetidos', () => {
    expect(extractNifs('501442600 501442600')).toEqual(['501442600']);
  });
});
