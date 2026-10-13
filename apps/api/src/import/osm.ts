import { DISTRICTS, districtOf, isDistrict, isValidNif, normalizeNif } from '@peekjob/shared';

/**
 * OpenStreetMap via Overpass API: organizações com nome de um concelho português.
 * Dados © contribuidores do OpenStreetMap, licença ODbL 1.0 (atribuição obrigatória e partilha nos mesmos termos).
 */

export interface ImportedOrg {
  /** "node/123", "way/456", "relation/789" */
  externalId: string;
  name: string;
  type: 'PME' | 'Associação';
  sector: string | null;
  city: string;
  /** distrito ou região autónoma; null se não se souber (o trigger da base de dados tenta pela cidade) */
  district: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  nif: string | null;
}

const q = (s: string) => JSON.stringify(s); // aspas e barras escapadas

const PT_AREA = 'area["ISO3166-1"="PT"][admin_level=2]->.pt;';
const AMENITY = 'restaurant|cafe|bar|pub|fast_food|ice_cream|social_facility|kindergarten|childcare|dentist|clinic|veterinary|pharmacy|driving_school|language_school|music_school|community_centre|arts_centre';
const TOURISM = 'hotel|guest_house|hostel|apartment|motel';
/** office=* exceto entidades públicas, diplomacia e partidos */
const OFFICE_EXCLUDE = 'government|diplomatic|political_party|religion|administrative';

/** Regiões autónomas não são distritos (admin_level 4) */
const REGIONS: Record<string, string> = { Açores: 'Região Autónoma dos Açores', Acores: 'Região Autónoma dos Açores', Madeira: 'Região Autónoma da Madeira' };

/** Organizações com nome num concelho (admin_level 7 em Portugal) */
export function buildOrgsQuery(municipality: string, timeoutSec = 180): string {
  const sel = (f: string) => `  nwr[name]${f}(area.a);`;
  return [
    `[out:json][timeout:${timeoutSec}];`,
    PT_AREA,
    `area["name"=${q(municipality)}]["admin_level"="7"](area.pt)->.a;`,
    '(',
    sel(`["office"]["office"!~"^(${OFFICE_EXCLUDE})$"]`),
    sel('["shop"]'),
    sel('["craft"]'),
    sel(`["amenity"~"^(${AMENITY})$"]`),
    sel(`["tourism"~"^(${TOURISM})$"]`),
    sel('["social_facility"]'),
    ');',
    'out center tags;',
  ].join('\n');
}

/** Concelhos de um distrito (ou região autónoma) ou de todo o país */
export function buildMunicipalitiesQuery(district?: string): string {
  const head = ['[out:json][timeout:120];', PT_AREA];
  if (!district) return [...head, 'relation["boundary"="administrative"]["admin_level"="7"](area.pt);', 'out tags;'].join('\n');
  const region = REGIONS[district];
  const area = region ? `area["name"=${q(region)}]["admin_level"="4"](area.pt)->.d;` : `area["name"=${q(district)}]["admin_level"="6"](area.pt)->.d;`;
  return [...head, area, 'relation["boundary"="administrative"]["admin_level"="7"](area.d);', 'out tags;'].join('\n');
}

export function parseMunicipalities(json: { elements?: { tags?: Record<string, string> }[] }): string[] {
  const names = new Set<string>();
  for (const e of json.elements ?? []) if (e.tags?.name) names.add(e.tags.name);
  return [...names].sort((a, b) => a.localeCompare(b, 'pt'));
}

export interface Target {
  municipality: string;
  district: string | null;
}

/**
 * Concelhos a importar, cada um com o distrito:
 * - city: um concelho (distrito indicado ou tirado do nome; "Lagoa"/"Calheta" precisam de --district)
 * - district: os concelhos desse distrito ou região autónoma
 * - all: os 20 distritos e regiões, um a um (assim o distrito vem da própria consulta)
 */
export async function listTargets(overpass: Pick<OverpassClient, 'run'>, opts: { city?: string; district?: string; all?: boolean }): Promise<Target[]> {
  if (opts.district && !isDistrict(opts.district)) throw new Error(`Distrito desconhecido: ${opts.district} (${DISTRICTS.join(', ')})`);
  if (opts.city) return [{ municipality: opts.city, district: opts.district ?? districtOf(opts.city) }];
  const districts = opts.district ? [opts.district] : opts.all ? [...DISTRICTS] : [];
  if (!districts.length) throw new Error('Indica --city <concelho>, --district <distrito> ou --all');
  const out: Target[] = [];
  for (const d of districts) {
    for (const m of parseMunicipalities(await overpass.run(buildMunicipalitiesQuery(d)))) out.push({ municipality: m, district: d });
  }
  return out;
}

