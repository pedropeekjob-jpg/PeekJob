import { extractNifs, fixOcrDigits } from '../../src/verification/nif-extract';

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

describe('texto de fotografias (OCR): letras lidas no lugar de algarismos', () => {
  it('corrige O/I/l/S/B nos grupos que já são quase só algarismos; o NIF passa a ser encontrado', () => {
    expect(fixOcrDigits('NIF 5O1 442 6OO')).toBe('NIF 501 442 600');
    expect(fixOcrDigits('NIF: 5Ol-442-6O0')).toBe('NIF: 501 442 600');
    expect(extractNifs(fixOcrDigits('Contribuinte 5O1442BOO'))).toEqual([]); // 8 no fim: dígito de controlo errado
    expect(extractNifs(fixOcrDigits('Padaria Ribeira NIF 5O1 442 6OO'))).toEqual(['501442600']);
  });
  it('não mexe em palavras nem em números curtos', () => {
    expect(fixOcrDigits('Joana Silva, SOLDOS 2026')).toBe('Joana Silva, SOLDOS 2026');
    expect(fixOcrDigits('Total 1.250,00 EUR')).toBe('Total 1.250,00 EUR');
  });
});
