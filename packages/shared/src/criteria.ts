export const CRITERION_KEYS = [
  'salario',
  'equilibrio',
  'respeito',
  'ambiente',
  'lideranca',
  'estabilidade',
  'progressao',
  'proposito',
] as const;

export type CriterionKey = (typeof CRITERION_KEYS)[number];
export type Scores = Record<CriterionKey, number | null>;

export interface Criterion {
  key: CriterionKey;
  short: string;
  label: string;
  hint: string;
}

export const CRITERIA: Criterion[] = [
  { key: 'salario', short: 'Salário', label: 'Salário justo', hint: 'Pago a horas, sem surpresas' },
  { key: 'equilibrio', short: 'Equilíbrio', label: 'Equilíbrio', hint: 'Horários que se cumprem' },
  { key: 'respeito', short: 'Respeito', label: 'Respeito e inclusão', hint: 'Direitos, diversidade, sem assédio' },
  { key: 'ambiente', short: 'Ambiente', label: 'Ambiente', hint: 'Colegas e entreajuda' },
  { key: 'lideranca', short: 'Liderança', label: 'Liderança', hint: 'Chefias que ouvem' },
  { key: 'estabilidade', short: 'Estabilidade', label: 'Estabilidade', hint: 'Contrato e segurança' },
  { key: 'progressao', short: 'Progressão', label: 'Progressão', hint: 'Aprender e crescer' },
  { key: 'proposito', short: 'Propósito', label: 'Propósito', hint: 'Trabalho com impacto' },
];

/** Pesos das 3 prioridades escolhidas, por ordem */
export const PREF_WEIGHTS = [3, 2, 1];
export const DEFAULT_PREFS: CriterionKey[] = ['respeito', 'salario', 'equilibrio'];

/**
 * O foco são as pequenas, mas qualquer empresa pode ser avaliada.
 * 25/10 (cliente): "PME" e "Grande empresa" passam a um só tipo, "Empresa"; a dimensão (1–9 … 250+) é que distingue.
 */
export const ORG_TYPES = ['Empresa', 'Associação', 'Voluntariado', 'Nome individual'] as const;
export type OrgType = (typeof ORG_TYPES)[number];
/** Os tipos antigos (links guardados, importações, versões anteriores da app) passam a "Empresa" */
const LEGACY_TYPES: Record<string, OrgType> = { PME: 'Empresa', 'Grande empresa': 'Empresa' };
export const normalizeOrgType = <T>(t: T): T | OrgType => (typeof t === 'string' && LEGACY_TYPES[t]) || t;

export const GOOD_TAGS = ['Ambiente seguro', 'Horários cumpridos', 'Igualdade salarial', 'Horários para quem cuida'] as const;
export const BAD_TAGS = ['Salário em atraso', 'Horas extra não pagas', 'Sem contrato', 'Discriminação'] as const;
export const REVIEW_TAGS = [...GOOD_TAGS, ...BAD_TAGS] as const;

export const REVIEW_TEXT_MAX = 600;
