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

export const CRITERIA: Criterion[] = [
  { key: 'salario', short: 'Salário', label: 'Salário justo', hint: 'Pago a horas, sem surpresas', color: 'var(--teal)' },
  { key: 'equilibrio', short: 'Equilíbrio', label: 'Equilíbrio', hint: 'Horários que se cumprem', color: 'var(--teal)' },
  { key: 'respeito', short: 'Respeito', label: 'Respeito e inclusão', hint: 'Direitos, diversidade, sem assédio', color: 'var(--purple)' },
  { key: 'ambiente', short: 'Ambiente', label: 'Ambiente', hint: 'Colegas e entreajuda', color: 'var(--teal)' },
  { key: 'lideranca', short: 'Liderança', label: 'Liderança', hint: 'Chefias que ouvem', color: 'var(--teal)' },
  { key: 'estabilidade', short: 'Estabilidade', label: 'Estabilidade', hint: 'Contrato e segurança', color: 'var(--teal)' },
  { key: 'progressao', short: 'Progressão', label: 'Progressão', hint: 'Aprender e crescer', color: 'var(--teal)' },
  { key: 'proposito', short: 'Propósito', label: 'Propósito', hint: 'Trabalho com impacto', color: 'var(--teal)' },
];

export const CRITERION: Record<CriterionKey, Criterion> = Object.fromEntries(
  CRITERIA.map((c) => [c.key, c]),
) as Record<CriterionKey, Criterion>;

/** Pesos das 3 prioridades escolhidas, por ordem */
export const PREF_WEIGHTS = [3, 2, 1];

export const DEFAULT_PREFS: CriterionKey[] = ['respeito', 'salario', 'equilibrio'];
