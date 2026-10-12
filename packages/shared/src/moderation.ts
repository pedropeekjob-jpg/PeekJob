import { BAD_TAGS } from './criteria';

/**
 * Moderação local (primeira camada). Em produção junta-se uma API de moderação
 * e um LLM para os casos duvidosos, com revisão humana no fim.
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

export function detectRedFlags(text: string, tags: readonly string[] = []): RedFlagResult {
  const found: string[] = [];
  const kinds: string[] = [];
  for (const [re, what, kind] of RULES) {
    if (re.test(text)) {
      found.push(what);
      if (!kinds.includes(kind)) kinds.push(kind);
    }
  }
  for (const b of BAD_TAGS) {
    if (tags.includes(b) && !found.some((f) => f.includes(b.split(' ')[0].toLowerCase()))) found.push(b.toLowerCase());
  }
  if (found.length && !kinds.length) kinds.push('incumprimento da lei laboral');
  return { flagged: found.length > 0, found, kinds };
}

const INSULTS = ['incompetente', 'idiota', 'estúpido', 'estúpida', 'estupido', 'estupida', 'burro', 'burra', 'imbecil', 'parvo', 'parva', 'otário', 'otária', 'nojento', 'nojenta'];

/** Nomes próprios frequentes em Portugal (lista curta; em produção usar NER/LLM). */
export const COMMON_FIRST_NAMES = [
  'Ana', 'Maria', 'Joana', 'Inês', 'Sofia', 'Beatriz', 'Mariana', 'Catarina', 'Rita', 'Sara', 'Marta', 'Carla', 'Patrícia', 'Sandra', 'Paula', 'Teresa', 'Helena', 'Cláudia', 'Andreia', 'Daniela', 'Filipa', 'Raquel', 'Susana', 'Vera', 'Lúcia', 'Isabel', 'Fátima', 'Luísa',
  'João', 'José', 'António', 'Manuel', 'Pedro', 'Paulo', 'Rui', 'Ricardo', 'Nuno', 'Luís', 'Carlos', 'Miguel', 'Tiago', 'André', 'Bruno', 'Hugo', 'Sérgio', 'Jorge', 'Fernando', 'Francisco', 'Diogo', 'Gonçalo', 'Duarte', 'Rafael', 'Tomás', 'Filipe', 'Vítor', 'Joaquim', 'Mário', 'Fábio', 'Marco', 'Álvaro',
];

export interface PersonalAttackResult {
  insults: string[];
  names: string[];
  blocked: boolean;
}

const wordsOf = (text: string) => text.match(/[\p{L}]+/gu) ?? [];

export function findPersonalAttacks(text: string, names: readonly string[] = COMMON_FIRST_NAMES): PersonalAttackResult {
  const words = wordsOf(text);
  const lower = words.map((w) => w.toLowerCase());
  const insults = INSULTS.filter((i) => lower.includes(i));
  const nameSet = new Set(names);
  const found = Array.from(new Set(words.filter((w) => nameSet.has(w))));
  return { insults, names: found, blocked: insults.length > 0 || found.length > 0 };
}

/** Sugestão de reescrita sem nomes nem insultos (o utilizador decide se aceita). */
export function softenText(text: string, names: readonly string[] = COMMON_FIRST_NAMES): string {
  let out = text;
  for (const n of names) {
    out = out.replace(new RegExp(`\\b(o|a)\\s+${n}(\\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\\p{L}]+)?`, 'gu'), 'a chefia');
    out = out.replace(new RegExp(`(^|[^\\p{L}])${n}(?![\\p{L}])`, 'gu'), '$1a chefia');
  }
  out = out.replace(new RegExp(`(^|[^\\p{L}])(${INSULTS.join('|')})(?![\\p{L}])`, 'giu'), '$1desorganizada');
  return out.replace(/^a chefia/, 'A chefia');
}
