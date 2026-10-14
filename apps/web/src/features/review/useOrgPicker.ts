import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
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

  const fromLink = params.get('org');
  const initialId = fromLink ?? draft.orgId;
  const initialOrg = initialId ? orgs.find((o) => o.id === initialId) : undefined;
  // ?q= vem da página inicial ("O teu trabalho"): a pesquisa já vem escrita
  const [query, setQueryState] = useState(params.get('q') ?? '');
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

  /**
   * Escolher uma organização. Com um só local não há nada a perguntar: grava no rascunho e devolve true
   * (o ecrã segue logo para as notas). Com vários, pergunta o local.
   */
  const pick = useCallback(
    (o: Org): boolean => {
      const loc = o.id === draft.orgId && draft.locationId ? draft.locationId : o.locations[0]?.id ?? null;
      setChosenId(o.id);
      setLocationId(loc);
      if (o.locations.length <= 1) {
        startDraft(o.id, loc);
        return true;
      }
      setStep('confirm');
      return false;
    },
    [draft.locationId, draft.orgId, startDraft],
  );

  /** Vindo de "Avaliar esta organização" (?org=) com um só local: segue logo para as notas */
  const autoStart = !!fromLink && !!initialOrg && initialOrg.locations.length <= 1;

  /** Grava a organização e o local escolhidos no rascunho */
  const confirm = useCallback((): boolean => {
    if (step !== 'confirm' || !chosen) return false;
    startDraft(chosen.id, effectiveLocation);
    return true;
  }, [chosen, effectiveLocation, startDraft, step]);

  return { query, q, setQuery, results, visible, step, setStep, chosen, effectiveLocation, setLocationId, pick, confirm, autoStart };
}
