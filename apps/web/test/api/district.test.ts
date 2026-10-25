import { describe, expect, it } from 'vitest';
import { toOrg, type ApiOrg } from '../../src/api/mappers';
import { applyFilters, filterGroups, NO_FILTERS } from '../../src/features/ranking/ranking';

const api = (patch: Partial<ApiOrg>): ApiOrg => ({ id: 'x', name: 'Café', type: 'Empresa', city: 'Matosinhos', status: 'active', reviewsCount: 6, score: 4, ...patch });

describe('distrito vindo da API', () => {
  it('usa o distrito da API (não a cidade); sem distrito fica vazio', () => {
    expect(toOrg(api({ district: 'Porto' })).district).toBe('Porto');
    expect(toOrg(api({ city: 'Leça da Palmeira', district: null })).district).toBe('');
    expect(toOrg(api({})).district).toBe('');
  });

  it('o filtro do ranking oferece os 20 distritos e regiões e apanha Matosinhos, Maia e Gaia no Porto', () => {
    expect(filterGroups().find((g) => g.key === 'dist')!.opts).toHaveLength(20);
    const orgs = ['Matosinhos', 'Maia', 'Vila Nova de Gaia', 'Braga'].map((city, i) => toOrg(api({ id: String(i), city, district: city === 'Braga' ? 'Braga' : 'Porto' })));
    expect(applyFilters(orgs, { ...NO_FILTERS, dist: ['Porto'] }).map((o) => o.city)).toEqual(['Matosinhos', 'Maia', 'Vila Nova de Gaia']);
  });
});
