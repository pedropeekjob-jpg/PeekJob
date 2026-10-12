import { describe, expect, it } from 'vitest';
import { adjusted, matchScores } from '../src/match';
import type { Scores } from '../src/criteria';

const ribeira: Scores = { salario: 3.8, equilibrio: 4.1, respeito: 4.8, ambiente: 4.7, lideranca: 4.5, estabilidade: 4.3, progressao: 3.6, proposito: 4.2 };

describe('matchScores', () => {
  it('pondera as 3 prioridades com pesos 3, 2 e 1', () => {
    // (4.8*3 + 3.8*2 + 4.1*1) / (5*6) = 0.87
    expect(matchScores(ribeira, ['respeito', 'salario', 'equilibrio'])).toBe(87);
  });

  it('ignora critérios sem dados (ex.: salário no voluntariado)', () => {
    const vol: Scores = { ...ribeira, salario: null };
    // (4.8*3 + 4.1*1) / (5*4) = 0.925
    expect(matchScores(vol, ['respeito', 'salario', 'equilibrio'])).toBe(93);
  });

  it('devolve 0 sem prioridades', () => {
    expect(matchScores(ribeira, [])).toBe(0);
  });
});

describe('adjusted (média bayesiana)', () => {
  it('sem avaliações fica na média global', () => {
    expect(adjusted(4.6, 0)).toBeCloseTo(3.8);
  });
  it('com C avaliações fica a meio caminho', () => {
    expect(adjusted(4.6, 5)).toBeCloseTo(4.2);
  });
  it('com muitas avaliações aproxima-se da média real', () => {
    expect(adjusted(4.6, 500)).toBeGreaterThan(4.59);
  });
});
