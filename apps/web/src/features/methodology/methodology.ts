import { CRITERION, PREF_WEIGHTS, type CriterionKey } from '../../data/criteria';
import { ORG_BY_ID, type Scores } from '../../data/orgs';
import { tr } from '../../i18n';
import { adjusted, BAYES_C } from '../../lib/match';

/** Regras e contas da página "como calculamos" (funções puras: testadas sem React) */

/** Mínimos públicos: nota visível e entrada no ranking */
export const MIN_SCORE = 3;
export const MIN_RANK = 5;

/** Organizações de exemplo para a demonstração da "% para ti" */
export const EXAMPLE_ORGS = ['padaria-ribeira', 'maos-dadas', 'norte-logistica'].map((id) => ORG_BY_ID[id]).filter(Boolean);

/** Cenários da demonstração da nota ajustada */
export const SCENARIOS = [
  { k: 'boa', label: () => tr('Boas · 4,6', 'Good · 4.6'), real: 4.6 },
  { k: 'ma', label: () => tr('Más · 2,4', 'Bad · 2.4'), real: 2.4 },
] as const;
export type ScenarioKey = (typeof SCENARIOS)[number]['k'];
export const realOf = (k: ScenarioKey) => SCENARIOS.find((s) => s.k === k)!.real;

/** Atalhos do n.º de avaliações */
export const QUICK = [0, 3, 5, 10, 25, 50];

/** Perímetro do anel da demonstração (raio 80 no viewBox de 188) */
export const RING_CIRC = 2 * Math.PI * 80;

/** Estado da demonstração para uma média real e n avaliações */
export function demoState(real: number, n: number) {
  const adj = adjusted(real, n);
  const shown = n >= MIN_SCORE;
  let status: string;
  if (n < MIN_SCORE) status = tr(`Ainda sem nota · faltam ${MIN_SCORE - n}`, `No score yet · ${MIN_SCORE - n} to go`);
  else if (n < MIN_RANK) status = tr('Nota visível · fora do ranking', 'Score visible · not ranked');
  else status = tr('Nota visível · no ranking', 'Score visible · ranked');
  return {
    adj,
    shown,
    status,
    /** quanto da nota já vem das avaliações reais */
    share: Math.round((n / (n + BAYES_C)) * 100),
    /** parte do anel por preencher (stroke-dashoffset) */
    offset: RING_CIRC * (1 - adj / 5),
  };
}

/** "3, 2 e 1" */
export const weightsText = (count: number) =>
  PREF_WEIGHTS.slice(0, count)
    .join(', ')
    .replace(/, (\d)$/, tr(' e $1', ' and $1'));

/** Contas da "% para ti": nota × peso por prioridade (os critérios sem nota não contam) */
export function pctBreakdown(scores: Scores, prefs: CriterionKey[]) {
  let sum = 0;
  let wsum = 0;
  const rows = prefs.map((k, i) => {
    const v = scores[k];
    const w = PREF_WEIGHTS[i] ?? 1;
    if (v != null) {
      sum += v * w;
      wsum += w;
    }
    return { k, c: CRITERION[k], v, w, rank: i + 1 };
  });
  return { rows, sum, wsum };
}
