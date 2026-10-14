import { CRITERIA, type CriterionKey } from '../../data/criteria';
import { BAD_TAGS, REVIEW_TAGS } from '../../data/content';
import type { Scores } from '../../data/orgs';
import { tr } from '../../i18n';

/** Regras partilhadas pelos ecrãs do fluxo de avaliar (funções puras: testadas sem React) */

/** Ordem dos critérios no telemóvel (Respeito primeiro, como no design) */
export const MOBILE_ORDER: CriterionKey[] = ['respeito', 'salario', 'equilibrio', 'ambiente', 'lideranca', 'estabilidade', 'progressao', 'proposito'];
/** Ordem dos critérios no computador (ordem canónica) */
export const DESKTOP_ORDER: CriterionKey[] = CRITERIA.map((c) => c.key);

export const scoreOf = (scores: Partial<Scores>, k: CriterionKey) => {
  const v = scores[k];
  return typeof v === 'number' && v > 0 ? v : 0;
};
/** Notas com a do critério k mudada (0 tira a nota) */
export function withScore(scores: Partial<Scores>, k: CriterionKey, n: number): Partial<Scores> {
  const next = { ...scores };
  if (n) next[k] = n;
  else delete next[k];
  return next;
}

/** Junta ou tira uma etiqueta */
export const toggleIn = (list: string[], item: string) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

export const countDone = (scores: Partial<Scores>) => DESKTOP_ORDER.filter((k) => scoreOf(scores, k) > 0).length;

/** Nota de destino de uma tecla num grupo 1–5 (setas, Home, End); null para outras teclas */
export function scoreForKey(key: string, current: number): number | null {
  const next = ({ ArrowRight: current + 1, ArrowUp: current + 1, ArrowLeft: current - 1, ArrowDown: current - 1, Home: 1, End: 5 } as Record<string, number>)[key];
  return next == null ? null : Math.min(5, Math.max(1, next));
}

/** Só um botão por critério entra no Tab: a nota escolhida, ou a primeira */
export const isTabStop = (n: number, value: number) => (value ? n === value : n === 1);

export const STEP_LABELS = () => [tr('Organização', 'Organisation'), tr('Verificação', 'Verification'), tr('Avaliação', 'Review')];
export const STEP_ROUTES = ['/avaliar', '/avaliar/verificar', '/avaliar/notas'];
export type StepState = 'done' | 'current' | 'todo';
export const stepState = (n: number, current: number): StepState => (n < current ? 'done' : n === current ? 'current' : 'todo');

/** Etiquetas pela ordem a mostrar (as más primeiro, se pedido) */
export const tagOrder = (badFirst: boolean) => (badFirst ? [...BAD_TAGS, ...REVIEW_TAGS.filter((t) => !BAD_TAGS.includes(t))] : REVIEW_TAGS);
export const isBadTag = (t: string) => BAD_TAGS.includes(t);

/** As primeiras `visible` e as escolhidas (ou todas, se abertas) */
export const visibleTags = (all: readonly string[], chosen: readonly string[], visible: number, open: boolean) =>
  all.filter((t, i) => open || i < visible || chosen.includes(t));
