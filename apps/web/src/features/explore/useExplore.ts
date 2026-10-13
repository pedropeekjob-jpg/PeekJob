import { useMemo } from 'react';
import { useOrgs, useRankedOrgs } from '../../api/orgs';
import { useStore } from '../../lib/store';
import { forYou, movers } from './explore';

/** Organizações "para ti" (ou pela nota, sem prioridades) */
export function useForYou() {
  const ranked = useRankedOrgs();
  const { prefs } = useStore();
  return useMemo(() => forYou(ranked, prefs.length > 0), [ranked, prefs.length]);
}

/** Subidas e descidas da semana (percorre e ordena todas: só quando a lista muda) */
export function useMovers() {
  const orgs = useOrgs();
  return useMemo(() => movers(orgs), [orgs]);
}
