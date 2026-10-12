/**
 * Uma organização criada por quem avalia nasce pendente (não aparece em público nem no ranking).
 * Passa a ativa quando o NIF é confirmado ou quando pessoas diferentes suficientes a avaliam.
 * (A aprovação por um moderador é uma ação explícita, fora desta regra.)
 */
export const MIN_REVIEWERS_TO_ACTIVATE = 3;

export interface ActivationState {
  status: 'pending' | 'active' | 'merged' | 'rejected';
  nifVerified: boolean;
  distinctReviewers: number;
}

export function shouldActivate(s: ActivationState): boolean {
  if (s.status !== 'pending') return false;
  return s.nifVerified || s.distinctReviewers >= MIN_REVIEWERS_TO_ACTIVATE;
}
