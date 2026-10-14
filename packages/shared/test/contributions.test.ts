import { describe, expect, it } from 'vitest';
import {
  CreateInterviewInput,
  CreateSalaryInput,
  INTERVIEW_STEPS,
  interviewStats,
  MIN_SALARIES,
  ReplyInput,
  roleKey,
  salaryBands,
} from '../src/contributions';

describe('CreateInterviewInput', () => {
  const base = { role: '  Balcão ', positive: true, offer: false, steps: ['Conversa'] };

  it('aceita o mínimo e preenche o resto', () => {
    expect(CreateInterviewInput.parse(base)).toEqual({ role: 'Balcão', positive: true, offer: false, answered: true, difficulty: null, steps: ['Conversa'], text: '' });
  });

  it('recusa passos desconhecidos, repetidos ou nenhum, e dificuldade fora de 1–5', () => {
    expect(() => CreateInterviewInput.parse({ ...base, steps: [] })).toThrow();
    expect(() => CreateInterviewInput.parse({ ...base, steps: ['Karaoke'] })).toThrow();
    expect(() => CreateInterviewInput.parse({ ...base, steps: ['Conversa', 'Conversa'] })).toThrow(/repetidos/);
    expect(() => CreateInterviewInput.parse({ ...base, difficulty: 6 })).toThrow();
    expect(CreateInterviewInput.parse({ ...base, difficulty: 3 }).difficulty).toBe(3);
    expect(INTERVIEW_STEPS).toContain('Dia de experiência');
  });

  it('função entre 2 e 60 caracteres; texto até 600', () => {
    expect(() => CreateInterviewInput.parse({ ...base, role: 'A' })).toThrow();
    expect(() => CreateInterviewInput.parse({ ...base, text: 'x'.repeat(601) })).toThrow();
  });
});

describe('CreateSalaryInput', () => {
  it('salário bruto mensal em euros inteiros, num intervalo plausível', () => {
    expect(CreateSalaryInput.parse({ role: 'Balcão', monthlyGross: 950 })).toEqual({ role: 'Balcão', monthlyGross: 950, paidOnTime: null });
    expect(() => CreateSalaryInput.parse({ role: 'Balcão', monthlyGross: 99 })).toThrow();
    expect(() => CreateSalaryInput.parse({ role: 'Balcão', monthlyGross: 50001 })).toThrow();
    expect(() => CreateSalaryInput.parse({ role: 'Balcão', monthlyGross: 950.5 })).toThrow();
  });
});

describe('ReplyInput', () => {
  it('resposta pública entre 2 e 600 caracteres', () => {
    expect(ReplyInput.parse({ text: '  Obrigado pela avaliação. ' }).text).toBe('Obrigado pela avaliação.');
    expect(() => ReplyInput.parse({ text: ' ' })).toThrow();
    expect(() => ReplyInput.parse({ text: 'x'.repeat(601) })).toThrow();
  });
});

describe('roleKey', () => {
  it('junta a mesma função escrita de formas diferentes', () => {
    expect(roleKey(' Balcão ')).toBe(roleKey('balcao'));
    expect(roleKey('Gestão  de loja')).toBe('gestao de loja');
  });
});

describe('salaryBands', () => {
  const rows = (role: string, values: number[]) => values.map((monthlyGross) => ({ role, monthlyGross, paidOnTime: null as boolean | null }));

  it(`só mostra valores de uma função com pelo menos ${MIN_SALARIES} salários; as outras só com a contagem`, () => {
    const r = salaryBands([...rows('Balcão', [900, 950, 1000]), ...rows('balcao', [1100]), ...rows('Cozinha', [800, 820])]);
    expect(r.bands).toEqual([
      { role: 'Balcão', count: 4, min: expect.any(Number), max: expect.any(Number), median: 980 },
      { role: 'Cozinha', count: 2 },
    ]);
    expect(r.bands[0].min).toBeGreaterThanOrEqual(900);
    expect(r.bands[0].max).toBeLessThanOrEqual(1100);
  });

  it('os extremos não são o salário de ninguém: percentis arredondados às dezenas', () => {
    const r = salaryBands(rows('Equipa', [853, 900, 950, 1000, 1500]));
    const b = r.bands[0];
    expect(b.min! % 10).toBe(0);
    expect(b.max! % 10).toBe(0);
    expect(b.min).toBeGreaterThan(853);
    expect(b.max).toBeLessThan(1500);
    expect(b.median).toBe(950);
  });

  it('nome mostrado é a forma mais usada; ordena por número de salários', () => {
    const r = salaryBands([...rows('Fabrico', [1, 2, 3].map(() => 1000)), ...rows('balcão', [900]), ...rows('Balcão', [900, 900, 900])]);
    expect(r.bands.map((b) => b.role)).toEqual(['Balcão', 'Fabrico']);
  });

  it(`"pagam a horas" só com pelo menos ${MIN_SALARIES} respostas`, () => {
    const answers = (vals: (boolean | null)[]) => vals.map((paidOnTime) => ({ role: 'Equipa', monthlyGross: 900, paidOnTime }));
    expect(salaryBands(answers([true, false, null])).paidOnTimePct).toBeNull();
    expect(salaryBands(answers([true, true, false, null])).paidOnTimePct).toBe(67);
    expect(salaryBands([]).paidOnTimePct).toBeNull();
    expect(salaryBands([]).bands).toEqual([]);
  });
});

describe('interviewStats', () => {
  const i = (positive: boolean, offer: boolean, answered: boolean, difficulty: number | null, steps: string[]) => ({ positive, offer, answered, difficulty, steps });

  it('sem entrevistas não há números', () => expect(interviewStats([])).toBeNull());

  it('percentagens, dificuldade média e os passos mais comuns', () => {
    const s = interviewStats([
      i(true, true, true, 2, ['Conversa', 'Dia de experiência']),
      i(true, false, true, 3, ['Dia de experiência', 'Conversa']),
      i(false, false, false, null, ['Conversa']),
      i(true, false, true, null, ['Conversa']),
    ]);
    expect(s).toEqual({ positivePct: 75, offerPct: 25, answeredPct: 75, difficulty: 2.5, usualSteps: 'Conversa + Dia de experiência' });
  });

  it('sem dificuldade indicada: null', () => expect(interviewStats([i(true, true, true, null, ['Conversa'])])!.difficulty).toBeNull());
});
