import { isValidNif } from '@peekjob/shared';

/** Encontra NIFs válidos num texto (ex.: "501 442 600", "PT123.456.789", "501442600"). */
export function extractNifs(text: string): string[] {
  const out = new Set<string>();
  const re = /(?<!\d)(\d{9}|\d{3}[ .]\d{3}[ .]\d{3})(?!\d)/g;
  for (const m of text.matchAll(re)) {
    const nif = m[1].replace(/[ .]/g, '');
    if (isValidNif(nif)) out.add(nif);
  }
  return [...out];
}

/** Letras que o OCR costuma ler no lugar de algarismos */
const LOOKALIKE: Record<string, string> = { O: '0', o: '0', D: '0', Q: '0', I: '1', l: '1', '|': '1', i: '1', Z: '2', S: '5', s: '5', B: '8', G: '6' };
const C = '[0-9OoDQIl|iZSsBG]';
const GROUP = new RegExp(`${C}{3}[ .-]?${C}{3}[ .-]?${C}{3}`, 'g');

/**
 * Texto de fotografias (OCR): nos grupos de 9 que já têm pelo menos 6 algarismos, troca as letras parecidas
 * por algarismos (e hífenes por espaços). O dígito de controlo do NIF continua a filtrar o que não for NIF.
 */
export function fixOcrDigits(text: string): string {
  return text.replace(GROUP, (m) => ((m.match(/\d/g) ?? []).length >= 6 ? m.replace(/[^\d .]/g, (c) => (c === '-' ? ' ' : LOOKALIKE[c] ?? c)) : m));
}
