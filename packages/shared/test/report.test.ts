import { describe, expect, it } from 'vitest';
import { buildReport, type ReportReview } from '../src';

const NOW = new Date('2026-10-21T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const rev = (d: number, avg: number, scores: ReportReview['scores'], recommend: boolean | null = null): ReportReview => ({ createdAt: daysAgo(d), avg, scores, recommend });

describe('relatório semanal e mensal (21/10)', () => {
  const reviews = [
    // esta semana: 3 avaliações
    rev(1, 4.5, { salario: 4, lideranca: 5, ambiente: 5 }, true),
    rev(2, 4, { salario: 3, lideranca: 5, ambiente: 4 }, true),
    rev(3, 3, { salario: 2, lideranca: 4, ambiente: 3 }, true),
    // semana anterior: 3
    rev(8, 3, { salario: 2, lideranca: 2, ambiente: 4 }, false),
    rev(9, 2, { salario: 1, lideranca: 2, ambiente: 3 }, false),
    rev(10, 3.5, { salario: 3, lideranca: 3, ambiente: 4 }, true),
    // há mais tempo
    rev(40, 5, { salario: 5, lideranca: 5, ambiente: 5 }, null),
  ];
  const peers = { basis: 'sector' as const, label: 'Restauração', orgs: 4, score: 3.6, criteria: { salario: 3.2, lideranca: 3, ambiente: 4.5 } };

  it('resultados do período face ao anterior, e a percentagem de quem recomenda', () => {
    const r = buildReport('week', NOW, reviews, peers);
    expect(r.results).toMatchObject({ total: 7, inPeriod: 3, inPrevious: 3, periodScore: 3.8, previousScore: 2.8, delta: 1, recommendPct: 67 });
    const lid = r.criteria.find((c) => c.key === 'lideranca')!;
    expect(lid).toMatchObject({ period: 4.7, delta: 2.4, peers: 3, vsPeers: 0.7 });
  });

  it('pontos fortes acima das comparáveis; melhorar o que está mais baixo', () => {
    const r = buildReport('week', NOW, reviews, peers);
    expect(r.strengths[0]).toBe('lideranca');
    expect(r.strengths).not.toContain('salario');
    expect(r.improve[0]).toBe('salario');
  });

  it('níveis de satisfação e o que mais pesa em recomendar', () => {
    const r = buildReport('month', NOW, reviews, null);
    // pela média arredondada: 4,5 → 5 e 3,5 → 4
    expect(r.levels).toEqual([0, 1, 2, 2, 2]);
    expect(r.drivers[0]).toMatchObject({ key: 'lideranca', recommenders: 4.3, others: 2 });
  });

  it('com poucas avaliações no período não mostra a nota do período (anonimato)', () => {
    const r = buildReport('week', NOW, reviews.slice(1, 3).concat(reviews.slice(6)), null);
    expect(r.results.inPeriod).toBe(2);
    expect(r.results.periodScore).toBeNull();
    expect(r.criteria.every((c) => c.period === null)).toBe(true);
    // menos de 5 respostas a "recomendava?": sem relação
    expect(r.drivers).toEqual([]);
  });
});
