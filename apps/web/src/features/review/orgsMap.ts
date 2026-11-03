import { hasCoords } from '../../components/map';
import type { Org } from '../../data/orgs';

/** Mapa das organizações já avaliadas (03/11), para quem vai avaliar encontrar o local de trabalho. Regras puras. */

export interface MapPin {
  orgId: string;
  locationId: string;
  name: string;
  /** nome do local (ex.: «Loja · Rua das Flores») */
  place: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  score: number;
  reviewsCount: number;
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Um pino por local com coordenadas das organizações já avaliadas. Nome individual fica de fora: a morada
 * pode ser a casa de alguém. Só a nota geral da organização (nunca contagens por local, que numa casa
 * pequena apontavam para quem avaliou).
 */
export const orgPins = (orgs: Org[]): MapPin[] =>
  orgs
    .filter((o) => o.reviewsCount > 0 && o.type !== 'Nome individual')
    .flatMap((o) =>
      o.locations.filter(hasCoords).map((l) => ({
        orgId: o.id,
        locationId: l.id,
        name: o.name,
        place: l.label,
        address: l.address,
        city: o.city,
        lat: l.lat,
        lng: l.lng,
        score: o.score,
        reviewsCount: o.reviewsCount,
      })),
    );

/** Procura nos pinos pelo nome, localidade, local ou morada (sem acentos nem maiúsculas); vazio: todos */
export function matchPins(pins: MapPin[], q: string): MapPin[] {
  const nq = norm(q.trim());
  if (!nq) return pins;
  return pins.filter((p) => norm(`${p.name} ${p.city} ${p.place} ${p.address}`).includes(nq));
}

export const pinKey = (p: Pick<MapPin, 'orgId' | 'locationId'>) => `${p.orgId}:${p.locationId}`;
