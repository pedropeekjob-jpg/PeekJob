import { describe, expect, it } from 'vitest';
import { FAQ, ringDegrees, STEPS, weekTrend } from '../../src/features/organizations/forOrgs';

describe('para organizações: conteúdo e regras', () => {
  it('graus do anel pela nota de 0 a 5', () => {
    expect(ringDegrees(0)).toBe(0);
    expect(ringDegrees(4.4)).toBe(317);
    expect(ringDegrees(5)).toBe(360);
  });

  it('variação da semana: seta conforme o sentido e valor absoluto', () => {
    expect(weekTrend(0.1)).toBe('▲ 0,1 esta semana');
    expect(weekTrend(-0.2)).toBe('▼ 0,2 esta semana');
    expect(weekTrend(0)).toBe('= 0,0 esta semana');
  });

  it('três passos e cinco perguntas, sem textos vazios', () => {
    expect(STEPS()).toHaveLength(3);
    expect(FAQ()).toHaveLength(5);
    for (const f of FAQ()) expect(f.q.length && f.a.length).toBeTruthy();
  });
});
