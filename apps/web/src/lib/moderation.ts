import { BAD_TAGS } from '../data/content';

/**
 * Deteção local (POC) de possíveis ilegalidades e de insultos/nomes.
 * Em produção: modelo de moderação no servidor + revisão humana; estas regras servem de demonstração.
 */
const RULES: [RegExp, string, string][] = [
  [/atras/i, 'salário em atraso', 'incumprimento salarial'],
  [/corpo|ass[eé]dio|toca|piropo/i, 'comentários sobre o corpo', 'assédio sexual'],
  [/grita|humilh|amea[çc]/i, 'humilhação', 'assédio moral'],
  [/sem contrato|recibos? verdes/i, 'trabalho sem contrato', 'trabalho não declarado'],
  [/horas extra/i, 'horas extra não pagas', 'incumprimento salarial'],
  [/discrimin|racis|homof/i, 'discriminação', 'discriminação'],
];

export interface RedFlagResult {
  flagged: boolean;
  found: string[];
  kinds: string[];
}

export function detectRedFlags(text: string, tags: string[] = []): RedFlagResult {
  const found: string[] = [];
  const kinds: string[] = [];
  RULES.forEach(([re, what, kind]) => {
    if (re.test(text)) {
      found.push(what);
      if (!kinds.includes(kind)) kinds.push(kind);
    }
  });
  BAD_TAGS.forEach((b) => {
    if (tags.includes(b) && !found.some((f) => f.includes(b.split(' ')[0].toLowerCase()))) found.push(b.toLowerCase());
  });
  if (found.length && !kinds.length) kinds.push('incumprimento da lei laboral');
  return { flagged: found.length > 0, found, kinds };
}

const INSULT = /\b(Ricardo|incompetente|idiota|est[uú]pid\w*)\b/i;
export const hasInsultOrName = (text: string) => INSULT.test(text);

/** Sugestão de reescrita sem nomes nem insultos */
export const softenText = (text: string) =>
  text
    .replace(/O Ricardo é (um )?(incompetente|idiota)[^.]*\.?/i, 'A chefia muda prioridades sem explicar porquê.')
    .replace(/Ricardo/gi, 'a chefia')
    .replace(/incompetente|idiota|est[uú]pid\w*/gi, 'desorganizada');
