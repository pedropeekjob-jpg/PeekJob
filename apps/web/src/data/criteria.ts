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
  /** Explicação mais completa, no ícone de ajuda (?) ao avaliar */
  help: string;
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
    get help() { return tr(HELP[key][0], HELP[key][1]); },
  };
}

/** O que conta em cada critério (ajuda ao avaliar, 21/10) */
const HELP: Record<CriterionKey, [string, string]> = {
  salario: ['O salário é justo para o trabalho que fazes e chega a horas, com recibo e sem cortes surpresa.', 'Pay is fair for the work you do and arrives on time, with a payslip and no surprise deductions.'],
  equilibrio: ['Os horários cumprem-se, as folgas e férias respeitam-se e sobra tempo para a tua vida.', 'Hours are kept, days off and holidays are respected and you have time for your life.'],
  respeito: ['Toda a gente é tratada com respeito, sem assédio nem discriminação, seja qual for o género, a origem, a idade ou a orientação.', 'Everyone is treated with respect, without harassment or discrimination, whatever their gender, origin, age or orientation.'],
  ambiente: ['Como é o dia a dia com a equipa: entreajuda, confiança e bom ambiente.', 'What day-to-day life with the team is like: helping each other, trust and a good atmosphere.'],
  lideranca: ['As chefias ouvem, explicam as decisões e tratam toda a gente da mesma maneira.', 'Managers listen, explain decisions and treat everyone the same way.'],
  estabilidade: ['Tens contrato, sabes com o que contas e não vives com medo de perder o trabalho.', 'You have a contract, you know where you stand and you don’t live in fear of losing your job.'],
  progressao: ['Aprendes, tens formação e há caminho para crescer ou mudar de função.', 'You learn, get training and there is a way to grow or change roles.'],
  proposito: ['Sentes que o teu trabalho é útil e faz diferença para alguém.', 'You feel your work is useful and makes a difference to someone.'],
};

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
