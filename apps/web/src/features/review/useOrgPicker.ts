import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSearchTracking } from '../../analytics/useSearchTracking';
import { useOrg, useOrgs, useSearch } from '../../api/orgs';
import type { Org } from '../../data/orgs';
import { useStore } from '../../lib/store';

export type PickStep = 'pick' | 'confirm' | 'add';

/** Quantos resultados mostrar: computador 5; telemóvel 6 a pesquisar, 4 sem pesquisa (as mais procuradas) */
export const visibleCount = (desktop: boolean, searching: boolean) => (desktop ? 5 : searching ? 6 : 4);

/**
 * Escolher a organização e o local a avaliar: pesquisa (com medição), passos e pré-seleção (?org= ou o rascunho).
 * `confirm()` grava a escolha no rascunho; o ecrã decide para onde ir a seguir.
 */
export function useOrgPicker(desktop: boolean) {
  const [params] = useSearchParams();
  const orgs = useOrgs();
  const { draft, startDraft } = useStore();

  const initialId = params.get('org') ?? draft.orgId;
  const initialOrg = initialId ? orgs.find((o) => o.id === initialId) : undefined;
  const [query, setQueryState] = useState('');
  const [step, setStep] = useState<PickStep>(initialOrg ? 'confirm' : 'pick');
  const [chosenId, setChosenId] = useState<string | null>(initialOrg?.id ?? null);
  const [locationId, setLocationId] = useState<string | null>(
    initialOrg ? (initialOrg.id === draft.orgId && draft.locationId ? draft.locationId : initialOrg.locations[0]?.id ?? null) : null,
  );

  const q = query.trim();
  const search = useSearch(q, { includePending: true });
  useSearchTracking('avaliar', q, search.items.length, search.loading);
  // sem pesquisa: as mais avaliadas (ordenar só quando a lista muda)
  const results = useMemo(() => (q ? search.items : [...orgs].sort((a, b) => b.reviewsCount - a.reviewsCount)), [orgs, q, search.items]);
  const visible = results.slice(0, visibleCount(desktop, !!q));

  const chosen = useOrg(chosenId);
  // o local tem de existir na organização (em modo API os locais chegam depois)
  const effectiveLocation = chosen && chosen.locations.some((l) => l.id === locationId) ? locationId : chosen?.locations[0]?.id ?? null;

  const setQuery = useCallback(
    (v: string) => {
      setQueryState(v);
      if (desktop) setStep((s) => (s === 'confirm' ? 'pick' : s));
    },
    [desktop],
  );

  const pick = useCallback(
    (o: Org) => {
      setChosenId(o.id);
      setLocationId(o.id === draft.orgId && draft.locationId ? draft.locationId : o.locations[0]?.id ?? null);
      setStep('confirm');
    },
    [draft.locationId, draft.orgId],
  );

  /** Grava a organização e o local escolhidos no rascunho */
  const confirm = useCallback((): boolean => {
    if (step !== 'confirm' || !chosen) return false;
    startDraft(chosen.id, effectiveLocation);
    return true;
  }, [chosen, effectiveLocation, startDraft, step]);

  return { query, q, setQuery, results, visible, step, setStep, chosen, effectiveLocation, setLocationId, pick, confirm };
}
