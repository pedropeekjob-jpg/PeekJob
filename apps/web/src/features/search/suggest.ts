import { useEffect, useMemo, useState } from 'react';
import { api, apiMode } from '../../api/http';
import { norm, orgRoles, useOrgs } from '../../api/orgs';
import type { Org, OrgType } from '../../data/orgs';

/** Sugestões enquanto se escreve (21/10): em todos os campos de pesquisa */
export type Suggestion =
  | { kind: 'org'; id: string; label: string; city: string; type?: OrgType }
  | { kind: 'role' | 'sector' | 'place'; label: string; orgs?: number; district?: string };

export type SuggestKind = Suggestion['kind'];
export const ALL_KINDS: SuggestKind[] = ['org', 'role', 'sector', 'place'];

export interface SuggestResponse {
  orgs: { id: string; name: string; city: string; type?: OrgType }[];
  roles: { label: string; orgs: number }[];
  sectors: string[];
  places: string[];
}

/** A partir de quantas letras se sugere */
export const SUGGEST_MIN = 2;
const MAX_ORGS = 5;

/** Junta a resposta numa lista só, pela ordem: organizações, profissões, setores, sítios (só os tipos pedidos) */
export function flatten(r: SuggestResponse, kinds: SuggestKind[] = ALL_KINDS): Suggestion[] {
  const out: Suggestion[] = [];
  if (kinds.includes('org')) out.push(...r.orgs.map((o) => ({ kind: 'org' as const, id: o.id, label: o.name, city: o.city, type: o.type })));
  if (kinds.includes('role')) out.push(...r.roles.map((x) => ({ kind: 'role' as const, label: x.label, orgs: x.orgs })));
  if (kinds.includes('sector')) out.push(...r.sectors.map((label) => ({ kind: 'sector' as const, label })));
  if (kinds.includes('place')) out.push(...r.places.map((label) => ({ kind: 'place' as const, label })));
  return out;
}

const top = <T,>(m: Map<string, { label: string; n: number }>, n: number, then?: (x: { label: string; n: number }) => T) =>
  [...m.values()].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, 'pt')).slice(0, n).map((x) => (then ? then(x) : (x as T)));

/** Sugestões no browser (modo demonstração): as mesmas regras do servidor, sem acentos nem maiúsculas */
export function localSuggest(orgs: Org[], q: string): SuggestResponse {
  const nq = norm(q.trim());
  if (nq.length < SUGGEST_MIN) return { orgs: [], roles: [], sectors: [], places: [] };
  const named = orgs
    .filter((o) => norm(o.name).includes(nq))
    .sort((a, b) => Number(norm(b.name).startsWith(nq)) - Number(norm(a.name).startsWith(nq)) || a.name.localeCompare(b.name, 'pt'))
    .slice(0, MAX_ORGS);
  const count = (pick: (o: Org) => string[], match: (v: string) => boolean) => {
    const m = new Map<string, { label: string; n: number }>();
    for (const o of orgs)
      for (const v of new Set(pick(o))) {
        if (!v || !match(norm(v))) continue;
        const k = norm(v);
        m.set(k, { label: m.get(k)?.label ?? v, n: (m.get(k)?.n ?? 0) + 1 });
      }
    return m;
  };
  return {
    orgs: named.map((o) => ({ id: o.id, name: o.name, city: o.city, type: o.type })),
    roles: top(count(orgRoles, (v) => v.includes(nq)), 4, (x) => ({ label: x.label, orgs: x.n })),
    sectors: top(count((o) => [o.sector], (v) => v !== '—' && v.includes(nq)), 3, (x) => x.label),
    places: top(count((o) => [o.city, o.district], (v) => v.startsWith(nq)), 3, (x) => x.label),
  };
}

/** Sugestões para o termo (servidor no modo API, browser na demonstração), com uma pequena espera entre teclas */
export function useSuggestions(q: string, kinds: SuggestKind[] = ALL_KINDS): Suggestion[] {
  const orgs = useOrgs();
  const nq = q.trim();
  const [remote, setRemote] = useState<{ q: string; r: SuggestResponse } | null>(null);
  useEffect(() => {
    if (!apiMode || nq.length < SUGGEST_MIN) return;
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const r = await api<SuggestResponse>(`/orgs/suggest?${new URLSearchParams({ q: nq })}`);
        if (alive) setRemote({ q: nq, r });
      } catch {
        if (alive) setRemote({ q: nq, r: { orgs: [], roles: [], sectors: [], places: [] } });
      }
    }, 150);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [nq]);
  const key = kinds.join(',');
  return useMemo(() => {
    if (nq.length < SUGGEST_MIN) return [];
    // modo API: mostra a última resposta enquanto chega a nova (a lista não pisca a cada tecla)
    const r = apiMode ? remote?.r : localSuggest(orgs, nq);
    return r ? flatten(r, key.split(',') as SuggestKind[]) : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nq, orgs, remote, key]);
}
