import type { Org, OrgLocation, OrgType, Review, Scores } from '../data/orgs';
import { ago } from '../lib/format';
import type { MyReview, SupportMessage } from '../lib/store';

/** Formas devolvidas pela API */
export interface ApiOrg {
  id: string;
  name: string;
  type: OrgType;
  city: string;
  /** distrito ou região autónoma; null se a cidade não for um concelho (ou for ambígua) */
  district?: string | null;
  sector?: string | null;
  status: 'active' | 'pending';
  reviewsCount?: number;
  score?: number | null;
  criteria?: Partial<Record<keyof Scores, number | null>>;
  locations?: { id: string; label: string | null; address: string; lat: number | null; lng: number | null }[];
  nifVerified?: boolean;
  harassmentReports?: number;
}
export interface ApiReview {
  id: string;
  scores: Partial<Scores>;
  avg: number;
  recommend: boolean | null;
  tags: string[];
  text: string;
  flagged: boolean;
  verified: boolean;
  /** quantas pessoas acharam útil (sem dizer quem) */
  helpful?: number;
  createdAt: string;
}

export const when = (iso: string) => ago(Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));

const KEYS: (keyof Scores)[] = ['salario', 'equilibrio', 'respeito', 'ambiente', 'lideranca', 'estabilidade', 'progressao', 'proposito'];

/** Posições dos pinos no mapa ilustrado a partir de lat/lng (20–80%) */
function mapLocations(locs: ApiOrg['locations'], city: string): OrgLocation[] {
  if (!locs?.length) return [{ id: 'sede', label: 'Sede', address: city, lat: 0, lng: 0, mapX: 50, mapY: 50 }];
  const withC = locs.filter((l) => l.lat != null && l.lng != null);
  const lats = withC.map((l) => l.lat!);
  const lngs = withC.map((l) => l.lng!);
  const [minLa, maxLa, minLo, maxLo] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  return locs.map((l, i) => ({
    id: l.id,
    label: l.label ?? l.address,
    address: l.address,
    lat: l.lat ?? 0,
    lng: l.lng ?? 0,
    mapX: l.lng != null && maxLo > minLo ? 20 + ((l.lng - minLo) / (maxLo - minLo)) * 60 : 50 + i * 8,
    mapY: l.lat != null && maxLa > minLa ? 80 - ((l.lat - minLa) / (maxLa - minLa)) * 60 : 50,
  }));
}

export function toReview(r: ApiReview): Review {
  return { id: r.id, role: 'Equipa', when: when(r.createdAt), score: r.avg, title: '', body: r.text, useful: r.helpful ?? 0, verified: r.verified, tags: r.tags };
}

/** Converte uma organização da API para o modelo usado pelos ecrãs (campos sem dados ficam vazios) */
export function toOrg(o: ApiOrg, reviews: ApiReview[] = []): Org {
  const scores = Object.fromEntries(KEYS.map((k) => [k, o.criteria?.[k] ?? null])) as Scores;
  return {
    id: o.id,
    name: o.name,
    type: o.type,
    sector: o.sector ?? '—',
    city: o.city,
    district: o.district ?? '',
    people: 0,
    size: '1–9',
    score: o.score ?? 0,
    reviewsCount: o.reviewsCount ?? 0,
    verifiedPct: reviews.length ? Math.round((reviews.filter((r) => r.verified).length / reviews.length) * 100) : 0,
    trend: 0,
    weekDelta: 0,
    scores,
    summary: '',
    respeitoTags: [],
    harassmentReports: o.harassmentReports ?? 0,
    locations: mapLocations(o.locations, o.city),
    reviews: reviews.map(toReview),
    interviews: [],
    salaries: [],
    claimed: false,
  };
}

export function toMyReview(r: ApiReview & { orgId: string }): MyReview {
  return { id: r.id, orgId: r.orgId, scores: r.scores, avg: r.avg, recommend: r.recommend, tags: r.tags, text: r.text, when: when(r.createdAt), flagged: r.flagged, verified: r.verified };
}

export function toMessage(m: {
  id: string;
  kinds: string[];
  createdAt: string;
  read: boolean;
  orgName?: string;
  type?: 'support' | 'moderation';
  details?: SupportMessage['details'];
}): SupportMessage {
  return { id: m.id, orgId: '', kinds: m.kinds, found: [], when: when(m.createdAt), read: m.read, type: m.type ?? 'support', orgName: m.orgName ?? m.details?.orgName, details: m.details ?? null };
}