const ASSOC_OFFICE = /^(association|ngo|foundation|charity|non_profit|cooperative)$/;
function classify(t: Record<string, string>): { type: ImportedOrg['type']; sector: string | null } | null {
  if (t.office && new RegExp(`^(${OFFICE_EXCLUDE})$`).test(t.office)) return null;
  if (t.social_facility || t.amenity === 'social_facility' || t.amenity === 'community_centre') return { type: 'Associação', sector: 'Ação social' };
  if (t.office && ASSOC_OFFICE.test(t.office)) return { type: 'Associação', sector: t.office === 'cooperative' ? 'Comunidade' : 'Ação social' };
  if (t.amenity && /^(restaurant|cafe|bar|pub|fast_food|ice_cream)$/.test(t.amenity)) return { type: 'PME', sector: 'Restauração' };
  if (t.amenity && /^(dentist|clinic|veterinary|pharmacy)$/.test(t.amenity)) return { type: 'PME', sector: 'Saúde' };
  if (t.amenity && /^(kindergarten|childcare|driving_school|language_school|music_school)$/.test(t.amenity)) return { type: 'PME', sector: 'Educação' };
  if (t.amenity === 'arts_centre') return { type: 'Associação', sector: 'Cultura' };
  if (t.tourism) return { type: 'PME', sector: 'Turismo' };
  if (t.craft) return { type: 'PME', sector: 'Ofícios' };
  if (t.shop) return { type: 'PME', sector: 'Comércio' };
  if (t.office === 'it') return { type: 'PME', sector: 'Tecnologia' };
  if (t.office) return { type: 'PME', sector: 'Serviços' };
  return null;
}

function address(t: Record<string, string>): string | null {
  const street = [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ');
  const place = [t['addr:postcode'], t['addr:city']].filter(Boolean).join(' ');
  const out = [street, place].filter(Boolean).join(', ');
  return street ? out : null; // sem rua não é uma morada útil
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/**
 * Converte a resposta do Overpass. Fica de fora: sem nome, grandes marcas (brand:wikidata) e entidades públicas.
 * O distrito vem de quem pediu o concelho (sabe-o mesmo para "Lagoa" e "Calheta"); senão, do nome do concelho.
 */
export function parseOverpass(json: { elements?: OverpassElement[] }, municipality: string, district: string | null = districtOf(municipality)): ImportedOrg[] {
  const out: ImportedOrg[] = [];
  const seen = new Set<string>();
  for (const e of json.elements ?? []) {
    const t = e.tags ?? {};
    const name = t.name?.trim();
    if (!name || name.length < 2 || t['brand:wikidata'] || t.disused === 'yes') continue;
    const cls = classify(t);
    if (!cls) continue;
    const externalId = `${e.type}/${e.id}`;
    if (seen.has(externalId)) continue;
    seen.add(externalId);
    const vat = t['ref:vatin'] ?? t['ref:NIF'] ?? t['ref:nif'];
    const nif = vat && isValidNif(normalizeNif(vat)) ? normalizeNif(vat) : null;
    out.push({
      externalId,
      name: name.slice(0, 120),
      type: cls.type,
      sector: cls.sector,
      city: municipality,
      district,
      address: address(t)?.slice(0, 200) ?? null,
      lat: e.lat ?? e.center?.lat ?? null,
      lng: e.lon ?? e.center?.lon ?? null,
      nif,
    });
  }
  return out;
}

/** Cliente do Overpass: POST com a consulta, identificado, com novas tentativas quando o servidor está ocupado. */
export class OverpassClient {
  constructor(
    private readonly fetchFn: typeof fetch = fetch,
    private readonly url = 'https://overpass-api.de/api/interpreter',
    private readonly backoffMs = 15000,
    private readonly attempts = 4,
  ) {}

  async run(query: string): Promise<{ elements: OverpassElement[] }> {
    let last = 0;
    for (let i = 0; i < this.attempts; i++) {
      const res = await this.fetchFn(this.url, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'PeekJob/0.1 (importador de organizacoes; ola@peekjob.pt)' },
        body: 'data=' + encodeURIComponent(query),
      });
      if (res.ok) return (await res.json()) as { elements: OverpassElement[] };
      last = res.status;
      if (![429, 502, 503, 504].includes(res.status)) break;
      await new Promise((r) => setTimeout(r, this.backoffMs * (i + 1)));
    }
    throw new Error(`Overpass respondeu ${last}`);
  }
}
