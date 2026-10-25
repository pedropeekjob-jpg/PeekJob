import { describe, expect, it } from 'vitest';
import { ORG_BY_ID, ORGS } from '../../src/data/orgs';
import { aggregate, rankingHref, sectorHref, sectorRows, typeCards } from '../../src/features/sectors/sectors';

describe('setores: agregados e ligações', () => {
  it('média ponderada pelo n.º de avaliações; sem avaliações dá 0', () => {
    const a = { ...ORG_BY_ID['rede-vizinha'] };
    const b = { ...ORG_BY_ID['banco-tempo'] };
    const agg = aggregate([a, b]);
    expect(agg.n).toBe(2);
    expect(agg.score).toBeCloseTo((a.score * a.reviewsCount + b.score * b.reviewsCount) / (a.reviewsCount + b.reviewsCount));
    expect(aggregate([])).toEqual({ n: 0, score: 0, resp: 0 });
    expect(aggregate([{ ...a, scores: { ...a.scores, respeito: null } }]).resp).toBe(0);
  });

  it('tipos pela ordem fixa; setores por nota, respeito ou n.º (desempate pela nota)', () => {
    expect(typeCards(ORGS).map((c) => c.t)).toEqual(['Empresa', 'Associação', 'Voluntariado', 'Nome individual']);
    const byN = sectorRows(ORGS, null, 'n');
    expect(byN[0].n).toBeGreaterThanOrEqual(byN[1].n);
    const resp = sectorRows(ORGS, null, 'resp').map((s) => s.resp);
    expect([...resp].sort((x, y) => y - x)).toEqual(resp);
    expect(sectorRows(ORGS, 'Voluntariado', 'nota').map((s) => s.name)).toEqual(['Comunidade']);
    expect(sectorRows([], null, 'nota')).toEqual([]);
  });

  it('ligações ao ranking com tipo e setor codificados', () => {
    expect(rankingHref(null)).toBe('/ranking');
    expect(rankingHref('Nome individual')).toBe('/ranking?tipo=Nome%20individual');
    expect(sectorHref(null, 'Ação social')).toBe('/ranking?setor=A%C3%A7%C3%A3o%20social');
    expect(sectorHref('Empresa', 'Saúde')).toBe('/ranking?tipo=Empresa&setor=Sa%C3%BAde');
  });
});
