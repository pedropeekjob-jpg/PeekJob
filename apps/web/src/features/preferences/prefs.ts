import { CRITERION, type CriterionKey } from '../../data/criteria';
import { tr } from '../../i18n';

/** Regras da escolha de prioridades (funções puras: testadas sem React) */

export const MAX_PICKS = 3;

/** Tocar escolhe (até ao máximo) ou tira; a ordem é a ordem dos toques */
export function togglePick(picks: CriterionKey[], k: CriterionKey): CriterionKey[] {
  if (picks.includes(k)) return picks.filter((x) => x !== k);
  return picks.length < MAX_PICKS ? [...picks, k] : picks;
}

export const isComplete = (picks: CriterionKey[]) => picks.length === MAX_PICKS;

/** Linha de estado: as escolhas (telemóvel, completas) ou quantas faltam */
export function statusText(picks: CriterionKey[], desktop: boolean) {
  const n = picks.length;
  if (desktop) return tr(`${n} de 3 · clica de novo para tirar`, `${n} of 3 · click again to remove`);
  if (isComplete(picks)) return picks.map((k) => CRITERION[k].label).join(' · ');
  return tr(`${n} de 3 · toca de novo para tirar`, `${n} of 3 · tap again to remove`);
}

export function ctaText(picks: CriterionKey[]) {
  const missing = MAX_PICKS - picks.length;
  return missing === 0 ? tr('Ver organizações para mim', 'Show organisations for me') : tr(`Escolhe mais ${missing}`, `Choose ${missing} more`);
}

export const rankText = (i: number) => tr(`, prioridade ${i + 1}`, `, priority ${i + 1}`);

/** Fundo de uma opção escolhida (respeito é roxo, os outros verde-água) */
export const tintOf = (k: CriterionKey) => (k === 'respeito' ? 'var(--purple-tint)' : 'var(--teal-tint)');

/** Cor do anel de uma posição ainda por escolher */
export const EMPTY_RANK = '#C9CDD0';
