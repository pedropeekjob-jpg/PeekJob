import { readFileSync } from 'fs';
import { join } from 'path';
import { buildOrgsQuery, buildMunicipalitiesQuery, listTargets, OverpassClient, parseMunicipalities, parseOverpass } from '../../src/import/osm';

const fixture = JSON.parse(readFileSync(join(__dirname, '..', 'fixtures', 'overpass-porto.json'), 'utf8'));

describe('OpenStreetMap (Overpass): organizações de um concelho', () => {
  it('consulta o concelho dentro de Portugal, com as etiquetas de empregadores e o centro dos edifícios', () => {
    const q = buildOrgsQuery('Porto');
    expect(q).toContain('area["ISO3166-1"="PT"][admin_level=2]->.pt;');
    expect(q).toContain('area["name"="Porto"]["admin_level"="7"](area.pt)->.a;');
    for (const tag of ['"office"', '"shop"', '"craft"', '"amenity"~', '"tourism"~', '"social_facility"']) expect(q).toContain(tag);
    expect(q).toContain('out center tags;');
    expect(q).toMatch(/\[timeout:\d+\]/);
  });

  it('protege a consulta contra aspas no nome', () => {
    expect(buildOrgsQuery('Porto"];out;')).toContain('area["name"="Porto\\"];out;"]');
  });

  it('lista os concelhos de um distrito ou do país inteiro', () => {
    expect(buildMunicipalitiesQuery()).toContain('relation["boundary"="administrative"]["admin_level"="7"](area.pt);');
    expect(buildMunicipalitiesQuery('Braga')).toContain('area["name"="Braga"]["admin_level"="6"](area.pt)->.d;');
    expect(buildMunicipalitiesQuery('Açores')).toContain('area["name"="Região Autónoma dos Açores"]["admin_level"="4"]');
    expect(parseMunicipalities({ elements: [{ tags: { name: 'Vila Nova de Gaia' } }, { tags: { name: 'Porto' } }, { tags: {} }, { tags: { name: 'Porto' } }] })).toEqual(['Porto', 'Vila Nova de Gaia']);
  });

  it('converte os elementos em organizações (tipo, setor, morada, coordenadas, NIF)', () => {
    const orgs = parseOverpass(fixture, 'Porto');
    const by = Object.fromEntries(orgs.map((o) => [o.name, o]));
    expect(by['Padaria Ribeira']).toEqual({
      externalId: 'node/101', name: 'Padaria Ribeira', type: 'PME', sector: 'Comércio', city: 'Porto', district: 'Porto',
      address: 'Rua de Cima 12, 4050-123 Porto', lat: 41.1496, lng: -8.6109, nif: null,
    });
    expect(by['Associação Mãos Dadas']).toMatchObject({ externalId: 'way/202', type: 'Associação', sector: 'Ação social', lat: 41.158, lng: -8.629 });
    expect(by['Oficina Sete']).toMatchObject({ type: 'PME', sector: 'Ofícios', nif: '513000003', address: null, city: 'Porto' });
    expect(by['Café Majestic']).toMatchObject({ sector: 'Restauração' });
    expect(by['Lar da Boa Vontade']).toMatchObject({ externalId: 'relation/707', type: 'Associação', sector: 'Ação social' });
    expect(by['Banco Alimentar do Porto']).toMatchObject({ type: 'Associação' });
    expect(by['Hotel Infante Sagres']).toMatchObject({ sector: 'Turismo' });
  });

  it('deixa de fora: sem nome, grandes marcas (brand:wikidata) e entidades públicas', () => {
    const names = parseOverpass(fixture, 'Porto').map((o) => o.name);
    expect(names).not.toContain('Continente Bom Dia');
    expect(names).not.toContain('Câmara Municipal do Porto');
    expect(names).toHaveLength(7);
  });

  it('Overpass: envia a consulta, identifica-se e tenta outra vez quando está ocupado (429/504)', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    let n = 0;
    const fetchFn = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return ++n === 1 ? new Response('busy', { status: 429 }) : new Response(JSON.stringify(fixture), { status: 200 });
    }) as unknown as typeof fetch;
    const c = new OverpassClient(fetchFn, 'https://overpass.test/api/interpreter', 0);
    const json = await c.run('[out:json];node(1);out;');
    expect(json.elements).toHaveLength(10);
    expect(calls).toHaveLength(2);
    expect(calls[0].init.method).toBe('POST');
    expect(String(calls[0].init.body)).toBe('data=' + encodeURIComponent('[out:json];node(1);out;'));
    expect((calls[0].init.headers as Record<string, string>)['user-agent']).toMatch(/PeekJob/);
  });

  it('Overpass: desiste ao fim de algumas tentativas, com erro claro', async () => {
    const fetchFn = (async () => new Response('x', { status: 504 })) as unknown as typeof fetch;
    await expect(new OverpassClient(fetchFn, 'https://o.test', 0, 3).run('q')).rejects.toThrow(/Overpass.*504/);
  });
});

describe('OpenStreetMap: concelhos a importar, cada um com o distrito', () => {
  const fake = (byDistrict: Record<string, string[]>) => {
    const calls: string[] = [];
    return {
      calls,
      run: async (q: string) => {
        calls.push(q);
        const d = Object.keys(byDistrict).find((k) => q.includes(`"${k}"`) || (k === 'Açores' && q.includes('Região Autónoma dos Açores')));
        return { elements: (d ? byDistrict[d] : []).map((name) => ({ type: 'relation' as const, id: 1, tags: { name } })) };
      },
    };
  };

  it('um concelho: distrito pelo nome, ou o indicado (nomes repetidos como Lagoa)', async () => {
    const o = fake({});
    expect(await listTargets(o, { city: 'Matosinhos' })).toEqual([{ municipality: 'Matosinhos', district: 'Porto' }]);
    expect(await listTargets(o, { city: 'Lagoa' })).toEqual([{ municipality: 'Lagoa', district: null }]);
    expect(await listTargets(o, { city: 'Lagoa', district: 'Açores' })).toEqual([{ municipality: 'Lagoa', district: 'Açores' }]);
    expect(o.calls).toHaveLength(0);
  });

  it('um distrito: os concelhos dele; --all: os 20 distritos e regiões, um a um', async () => {
    const o = fake({ Faro: ['Lagoa', 'Faro'], Açores: ['Lagoa', 'Ponta Delgada'] });
    expect(await listTargets(o, { district: 'Faro' })).toEqual([
      { municipality: 'Faro', district: 'Faro' },
      { municipality: 'Lagoa', district: 'Faro' },
    ]);
    const all = await listTargets(o, { all: true });
    expect(o.calls).toHaveLength(1 + 20);
    expect(all).toContainEqual({ municipality: 'Lagoa', district: 'Açores' });
    expect(all).toContainEqual({ municipality: 'Lagoa', district: 'Faro' });
  });

  it('distrito desconhecido ou sem opções: erro claro', async () => {
    await expect(listTargets(fake({}), { district: 'Lisbon' })).rejects.toThrow(/Distrito desconhecido: Lisbon/);
    await expect(listTargets(fake({}), {})).rejects.toThrow(/--city/);
  });

  it('as organizações levam o distrito (o indicado ou o do concelho)', () => {
    expect(parseOverpass(fixture, 'Porto').every((o) => o.district === 'Porto')).toBe(true);
    expect(parseOverpass(fixture, 'Lagoa').every((o) => o.district === null)).toBe(true);
    expect(parseOverpass(fixture, 'Lagoa', 'Faro').every((o) => o.district === 'Faro')).toBe(true);
  });
});
