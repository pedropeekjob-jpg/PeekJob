import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useOrgs, useSearch } from '../../api/orgs';
import { useSearchTracking } from '../../analytics/useSearchTracking';
import { useStore } from '../../lib/store';
import { needsSearch, rankResults, SEARCH_MS, type TypeFilter } from './search';

/**
 * Cada mudança do termo mostra "a procurar" durante SEARCH_MS e só depois aplica-o.
 * `onSettle` corre quando o termo é aplicado, com o termo.
 */
export function useAppliedQuery(q: string, onSettle: (applied: string) => void) {
  const [applied, setApplied] = useState(q);
  const [loading, setLoading] = useState(q.trim() !== '');
  const latest = useRef({ applied, loading, onSettle });
  useEffect(() => {
    latest.current = { applied, loading, onSettle };
  });

  useEffect(() => {
    if (!needsSearch(q, latest.current.applied, latest.current.loading)) return;
    setLoading(true);
    const t = window.setTimeout(() => {
      setApplied(q);
      setLoading(false);
      latest.current.onSettle(q);
    }, SEARCH_MS);
    return () => window.clearTimeout(t);
  }, [q]);

  return { applied, loading };
}

/**
 * Estado do ecrã de pesquisa. O termo aplicado vive no endereço (?q=), que só muda quando a pesquisa é aplicada:
 * mudar o endereço a cada tecla fazia voltar a correr a app inteira, do router ao rodapé (medido com react:profile).
 */
export function useSearchPage() {
  const [params, setParams] = useSearchParams();
  const urlQ = params.get('q') ?? '';
  const total = useOrgs().length;
  const { prefs } = useStore();

  const [text, setText] = useState(urlQ);
  const [type, setType] = useState<TypeFilter>('Todas');
  const [more, setMore] = useState(false);
  const showMore = useCallback(() => setMore(true), []);

  const urlRef = useRef(urlQ);
  useEffect(() => {
    urlRef.current = urlQ;
  });
  // termo aplicado → endereço (sem entrada nova no histórico) e volta a mostrar só os primeiros
  const onSettle = useCallback(
    (q: string) => {
      setMore(false);
      if (q !== urlRef.current) setParams(q ? { q } : {}, { replace: true });
    },
    [setParams],
  );
  const { applied, loading } = useAppliedQuery(text, onSettle);

  // o endereço mudou por fora (voltar atrás, ligação do início): atualiza o campo
  useEffect(() => {
    setText(urlQ);
  }, [urlQ]);

  const onText = useCallback((v: string) => setText(v), []);
  const clear = useCallback(() => onText(''), [onText]);
  const pickType = useCallback((t: TypeFilter) => {
    setType(t);
    setMore(false);
  }, []);
  const reset = useCallback(() => {
    onText('');
    pickType('Todas');
  }, [onText, pickType]);

  const found = useSearch(applied, { type });
  useSearchTracking('pesquisa', applied, found.items.length, found.loading, type);
  const results = useMemo(() => rankResults(found.items, prefs), [found.items, prefs]);

  return { text, onText, clear, type, pickType, reset, loading, results, applied, total, more, showMore, prefs };
}

export type SearchState = ReturnType<typeof useSearchPage>;
