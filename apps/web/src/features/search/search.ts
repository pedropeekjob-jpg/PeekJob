import type { CriterionKey } from '../../data/criteria';
import { ORG_TYPES, type Org } from '../../data/orgs';
import { tr } from '../../i18n';
import { fmt, plural } from '../../lib/format';
import { match } from '../../lib/match';

/** Regras e textos da pesquisa (funções puras: testadas sem React) */

/** Tempo do estado "a procurar" depois de cada mudança do termo */
export const SEARCH_MS = 900;
/** Resultados visíveis no computador antes de "ver mais" */
export const LIMIT = 6;
export const TYPES = ['Todas', ...ORG_TYPES] as const;
export type TypeFilter = (typeof TYPES)[number];

export interface Result {
  org: Org;
  /** Compatibilidade (0–100); null sem avaliações */
  match: number | null;
}

/** Compatibilidade: pelas prioridades, ou a nota em percentagem quando não há prioridades */
export function compatibility(org: Org, prefs: CriterionKey[]): number | null {
  if (org.reviewsCount <= 0) return null;
  return prefs.length ? match(org, prefs) : Math.round((org.score / 5) * 100);
}

/** Ordena pela compatibilidade (sem avaliações no fim) e, em empate, pela nota */
export function rankResults(orgs: Org[], prefs: CriterionKey[]): Result[] {
  return orgs
    .map((org) => ({ org, match: compatibility(org, prefs) }))
    .sort((a, b) => (b.match ?? -1) - (a.match ?? -1) || b.org.score - a.org.score);
}

/** É preciso procurar de novo? (o termo mudou, ou ainda não acabou a procura anterior) */
export const needsSearch = (q: string, applied: string, loading: boolean) => loading || q.trim() !== applied.trim();

export function countText(n: number, desktop: boolean) {
  if (desktop) return `${n === 1 ? tr('1 resultado', '1 result') : tr(`${n} resultados`, `${n} results`)}${tr(', por compatibilidade', ', by match')}`;
  return n === 1 ? tr('1 resultado, ordenado para ti', '1 result, sorted for you') : tr(`${n} resultados, ordenados para ti`, `${n} results, sorted for you`);
}

export function emptyTitle(applied: string) {
  const q = applied.trim();
  return q ? tr(`Nada encontrado para “${q}”`, `Nothing found for “${q}”`) : tr('Nada encontrado com este filtro', 'Nothing found with this filter');
}

export function ringLabel(org: Org) {
  if (!org.reviewsCount) return tr('Ainda sem avaliações', 'No reviews yet');
  return tr(
    `Nota ${fmt(org.score)} de 5, ${plural(org.reviewsCount, 'avaliação', 'avaliações')}`,
    `Score ${fmt(org.score)} out of 5, ${plural(org.reviewsCount, 'review', 'reviews')}`,
  );
}

/** Larguras (%) das duas linhas de cada cartão esqueleto */
export const SKELETON: readonly (readonly [number, number])[] = [
  [70, 45],
  [85, 60],
  [60, 35],
  [78, 53],
  [66, 41],
];
