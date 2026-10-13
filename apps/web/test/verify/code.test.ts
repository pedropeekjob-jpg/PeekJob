import { describe, expect, it } from 'vitest';
import { codeStatus, emptyCode, writeDigits } from '../../src/features/verify/code';

describe('código de 6 dígitos (funções puras)', () => {
  it('um dígito avança o foco; no último fica', () => {
    expect(writeDigits(emptyCode(), 0, '7')).toEqual({ code: ['7', '', '', '', '', ''], focus: 1 });
    expect(writeDigits(emptyCode(), 5, '9').focus).toBe(5);
  });
  it('apagar fica no mesmo sítio', () => {
    expect(writeDigits(['1', '2', '', '', '', ''], 1, '')).toEqual({ code: ['1', '', '', '', '', ''], focus: 1 });
  });
  it('colar preenche a partir da posição e ignora o que não é dígito', () => {
    expect(writeDigits(emptyCode(), 0, '12 34-56')).toEqual({ code: ['1', '2', '3', '4', '5', '6'], focus: 5 });
    expect(writeDigits(emptyCode(), 4, '987')).toEqual({ code: ['', '', '', '', '9', '8'], focus: 5 });
  });
  it('letras não entram', () => expect(writeDigits(emptyCode(), 0, 'a').code[0]).toBe(''));
  it.each([
    [emptyCode(), false, 'Faltam 6 dígitos · expira em 10 min'],
    [['1', '2', '3', '4', '5', ''], false, 'Falta 1 dígito · expira em 10 min'],
    [['1', '2', '3', '4', '5', '6'], false, 'Código completo.'],
    [emptyCode(), true, 'Código novo enviado. Expira em 10 minutos.'],
  ])('estado %#', (code, resent, msg) => expect(codeStatus(code, resent)).toBe(msg));
});
