type Env = Record<string, string | undefined>;

const DEFAULT = { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '© OpenStreetMap' };

/**
 * Mosaicos do mapa (mapa real das organizações). Por omissão o OpenStreetMap, que pede a atribuição e
 * aceita pouco tráfego; em produção pode trocar-se por um fornecedor com conta (MAP_TILES_URL, https,
 * com {z}/{x}/{y}), sem rebuild. A origem entra na CSP: o browser só carrega imagens desse endereço.
 */
export function mapTiles(env: Env = process.env) {
  const raw = env.MAP_TILES_URL?.trim();
  let tiles = DEFAULT;
  if (raw && ['{z}', '{x}', '{y}'].every((p) => raw.includes(p))) {
    try {
      if (new URL(raw.replace(/\{[zxy]\}/g, '0')).protocol === 'https:') {
        tiles = { url: raw, attribution: env.MAP_TILES_ATTRIBUTION?.trim() || DEFAULT.attribution };
      }
    } catch {
      /* endereço inválido: fica o de omissão */
    }
  }
  return { ...tiles, origin: new URL(tiles.url.replace(/\{[zxy]\}/g, '0')).origin };
}
