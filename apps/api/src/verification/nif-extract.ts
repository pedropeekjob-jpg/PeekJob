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
