import { districtOf } from '@peekjob/shared';
import { useEffect, useMemo, useState } from 'react';
import { ORGS, ORG_BY_ID, type Org } from '../data/orgs';
import { match } from '../lib/match';
import { useStore, type AddedOrg } from '../lib/store';
import { api, apiMode } from './http';
import { toOrg, type ApiOrg } from './mappers';
import { withShared } from '../features/share/share';

/**
 * Camada de dados dos ecrãs.
 * - Modo demonstração: dados de exemplo em memória.
 * - Modo API (VITE_API_URL): listas e detalhes vêm da API; os tipos mantêm-se.
 */

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function fromAdded(a: AddedOrg): Org {
  return {
    id: a.id, name: a.name, type: a.type, sector: '—', city: a.city, district: districtOf(a.city) ?? '', people: 0, size: '1–9',
    score: 0, reviewsCount: 0, verifiedPct: 0, trend: 'novo', weekDelta: 0,
    scores: { salario: null, equilibrio: 0, respeito: 0, ambiente: 0, lideranca: 0, estabilidade: null, progressao: 0, proposito: 0 },
    summary: 'Organização nova. Ainda sem avaliações públicas.', respeitoTags: [], harassmentReports: 0,
    locations: [{ id: 'sede', label: 'Sede', address: a.city, lat: 41.15, lng: -8.61, mapX: 50, mapY: 50 }],
    reviews: [], interviews: [], salaries: [], claimed: false,
  };
}

/** Todas as organizações (incluindo as adicionadas por quem avalia) */
export function useOrgs(): Org[] {
  const { added, remote, shared } = useStore();
  return useMemo(() => {
    if (!apiMode) return [...ORGS, ...added.map(fromAdded)].map((o) => withShared(o, shared));
    const list = (remote.orgs ?? []).map((o) => remote.details[o.id] ?? o);
    const ids = new Set(list.map((o) => o.id));
    const extra: Org[] = [];
    for (const o of [...Object.values(remote.known), ...added.map(fromAdded)]) {
      if (!ids.has(o.id)) {
        ids.add(o.id);
        extra.push(o);
      }
    }
    return [...list, ...extra];
  }, [added, remote, shared]);
}

export function useOrg(id: string | null | undefined): Org | undefined {
  const all = useOrgs();
  const { remote, loadOrg } = useStore();
  const detailed = id ? remote.details[id] : undefined;
  const missing = id ? remote.missing[id] : false;
  useEffect(() => {
    if (apiMode && id && !detailed && !missing && !id.startsWith('nova-')) void loadOrg(id);
  }, [id, detailed, missing, loadOrg]);
  if (!id) return undefined;
  if (!apiMode) return all.find((o) => o.id === id);
  return detailed ?? all.find((o) => o.id === id);
}

/** 'loading' enquanto a API ainda não respondeu (evita mostrar "não encontrada" por engano) */
export function useOrgStatus(id: string | null | undefined): 'ok' | 'loading' | 'missing' {
  const org = useOrg(id);
  const { remote } = useStore();
  if (org) return 'ok';
  if (!apiMode || !id) return 'missing';
  if (remote.missing[id]) return 'missing';
  return 'loading';
}

/** Organizações com a compatibilidade para as prioridades actuais, ordenadas por compatibilidade */
export function useRankedOrgs() {
  const orgs = useOrgs();
  const { prefs } = useStore();
  return useMemo(
    () => orgs.filter((o) => o.reviewsCount > 0).map((o) => ({ org: o, match: match(o, prefs) })).sort((a, b) => b.match - a.match),
    [orgs, prefs],
  );
}

export function searchOrgs(orgs: Org[], q: string, type: string | 'Todas' = 'Todas') {
  const nq = norm(q.trim());
  return orgs.filter(
    (o) => (!nq || norm(`${o.name} ${o.type} ${o.sector} ${o.city}`).includes(nq)) && (type === 'Todas' || o.type === type),
  );
}

/**
 * Pesquisa: local no modo demonstração; no modo API usa a pesquisa tolerante do servidor
 * (acentos, erros, nomes antigos). includePending=true no fluxo de avaliar.
 */
export function useSearch(q: string, opts: { type?: string; includePending?: boolean } = {}) {
  const orgs = useOrgs();
  const { remember } = useStore();
  const [remoteRes, setRemoteRes] = useState<{ key: string; items: Org[] } | null>(null);
  const nq = q.trim();
  const type = opts.type && opts.type !== 'Todas' ? opts.type : undefined;
  const pending = !!opts.includePending;
  const key = `${nq}|${type ?? ''}|${pending}`;

  useEffect(() => {
    if (!apiMode || !nq) return;
    let alive = true;
    const t = setTimeout(async () => {
      const params = new URLSearchParams({ q: nq });
      if (type) params.set('type', type);
      if (pending) params.set('includePending', 'true');
      try {
        const r = await api<{ items: ApiOrg[] }>(`/orgs/search?${params}`);
        const items = r.items.map((o) => toOrg(o));
        for (const o of items) remember(o);
        if (alive) setRemoteRes({ key, items });
      } catch {
        if (alive) setRemoteRes({ key, items: [] });
      }
    }, 200);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [key, nq, type, pending, remember]);

  return useMemo(() => {
    if (!apiMode || !nq) return { items: searchOrgs(orgs, nq, type ?? 'Todas'), loading: false };
    const fresh = remoteRes?.key === key;
    const byId = new Map(orgs.map((o) => [o.id, o]));
    return { items: (fresh ? remoteRes!.items : []).map((o) => byId.get(o.id) ?? o), loading: !fresh };
  }, [orgs, nq, type, key, remoteRes]);
}
