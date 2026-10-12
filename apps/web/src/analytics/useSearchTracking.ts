import { useEffect } from 'react';
import { track } from '.';
import { cleanSearchTerm } from './privacy';

/**
 * Mede uma pesquisa quando a pessoa pára de escrever (1,2 s) e os resultados chegaram.
 * No fluxo de avaliar nunca se envia o termo (revelaria onde a pessoa trabalha).
 */
export function useSearchTracking(context: 'pesquisa' | 'avaliar', q: string, resultsCount: number, loading: boolean, typeFilter?: string) {
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2 || loading) return;
    const t = setTimeout(() => {
      track('search', {
        context,
        search_term: context === 'pesquisa' ? cleanSearchTerm(term) : undefined,
        results_count: resultsCount,
        type_filter: typeFilter && typeFilter !== 'Todas' ? typeFilter : undefined,
      });
    }, 1200);
    return () => clearTimeout(t);
  }, [context, q, resultsCount, loading, typeFilter]);
}
