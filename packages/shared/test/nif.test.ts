import { describe, expect, it } from 'vitest';
import { isValidNif, nifKind, normalizeNif } from '../src/nif';

describe('normalizeNif', () => {
  it('remove espaços, pontos e o prefixo PT', () => {
    expect(normalizeNif(' PT 123 456 789 ')).toBe('123456789');
    expect(normalizeNif('pt123.456.789')).toBe('123456789');
  });
});

describe('isValidNif', () => {
  it.each(['123456789', '999999990', '500000000', '501442600'])('aceita %s (dígito de controlo certo)', (nif) => {
    expect(isValidNif(nif)).toBe(true);
  });

  it('aceita o NIF com espaços ou prefixo PT', () => {
    expect(isValidNif('PT 123 456 789')).toBe(true);
  });

  it.each([
    ['dígito de controlo errado', '123456780'],
    ['8 dígitos', '12345678'],
    ['10 dígitos', '1234567890'],
    ['letras', 'abcdefghi'],
    ['vazio', ''],
    ['prefixo inexistente (4x que não 45)', '400000000'],
  ])('recusa %s', (_why, nif) => {
    expect(isValidNif(nif)).toBe(false);
  });
});

describe('nifKind', () => {
  it('classifica pelo prefixo', () => {
    expect(nifKind('123456789')).toBe('singular');
    expect(nifKind('500000000')).toBe('coletiva');
    expect(nifKind('600000001')).toBe('publica');
    expect(nifKind('900000007')).toBe('outra');
  });
  it('devolve null para NIF inválido', () => {
    expect(nifKind('123')).toBeNull();
  });
});
