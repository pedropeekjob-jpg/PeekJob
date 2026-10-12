import { PREF_WEIGHTS, type CriterionKey, type Scores } from './criteria';

/**
 * Compatibilidade "para ti": média ponderada das prioridades (pesos 3, 2, 1)
 * em percentagem da nota máxima. Critérios sem dados são ignorados.
 */
export function matchScores(scores: Partial<Scores>, prefs: CriterionKey[]): number {
  let sum = 0;
  let w = 0;
  prefs.forEach((k, i) => {
    const v = scores[k];
    if (v == null) return;
    const wi = PREF_WEIGHTS[i] ?? 1;
    sum += v * wi;
    w += wi;
  });
  return w ? Math.round((sum / (5 * w)) * 100) : 0;
}

/** Nota ajustada do ranking (média bayesiana): poucas avaliações ficam perto da média global */
export const BAYES_C = 5;
export const GLOBAL_MEAN = 3.8;
export const adjusted = (mean: number, n: number, C = BAYES_C, m = GLOBAL_MEAN) => (C * m + n * mean) / (C + n);
