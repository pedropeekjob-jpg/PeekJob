type Env = Record<string, string | undefined>;

export type GeoPoint = { lat: number; lng: number };
/** null: morada não encontrada; 'unavailable': serviço em baixo (tenta-se mais tarde, sem contar) */
export type GeoResult = GeoPoint | null | 'unavailable';
export interface Geocoder {
  geocode(address: string, city: string): Promise<GeoResult>;
}
export const GEOCODER = 'GEOCODER';

/** Portugal continental, Açores e Madeira (resultados fora daqui não são a morada certa) */
export const inPortugal = (lat: number, lng: number) =>
  (lat >= 36.8 && lat <= 42.2 && lng >= -9.6 && lng <= -6.1) || // continente
  (lat >= 36.8 && lat <= 39.8 && lng >= -31.5 && lng <= -24.9) || // Açores
  (lat >= 32.3 && lat <= 33.2 && lng >= -17.3 && lng <= -16.2); // Madeira

/**
 * Nominatim (OpenStreetMap): gratuito, sem chave. Regras de uso: no máximo 1 pedido por segundo e
 * identificação da app (User-Agent com contacto). Só se envia a morada da organização (pública).
 */
export class HttpNominatim implements Geocoder {
  constructor(
    private readonly fetchFn: typeof fetch = fetch,
    private readonly baseUrl = 'https://nominatim.openstreetmap.org',
    private readonly userAgent = 'PeekJob (https://peekjob.com)',
    private readonly timeoutMs = 8000,
  ) {}

  async geocode(address: string, city: string): Promise<GeoResult> {
    const u = new URL('/search', this.baseUrl);
    u.search = new URLSearchParams({ q: `${address}, ${city}, Portugal`, format: 'jsonv2', countrycodes: 'pt', limit: '1' }).toString();
    try {
      const res = await this.fetchFn(u.toString(), { headers: { 'user-agent': this.userAgent, accept: 'application/json' }, signal: AbortSignal.timeout(this.timeoutMs) });
      if (!res.ok) return 'unavailable';
      const body = (await res.json()) as unknown;
      if (!Array.isArray(body)) return 'unavailable';
      const first = body[0] as { lat?: string; lon?: string } | undefined;
      if (!first) return null;
      const lat = Number(first.lat);
      const lng = Number(first.lon);
      return Number.isFinite(lat) && Number.isFinite(lng) && inPortugal(lat, lng) ? { lat, lng } : null;
    } catch {
      return 'unavailable';
    }
  }
}

/** Sem rede (testes) ou desligado com GEOCODER_URL=off */
export class OfflineGeocoder implements Geocoder {
  async geocode(): Promise<GeoResult> {
    return 'unavailable';
  }
}

export function createGeocoder(env: Env = process.env): Geocoder {
  if (env.GEOCODER_URL === 'off' || (env.NODE_ENV === 'test' && !env.GEOCODER_URL)) return new OfflineGeocoder();
  return new HttpNominatim(fetch, env.GEOCODER_URL || undefined, env.GEOCODER_USER_AGENT || undefined);
}
