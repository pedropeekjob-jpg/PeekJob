import { useMemo } from 'react';
import { useOrgs, useRankedOrgs } from '../../api/orgs';
import { useStore } from '../../lib/store';
import { forYou, movers } from './explore';

/**
 * Organizações "para ti" pelas prioridades escolhidas, ou pela nota.
 * Antes de escolher (primeira visita) as prioridades são só as de omissão: ordena-se pela nota.
 * `personal`: há prioridades escolhidas (mostra-se a % de compatibilidade); `chosen`: a pessoa já passou pela escolha.
 */
export function useForYou() {
  const ranked = useRankedOrgs();
  const { prefs, onboarded } = useStore();
  const personal = onboarded && prefs.length > 0;
  const list = useMemo(() => forYou(ranked, personal), [ranked, personal]);
  return { list, personal, chosen: onboarded };
}

/** Subidas e descidas da semana (percorre e ordena todas: só quando a lista muda) */
export function useMovers() {
  const orgs = useOrgs();
  return useMemo(() => movers(orgs), [orgs]);
}
