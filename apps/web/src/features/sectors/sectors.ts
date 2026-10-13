import { ORG_TYPES, type Org, type OrgType } from '../../data/orgs';

/** Agregados por tipo e por setor (funções puras: testadas sem React) */

export type SectorSort = 'nota' | 'resp' | 'n';

export interface Aggregate {
  n: number;
  score: number;
  resp: number;
}

/** Nota e Respeito médios, ponderados pelo n.º de avaliações */
export function aggregate(orgs: Org[]): Aggregate {
  let weight = 0;
  let score = 0;
  let resp = 0;
  for (const o of orgs) {
    weight += o.reviewsCount;
    score += o.reviewsCount * o.score;
    resp += o.reviewsCount * (o.scores.respeito ?? 0);
  }
  return { n: orgs.length, score: weight ? score / weight : 0, resp: weight ? resp / weight : 0 };
}

/** Cartões dos tipos de organização, pela ordem fixa dos tipos */
export const typeCards = (orgs: Org[]) => ORG_TYPES.map((t) => ({ t, ...aggregate(orgs.filter((o) => o.type === t)) }));

const BY: Record<SectorSort, (x: Aggregate, y: Aggregate) => number> = {
  nota: (x, y) => y.score - x.score,
  resp: (x, y) => y.resp - x.resp,
  n: (x, y) => y.n - x.n || y.score - x.score,
};

/** Setores (do tipo escolhido, ou de todos), ordenados */
export function sectorRows(orgs: Org[], type: OrgType | null, sort: SectorSort) {
  const pool = type ? orgs.filter((o) => o.type === type) : orgs;
  const names = Array.from(new Set(pool.map((o) => o.sector)));
  return names.map((name) => ({ name, ...aggregate(pool.filter((o) => o.sector === name)) })).sort(BY[sort]);
}

/** Ligações ao ranking com o tipo (e o setor) escolhidos */
export const rankingHref = (type: OrgType | null) => (type ? `/ranking?tipo=${encodeURIComponent(type)}` : '/ranking');
export const sectorHref = (type: OrgType | null, sector: string) => `/ranking?${type ? `tipo=${encodeURIComponent(type)}&` : ''}setor=${encodeURIComponent(sector)}`;
