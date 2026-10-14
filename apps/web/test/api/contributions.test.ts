import { describe, expect, it } from 'vitest';
import { toOrg, type ApiOrg } from '../../src/api/mappers';

const api: ApiOrg = { id: 'x', name: 'Café', type: 'PME', city: 'Porto', status: 'active', reviewsCount: 0 };
const iso = new Date().toISOString();

describe('entrevistas e salários vindos da API', () => {
  it('sem pedir: listas vazias', () => {
    const o = toOrg(api);
    expect(o.interviews).toEqual([]);
    expect(o.salaries).toEqual([]);
    expect(o.interviewStats).toBeUndefined();
    expect(o.paidOnTimePct).toBeUndefined();
  });

  it('entrevistas: passos numa linha, comentário no corpo e o resumo (sem dificuldade fica por dizer)', () => {
    const o = toOrg(api, [], {
      interviews: {
        items: [{ id: 'i1', role: 'Balcão', positive: true, offer: false, answered: true, difficulty: 2, steps: ['Dia de experiência', 'Conversa'], text: 'Simpáticos.', createdAt: iso }],
        stats: { positivePct: 100, offerPct: 0, answeredPct: 100, difficulty: null, usualSteps: 'Conversa + Dia de experiência' },
      },
    });
    expect(o.interviews).toEqual([{ id: 'i1', role: 'Balcão', when: 'hoje', positive: true, offer: false, steps: 'Conversa + Dia de experiência', body: 'Simpáticos.' }]);
    expect(o.interviewStats).toEqual({ positivePct: 100, offerPct: 0, answeredPct: 100, difficulty: undefined, usualSteps: 'Conversa + Dia de experiência' });
  });

  it('salários: funções escondidas só com a contagem; "pagam a horas" se houver', () => {
    const o = toOrg(api, [], {
      salaries: { bands: [{ role: 'Balcão', count: 4, min: 900, max: 1100, median: 980 }, { role: 'Cozinha', count: 1 }], paidOnTimePct: 75, total: 5 },
    });
    expect(o.salaries).toEqual([
      { role: 'Balcão', count: 4, min: 900, max: 1100, median: 980 },
      { role: 'Cozinha', count: 1, min: 0, max: 0, median: 0 },
    ]);
    expect(o.paidOnTimePct).toBe(75);
    expect(toOrg(api, [], { salaries: { bands: [], paidOnTimePct: null, total: 0 } }).paidOnTimePct).toBeUndefined();
  });
});

describe('contas das organizações vindas da API', () => {
  it('página gerida pela organização e resposta pública nas avaliações', () => {
    const review = { id: 'r1', scores: {}, avg: 4, recommend: true, tags: [], text: 'Bom.', flagged: false, verified: false, createdAt: iso };
    const o = toOrg({ ...api, claimed: true }, [{ ...review, reply: { text: 'Obrigado!', createdAt: iso, updatedAt: iso } }, { ...review, id: 'r2', reply: null }]);
    expect(o.claimed).toBe(true);
    expect(o.reviews.map((r) => r.reply)).toEqual(['Obrigado!', undefined]);
    expect(toOrg(api).claimed).toBe(false);
  });
});
