import { useCallback, useState } from 'react';
import type { OrgLocation } from '../data/orgs';

/** Regras do mapa (puras, testadas sem o Leaflet) */

/** Um local entra no mapa real se tiver coordenadas (os adicionados à mão ainda não têm: 0,0) */
export const hasCoords = (l: OrgLocation) => Number.isFinite(l.lat) && Number.isFinite(l.lng) && !(l.lat === 0 && l.lng === 0);
export const mapPoints = (locations: OrgLocation[]) => locations.filter(hasCoords);

export interface Tiles {
  url: string;
  attribution: string;
}
const DEFAULT_TILES: Tiles = { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '© OpenStreetMap' };

/** Mosaicos: os que o servidor configura (/pj-config.js), ou o OpenStreetMap (demonstração) */
export const tilesConfig = (cfg: { tiles?: Tiles } | undefined = typeof window === 'undefined' ? undefined : window.__PJ__): Tiles => cfg?.tiles ?? DEFAULT_TILES;

const KEY = 'pj-map';

/**
 * O mapa real carrega imagens de outro site (o IP da pessoa chega a esse fornecedor): só depois de a pessoa
 * pedir. A escolha fica neste browser; sem armazenamento (privado, bloqueado) pede-se de cada vez.
 */
export function useMapOptIn(): [boolean, () => void] {
  const [on, setOn] = useState(() => {
    try {
      return localStorage.getItem(KEY) === '1';
    } catch {
      return false;
    }
  });
  const accept = useCallback(() => {
    setOn(true);
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* sem armazenamento: vale só para esta visita */
    }
  }, []);
  return [on, accept];
}
