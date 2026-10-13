import { describe, expect, it } from 'vitest';
import { ORG_BY_ID } from '../../src/data/orgs';
import { demoState, EXAMPLE_ORGS, pctBreakdown, realOf, RING_CIRC, weightsText } from '../../src/features/methodology/methodology';

describe('metodologia: contas', () => {
  it('nota ajustada, estado e parte real', () => {
    expect(demoState(4.6, 0)).toMatchObject({ adj: 3.8, shown: false, status: 'Ainda sem nota · faltam 3', share: 0 });
    expect(demoState(4.6, 3)).toMatchObject({ shown: true, status: 'Nota visível · fora do ranking', share: 38 });
    expect(demoState(4.6, 3).adj).toBeCloseTo(4.1);
    expect(demoState(2.4, 5).status).toBe('Nota visível · no ranking');
    expect(demoState(5, 1_000_000).offset).toBeCloseTo(0, 0);
    expect(demoState(0, 1_000_000).offset).toBeCloseTo(RING_CIRC, 0);
  });

  it('cenários, pesos e organizações de exemplo', () => {
    expect([realOf('boa'), realOf('ma')]).toEqual([4.6, 2.4]);
    expect([weightsText(0), weightsText(1), weightsText(2), weightsText(3)]).toEqual(['', '3', '3 e 2', '3, 2 e 1']);
    expect(EXAMPLE_ORGS.map((o) => o.id)).toEqual(['padaria-ribeira', 'maos-dadas', 'norte-logistica']);
  });

  it('% para ti: nota × peso; os critérios sem nota não contam', () => {
    const scores = { ...ORG_BY_ID['padaria-ribeira'].scores, salario: 4, ambiente: null, equilibrio: 2 };
    const { rows, sum, wsum } = pctBreakdown(scores, ['salario', 'ambiente', 'equilibrio']);
    expect(rows.map((r) => [r.k, r.w, r.rank])).toEqual([['salario', 3, 1], ['ambiente', 2, 2], ['equilibrio', 1, 3]]);
    expect(sum).toBe(4 * 3 + 2 * 1);
    expect(wsum).toBe(4);
    expect(pctBreakdown(scores, ['a', 'b', 'c', 'salario'] as never).rows[3].w).toBe(1);
  });
});
