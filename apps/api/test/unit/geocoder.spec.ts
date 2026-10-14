import { createGeocoder, HttpNominatim, inPortugal, OfflineGeocoder } from '../../src/geocoding/geocoder';

/** fetch a fingir: guarda o pedido e responde com o que se der */
function fakeFetch(body: unknown, status = 200) {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  const fn = (async (url: string, init?: RequestInit) => {
    calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    if (body instanceof Error) throw body;
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
  return { fn, calls };
}

describe('geocodificação (Nominatim)', () => {
  it('pede a morada em Portugal, um resultado, com identificação da app (regras do Nominatim)', async () => {
    const f = fakeFetch([{ lat: '41.1496', lon: '-8.6109' }]);
    const g = new HttpNominatim(f.fn, 'https://nominatim.openstreetmap.org', 'PeekJob (ola@peekjob.pt)');
    expect(await g.geocode('Rua das Flores, 112', 'Porto')).toEqual({ lat: 41.1496, lng: -8.6109 });
    const u = new URL(f.calls[0].url);
    expect(u.pathname).toBe('/search');
    expect(Object.fromEntries(u.searchParams)).toEqual({ q: 'Rua das Flores, 112, Porto, Portugal', format: 'jsonv2', countrycodes: 'pt', limit: '1' });
    expect(f.calls[0].headers['user-agent']).toBe('PeekJob (ola@peekjob.pt)');
  });

  it('sem resultado: null; fora de Portugal: null; serviço em baixo ou resposta estranha: "unavailable"', async () => {
    expect(await new HttpNominatim(fakeFetch([]).fn).geocode('Rua X', 'Porto')).toBeNull();
    expect(await new HttpNominatim(fakeFetch([{ lat: '40.4168', lon: '-3.7038' }]).fn).geocode('Calle Mayor', 'Madrid')).toBeNull();
    expect(await new HttpNominatim(fakeFetch({}, 503).fn).geocode('Rua X', 'Porto')).toBe('unavailable');
    expect(await new HttpNominatim(fakeFetch(new Error('rede')).fn).geocode('Rua X', 'Porto')).toBe('unavailable');
    expect(await new HttpNominatim(fakeFetch({ erro: 1 }).fn).geocode('Rua X', 'Porto')).toBe('unavailable');
  });

  it('Portugal inclui Açores e Madeira', () => {
    expect(inPortugal(41.15, -8.61)).toBe(true); // Porto
    expect(inPortugal(37.74, -25.67)).toBe(true); // Ponta Delgada
    expect(inPortugal(32.65, -16.91)).toBe(true); // Funchal
    expect(inPortugal(40.42, -3.7)).toBe(false); // Madrid
  });

  it('nos testes e com GEOCODER_URL=off não há pedidos à rede', async () => {
    expect(createGeocoder({ NODE_ENV: 'test' })).toBeInstanceOf(OfflineGeocoder);
    expect(createGeocoder({ GEOCODER_URL: 'off' })).toBeInstanceOf(OfflineGeocoder);
    expect(createGeocoder({})).toBeInstanceOf(HttpNominatim);
    expect(await new OfflineGeocoder().geocode()).toBe('unavailable');
  });
});
