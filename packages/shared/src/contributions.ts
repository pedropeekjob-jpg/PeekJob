import { z } from 'zod';
import { REVIEW_TEXT_MAX } from './criteria';

/**
 * Entrevistas, salários e respostas das organizações: validação e regras de anonimato.
 * Funções puras, usadas pela API (e testadas aqui).
 */

/** Passos possíveis de um processo de recrutamento (guardados em português, como as etiquetas) */
export const INTERVIEW_STEPS = ['Conversa', 'Entrevista', 'Prova prática', 'Teste escrito', 'Dia de experiência', 'Dinâmica de grupo'] as const;
export type InterviewStep = (typeof INTERVIEW_STEPS)[number];

/** Regra de anonimato: só se mostram valores de uma função com pelo menos 3 salários */
export const MIN_SALARIES = 3;
export const SALARY_MIN = 100;
export const SALARY_MAX = 50000;

const role = z.string().trim().min(2, 'Função demasiado curta').max(60);

export const CreateInterviewInput = z.object({
  role,
  positive: z.boolean(),
  offer: z.boolean(),
  /** se a organização chegou a dar resposta */
  answered: z.boolean().default(true),
  difficulty: z.number().int().min(1).max(5).nullable().default(null),
  steps: z
    .array(z.enum(INTERVIEW_STEPS))
    .min(1, 'Indica pelo menos um passo')
    .max(INTERVIEW_STEPS.length)
    .refine((s) => new Set(s).size === s.length, { message: 'Passos repetidos' }),
  text: z.string().trim().max(REVIEW_TEXT_MAX).default(''),
});
export type CreateInterviewInput = z.infer<typeof CreateInterviewInput>;

export const CreateSalaryInput = z.object({
  role,
  /** bruto mensal, em euros */
  monthlyGross: z.number().int().min(SALARY_MIN).max(SALARY_MAX),
  paidOnTime: z.boolean().nullable().default(null),
});
export type CreateSalaryInput = z.infer<typeof CreateSalaryInput>;

export const ReplyInput = z.object({ text: z.string().trim().min(2, 'Resposta demasiado curta').max(REVIEW_TEXT_MAX) });
export type ReplyInput = z.infer<typeof ReplyInput>;

/** Chave para juntar a mesma função escrita de formas diferentes ("Balcão", "balcao ") */
export const roleKey = (r: string) =>
  r
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const round10 = (v: number) => Math.round(v / 10) * 10;
const pct = (n: number, total: number) => Math.round((n / total) * 100);

/** Percentil com interpolação linear (valores ordenados) */
function percentile(sorted: number[], p: number) {
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

/** O valor mais frequente (em empate, o primeiro que apareceu) */
function mostCommon(values: string[]) {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = values[0];
  for (const [v, n] of counts) if (n > (counts.get(best) ?? 0)) best = v;
  return best;
}

export interface SalaryRow {
  role: string;
  monthlyGross: number;
  paidOnTime: boolean | null;
}
export interface SalaryBandOut {
  role: string;
  count: number;
  min?: number;
  max?: number;
  median?: number;
}

/**
 * Salários por função. Com menos de MIN_SALARIES só se diz quantos há (nunca valores).
 * Os extremos são os percentis 10 e 90, arredondados às dezenas: nunca o salário exato de alguém.
 */
export function salaryBands(rows: SalaryRow[]): { bands: SalaryBandOut[]; paidOnTimePct: number | null } {
  const groups = new Map<string, SalaryRow[]>();
  for (const r of rows) {
    const k = roleKey(r.role);
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  const bands = [...groups.values()]
    .map((g): SalaryBandOut => {
      const name = mostCommon(g.map((r) => r.role.trim()));
      if (g.length < MIN_SALARIES) return { role: name, count: g.length };
      const v = g.map((r) => r.monthlyGross).sort((a, b) => a - b);
      return { role: name, count: g.length, min: round10(percentile(v, 0.1)), max: round10(percentile(v, 0.9)), median: round10(percentile(v, 0.5)) };
    })
    .sort((a, b) => b.count - a.count);
  const answers = rows.filter((r) => r.paidOnTime !== null);
  const paidOnTimePct = answers.length >= MIN_SALARIES ? pct(answers.filter((r) => r.paidOnTime).length, answers.length) : null;
  return { bands, paidOnTimePct };
}

export interface InterviewRow {
  positive: boolean;
  offer: boolean;
  answered: boolean;
  difficulty: number | null;
  steps: string[];
}

/** Ordem habitual dos passos (para "Conversa + Dia de experiência" ser igual a "Dia de experiência + Conversa") */
export const stepsLabel = (steps: readonly string[]) =>
  [...steps].sort((a, b) => INTERVIEW_STEPS.indexOf(a as InterviewStep) - INTERVIEW_STEPS.indexOf(b as InterviewStep)).join(' + ');

/** Resumo das entrevistas de uma organização */
export function interviewStats(rows: InterviewRow[]) {
  if (!rows.length) return null;
  const n = rows.length;
  const rated = rows.map((r) => r.difficulty).filter((d): d is number => d != null);
  return {
    positivePct: pct(rows.filter((r) => r.positive).length, n),
    offerPct: pct(rows.filter((r) => r.offer).length, n),
    answeredPct: pct(rows.filter((r) => r.answered).length, n),
    difficulty: rated.length ? Math.round((rated.reduce((a, b) => a + b, 0) / rated.length) * 10) / 10 : null,
    usualSteps: mostCommon(rows.map((r) => stepsLabel(r.steps))),
  };
}
