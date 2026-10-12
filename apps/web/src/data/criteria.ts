import { tr } from '../i18n';

export type CriterionKey =
  | 'salario'
  | 'equilibrio'
  | 'respeito'
  | 'ambiente'
  | 'lideranca'
  | 'estabilidade'
  | 'progressao'
  | 'proposito';

export interface Criterion {
  key: CriterionKey;
  /** Nome curto (listas, linhas de bolinhas) */
  short: string;
  /** Nome completo (preferências, formulários) */
  label: string;
  /** Uma linha que explica o critério */
  hint: string;
  /** Cor de destaque: Respeito e inclusão é sempre roxo */
  color: string;
}

/** Critério com textos no idioma atual (getters: mudam com o idioma) */
function crit(key: CriterionKey, color: string, pt: [string, string, string], en: [string, string, string]): Criterion {
  return {
    key,
    color,
    get short() { return tr(pt[0], en[0]); },
    get label() { return tr(pt[1], en[1]); },
    get hint() { return tr(pt[2], en[2]); },
  };
}

export const CRITERIA: Criterion[] = [
  crit('salario', 'var(--teal)', ['Salário', 'Salário justo', 'Pago a horas, sem surpresas'], ['Pay', 'Fair pay', 'Paid on time, no surprises']),
  crit('equilibrio', 'var(--teal)', ['Equilíbrio', 'Equilíbrio', 'Horários que se cumprem'], ['Balance', 'Work–life balance', 'Hours that are kept']),
  crit('respeito', 'var(--purple)', ['Respeito', 'Respeito e inclusão', 'Direitos, diversidade, sem assédio'], ['Respect', 'Respect and inclusion', 'Rights, diversity, no harassment']),
  crit('ambiente', 'var(--teal)', ['Ambiente', 'Ambiente', 'Colegas e entreajuda'], ['Atmosphere', 'Atmosphere', 'Colleagues who help each other']),
  crit('lideranca', 'var(--teal)', ['Liderança', 'Liderança', 'Chefias que ouvem'], ['Leadership', 'Leadership', 'Managers who listen']),
  crit('estabilidade', 'var(--teal)', ['Estabilidade', 'Estabilidade', 'Contrato e segurança'], ['Stability', 'Stability', 'Contract and security']),
  crit('progressao', 'var(--teal)', ['Progressão', 'Progressão', 'Aprender e crescer'], ['Growth', 'Growth', 'Learning and progressing']),
  crit('proposito', 'var(--teal)', ['Propósito', 'Propósito', 'Trabalho com impacto'], ['Purpose', 'Purpose', 'Work that makes a difference']),
];

export const CRITERION: Record<CriterionKey, Criterion> = Object.fromEntries(
  CRITERIA.map((c) => [c.key, c]),
) as Record<CriterionKey, Criterion>;

/** Pesos das 3 prioridades escolhidas, por ordem */
export const PREF_WEIGHTS = [3, 2, 1];

export const DEFAULT_PREFS: CriterionKey[] = ['respeito', 'salario', 'equilibrio'];
