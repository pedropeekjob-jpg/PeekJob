/**
 * NIF português: 9 dígitos, o último é dígito de controlo (módulo 11, pesos 9..2).
 * O prefixo indica o tipo de entidade.
 */
export type NifKind = 'singular' | 'coletiva' | 'publica' | 'empresario' | 'outra';

const PREFIXES: [RegExp, NifKind][] = [
  [/^[123]/, 'singular'],
  [/^45/, 'singular'], // não residente
  [/^5/, 'coletiva'],
  [/^6/, 'publica'],
  [/^7[0-9]/, 'outra'], // heranças, fundos, não residentes coletivos…
  [/^8/, 'empresario'], // empresário em nome individual (regime antigo)
  [/^9[0189]/, 'outra'], // condomínios, irregulares, não residentes, sociedades civis
];

export const normalizeNif = (raw: string) => raw.replace(/^\s*pt/i, '').replace(/[\s.\-]/g, '');

export function nifKind(raw: string): NifKind | null {
  const nif = normalizeNif(raw);
  if (!isValidNif(nif)) return null;
  return PREFIXES.find(([re]) => re.test(nif))?.[1] ?? null;
}

export function isValidNif(raw: string): boolean {
  const nif = normalizeNif(raw);
  if (!/^\d{9}$/.test(nif)) return false;
  if (!PREFIXES.some(([re]) => re.test(nif))) return false;
  const sum = nif
    .slice(0, 8)
    .split('')
    .reduce((acc, d, i) => acc + Number(d) * (9 - i), 0);
  const rest = sum % 11;
  const check = rest < 2 ? 0 : 11 - rest;
  return check === Number(nif[8]);
}
