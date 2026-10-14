import { htmlCsp } from '../../src/security/headers';
import { mapTiles } from '../../src/web/map-tiles';
import { configScript } from '../../src/web/index-html';

describe('mapa: mosaicos configuráveis', () => {
  it('por omissão usa o OpenStreetMap, com a atribuição obrigatória', () => {
    expect(mapTiles({})).toEqual({ url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '© OpenStreetMap', origin: 'https://tile.openstreetmap.org' });
  });

  it('aceita outro fornecedor por variável de ambiente (https, com {z}/{x}/{y})', () => {
    const t = mapTiles({ MAP_TILES_URL: 'https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=abc', MAP_TILES_ATTRIBUTION: '© MapTiler © OpenStreetMap' });
    expect(t).toEqual({ url: 'https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=abc', attribution: '© MapTiler © OpenStreetMap', origin: 'https://api.maptiler.com' });
  });

  it('endereço inválido (http, sem coordenadas, ou não é URL): fica o de omissão', () => {
    for (const bad of ['http://x.pt/{z}/{x}/{y}.png', 'https://x.pt/tile.png', 'nada', 'javascript:alert(1)//{z}{x}{y}']) {
      expect(mapTiles({ MAP_TILES_URL: bad }).origin).toBe('https://tile.openstreetmap.org');
    }
  });

  it('a CSP só deixa carregar imagens desse fornecedor', () => {
    expect(htmlCsp('production')).toMatch(/img-src [^;]*https:\/\/tile\.openstreetmap\.org/);
    expect(htmlCsp('production', { MAP_TILES_URL: 'https://api.maptiler.com/maps/x/{z}/{x}/{y}.png' })).toMatch(/img-src [^;]*https:\/\/api\.maptiler\.com/);
    expect(htmlCsp('production', { MAP_TILES_URL: 'https://api.maptiler.com/maps/x/{z}/{x}/{y}.png' })).not.toMatch(/openstreetmap/);
  });

  it('a web recebe o endereço e a atribuição em /pj-config.js', () => {
    expect(configScript({})).toContain('"tiles":{"url":"https://tile.openstreetmap.org/{z}/{x}/{y}.png","attribution":"© OpenStreetMap"}');
  });
});
