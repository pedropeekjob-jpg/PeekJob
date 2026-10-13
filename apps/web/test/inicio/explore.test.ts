import { describe, expect, it } from 'vitest';
import { ORGS } from '../../src/data/orgs';
import { deltaText, forYou, mixMovers, movers, prefsLine, prefsStatus, pulseTicks } from '../../src/features/explore/explore';

const org = (id: string, weekDelta: number, trend: number | 'novo' = 0, reviewsCount = 5) => ({ ...ORGS[1], id, name: id, weekDelta, trend, reviewsCount });

describe('início: regras', () => {
  it('para ti: com prioridades mantém a ordem; sem elas, ordena pela nota em %', () => {
    const ranked = [
      { org: { ...ORGS[1], score: 3 }, match: 90 },
      { org: { ...ORGS[2], score: 4.5 }, match: 50 },
    ];
    expect(forYou(ranked, true)).toBe(ranked);
    expect(forYou(ranked, false).map((r) => r.match)).toEqual([90, 60]);
    expect(forYou(ranked, false)[0].org.score).toBe(4.5);
  });

  it('subidas (maior primeiro, depois quem mais subiu no ranking) e descidas; sem avaliações não conta', () => {
    const { ups, downs } = movers([org('a', 0.1, 1), org('b', 0.3), org('c', 0.1, 4), org('d', -0.2), org('e', -0.5), org('f', 0), org('g', 0.9, 0, 0), org('h', 0.1, 'novo')]);
    expect(ups.map((o) => o.id)).toEqual(['b', 'c', 'a', 'h']);
    expect(downs.map((o) => o.id)).toEqual(['e', 'd']);
    expect(deltaText(org('x', -0.25))).toBe('▼ 0,3');
  });

  it('fita: duas subidas por cada descida, e o resto quando acabam umas ou outras', () => {
    const u = ['u1', 'u2', 'u3', 'u4'].map((id) => org(id, 0.1));
    const d = ['d1', 'd2'].map((id) => org(id, -0.1));
    expect(mixMovers(u, d).map((o) => o.id)).toEqual(['u1', 'u2', 'd1', 'u3', 'u4', 'd2']);
    expect(mixMovers([], d).map((o) => o.id)).toEqual(['d1', 'd2']);
    const ticks = pulseTicks(u.slice(0, 1), d.slice(0, 1), [{ label: 'Horários cumpridos', n: 12, up: true }]);
    expect(ticks).toEqual([
      { key: 'u1', label: 'u1', d: '▲ 0,1', up: true, to: '/org/u1' },
      { key: 'd1', label: 'd1', d: '▼ 0,1', up: false, to: '/org/d1' },
      { key: 'tag-Horários cumpridos', label: '«Horários cumpridos» em avaliações', d: '▲ 12', up: true },
    ]);
  });

  it('textos das prioridades', () => {
    expect([prefsStatus(0), prefsStatus(2), prefsStatus(3)]).toEqual(['Sem escolhas: ordenado pela nota', '2 de 3', '3 de 3 · clica de novo para tirar']);
    expect(prefsLine([])).toBe('Sem prioridades: ordenado pela nota');
    expect(prefsLine(['salario', 'ambiente'])).toMatch(/^Pela tua ordem: .+, .+$/);
  });
});
