import { useEffect, useRef } from 'react';
import { track, type EventMap } from '.';
import { cleanSearchTerm } from './privacy';

/**
 * Mede uma pesquisa quando a pessoa pára de escrever (1,2 s) e os resultados chegaram,
 * ou quando sai do ecrã antes disso (ex.: escolhe logo um resultado).
 * No fluxo de avaliar nunca se envia o termo (revelaria onde a pessoa trabalha).
 */
export function useSearchTracking(context: 'pesquisa' | 'avaliar', q: string, resultsCount: number, loading: boolean, typeFilter?: string) {
  const pending = useRef<EventMap['search'] | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2 || loading) return;
    pending.current = {
      context,
      search_term: context === 'pesquisa' ? cleanSearchTerm(term) : undefined,
      results_count: resultsCount,
      type_filter: typeFilter && typeFilter !== 'Todas' ? typeFilter : undefined,
    };
    const t = setTimeout(() => {
      if (pending.current) track('search', pending.current);
      pending.current = null;
    }, 1200);
    return () => clearTimeout(t);
  }, [context, q, resultsCount, loading, typeFilter]);

  // Ao sair do ecrã, envia a última pesquisa que ainda não foi medida
  useEffect(
    () => () => {
      if (pending.current) track('search', pending.current);
      pending.current = null;
    },
    [],
  );
}
