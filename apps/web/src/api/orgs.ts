import { useMemo } from 'react';
import { ORGS, ORG_BY_ID, type Org } from '../data/orgs';
import { match } from '../lib/match';
import { useStore, type AddedOrg } from '../lib/store';

/**
 * Camada de dados do POC. Hoje lê os dados de exemplo em memória;
 * para ligar a um backend basta trocar estas funções por pedidos HTTP
 * (ex.: GET /orgs, GET /orgs/:id, GET /orgs?q=&type=) mantendo os mesmos tipos.
 */

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function fromAdded(a: AddedOrg): Org {
  return {
    id: a.id, name: a.name, type: a.type, sector: '—', city: a.city, district: a.city, people: 0, size: '1–9',
    score: 0, reviewsCount: 0, verifiedPct: 0, trend: 'novo', weekDelta: 0,
    scores: { salario: null, equilibrio: 0, respeito: 0, ambiente: 0, lideranca: 0, estabilidade: null, progressao: 0, proposito: 0 },
    summary: 'Organização nova. Ainda sem avaliações públicas.', respeitoTags: [], harassmentReports: 0,
    locations: [{ id: 'sede', label: 'Sede', address: a.city, lat: 41.15, lng: -8.61, mapX: 50, mapY: 50 }],
    reviews: [], interviews: [], salaries: [], claimed: false,
  };
}

/** Todas as organizações (incluindo as adicionadas por quem avalia) */
export function useOrgs(): Org[] {
  const { added } = useStore();
  return useMemo(() => [...ORGS, ...added.map(fromAdded)], [added]);
}

export function useOrg(id: string | null | undefined): Org | undefined {
  const all = useOrgs();
  if (!id) return undefined;
  return ORG_BY_ID[id] ?? all.find((o) => o.id === id);
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
