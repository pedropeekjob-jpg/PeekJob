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
  // Inglês (as categorias ficam em português; a interface mostra-as no idioma de quem lê)
  [/\blate (pay|salary|wages?)|(pay|salary|wages?) (is|are|was|were)( always| often)? late|unpaid wages?/i, 'salário em atraso', 'incumprimento salarial'],
  [/\bbody\b|sexual|harass|grop|touch(es|ed|ing)? me|catcall/i, 'comentários sobre o corpo', 'assédio sexual'],
  [/shout|yell|humiliat|threat|bully/i, 'humilhação', 'assédio moral'],
  [/no contract|without a contract|cash in hand|off the books/i, 'trabalho sem contrato', 'trabalho não declarado'],
  [/unpaid overtime|overtime (is |was )?(unpaid|(not|never) paid)/i, 'horas extra não pagas', 'incumprimento salarial'],
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

const INSULTS_PT = ['incompetente', 'idiota', 'estúpido', 'estúpida', 'estupido', 'estupida', 'burro', 'burra', 'imbecil', 'parvo', 'parva', 'otário', 'otária', 'nojento', 'nojenta'];
const INSULTS_EN = ['idiot', 'idiots', 'stupid', 'moron', 'morons', 'imbecile', 'incompetent', 'dumb', 'jerk', 'asshole', 'disgusting'];
const INSULTS = [...INSULTS_PT, ...INSULTS_EN];

/** Palavrões: não bloqueiam (não atacam uma pessoa), mas sugerem rever o tom. */
const PROFANITY = ['merda', 'porra', 'caralho', 'foda', 'fodasse', 'cabrão', 'shit', 'fuck', 'fucking', 'crap', 'damn', 'bullshit'];

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

/**
 * Sugestão de reescrita por regras, sem nomes nem insultos (o utilizador decide se aceita).
 * É a reserva da reescrita com IA: funciona sempre, mesmo sem rede.
 */
export function softenText(text: string, names: readonly string[] = COMMON_FIRST_NAMES, lang: 'pt' | 'en' = 'pt'): string {
  const who = lang === 'en' ? 'the manager' : 'a chefia';
  const neutral = lang === 'en' ? 'disorganised' : 'desorganizada';
  let out = text;
  for (const n of names) {
    if (lang === 'pt') out = out.replace(new RegExp(`\\b(o|a)\\s+${n}(\\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\\p{L}]+)?`, 'gu'), who);
    out = out.replace(new RegExp(`(^|[^\\p{L}])${n}(\\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\\p{L}]+)?(?![\\p{L}])`, 'gu'), `$1${who}`);
  }
  out = out.replace(new RegExp(`(^|[^\\p{L}])(${INSULTS.join('|')})(?![\\p{L}])`, 'giu'), `$1${neutral}`);
  return out.replace(/(^|[.!?]\s+)(a chefia|the manager)/g, (_m, p: string, w: string) => p + w[0].toUpperCase() + w.slice(1));
}

export type ToneReason = 'insult' | 'name' | 'shouting' | 'profanity';
export interface ToneResult {
  /** vale a pena sugerir uma reescrita */
  aggressive: boolean;
  /** a API recusa publicar assim (insultos ou nomes) */
  blocked: boolean;
  reasons: ToneReason[];
}

/** Tom do texto: o que bloqueia (insultos, nomes) e o que só merece uma sugestão (gritos, palavrões). */
export function toneIssues(text: string): ToneResult {
  const attack = findPersonalAttacks(text);
  const reasons: ToneReason[] = [];
  if (attack.insults.length) reasons.push('insult');
  if (attack.names.length) reasons.push('name');
  const caps = wordsOf(text).filter((w) => w.length >= 4 && w === w.toUpperCase() && w !== w.toLowerCase());
  if (caps.length >= 3 || /!{3,}/.test(text)) reasons.push('shouting');
  const lower = wordsOf(text).map((w) => w.toLowerCase());
  if (PROFANITY.some((p) => lower.includes(p))) reasons.push('profanity');
  return { aggressive: reasons.length > 0, blocked: attack.blocked, reasons };
}
