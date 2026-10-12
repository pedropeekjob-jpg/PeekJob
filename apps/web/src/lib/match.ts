// Regras de compatibilidade partilhadas com a API.
import { matchScores } from '@peekjob/shared';
import type { CriterionKey } from '../data/criteria';
import type { Org } from '../data/orgs';

export { matchScores, adjusted, BAYES_C, GLOBAL_MEAN } from '@peekjob/shared';
export const match = (org: Org, prefs: CriterionKey[]) => matchScores(org.scores, prefs);
