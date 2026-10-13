import { tr } from '../../i18n';

export const CODE_LENGTH = 6;
export type Code = string[];
export const emptyCode = (): Code => Array.from({ length: CODE_LENGTH }, () => '');

/**
 * Escreve dígitos a partir da posição `from` (um dígito ou um código colado).
 * Devolve o código novo e a posição que deve ficar com o foco. Ignora tudo o que não é dígito.
 */
export function writeDigits(code: Code, from: number, raw: string): { code: Code; focus: number } {
  const digits = raw.replace(/\D/g, '');
  const next = code.slice();
  if (digits.length <= 1) {
    next[from] = digits;
    return { code: next, focus: digits && from < CODE_LENGTH - 1 ? from + 1 : from };
  }
  digits
    .slice(0, CODE_LENGTH - from)
    .split('')
    .forEach((d, k) => (next[from + k] = d));
  return { code: next, focus: Math.min(from + digits.length, CODE_LENGTH - 1) };
}

export const filledCount = (code: Code) => code.filter((c) => c !== '').length;
export const isComplete = (code: Code) => filledCount(code) === CODE_LENGTH;

/** Linha de estado por baixo do código */
export function codeStatus(code: Code, resent: boolean): string {
  if (resent) return tr('Código novo enviado. Expira em 10 minutos.', 'New code sent. It expires in 10 minutes.');
  if (isComplete(code)) return tr('Código completo.', 'Code complete.');
  const left = CODE_LENGTH - filledCount(code);
  return left === 1
    ? tr('Falta 1 dígito · expira em 10 min', '1 digit to go · expires in 10 min')
    : tr(`Faltam ${left} dígitos · expira em 10 min`, `${left} digits to go · expires in 10 min`);
}
