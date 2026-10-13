import { describe, expect, it } from 'vitest';
import { ORGS } from '../../src/data/orgs';
import { cityRank, CRITERIA_ORDER, direction, harassmentNote, ordinalEn, pulseStats, weekChange } from '../../src/features/painel/painel';

describe('painel: regras e textos', () => {
  it('ordinais em inglês, incluindo 11–13', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101, 111].map(ordinalEn)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '101st', '111th']);
  });

  it('posição na cidade só entre organizações avaliadas; 0 se não aparece', () => {
    const porto = ORGS.filter((o) => o.city === 'Porto' && o.reviewsCount > 0).sort((a, b) => b.score - a.score);
    expect(cityRank(ORGS, porto[0])).toBe(1);
    expect(cityRank(ORGS, porto[2])).toBe(3);
    expect(cityRank(ORGS, { ...porto[0], id: 'outra', reviewsCount: 0 })).toBe(0);
  });

  it('variação da semana e direção', () => {
    expect([direction(0.2), direction(-1), direction(0)]).toEqual(['up', 'down', 'flat']);
    expect(weekChange(0.1)).toBe('▲ 0,1 esta semana');
    expect(weekChange(-0.3)).toBe('▼ 0,3 esta semana');
    expect(weekChange(0)).toBe('= 0,0 esta semana');
  });

  it('pulso: posição com subida/descida só quando houve mudança', () => {
    const org = ORGS[0];
    expect(pulseStats({ ...org, trend: 2 }, 3, 3, 1)).toEqual([
      { value: '3', label: 'avaliações novas' },
      { value: '3.º', label: `em ${org.city} (▲ 2)` },
      { value: '1/3', label: 'respondidas' },
    ]);
    expect(pulseStats({ ...org, trend: -1 }, 2, 3, 0)[1].label).toBe(`em ${org.city} (▼ 1)`);
    expect(pulseStats({ ...org, trend: 0 }, 2, 3, 0)[1].label).toBe(`em ${org.city}`);
    expect(pulseStats({ ...org, trend: 'novo' }, 2, 3, 0)[1].label).toBe(`em ${org.city}`);
  });

  it('assédio e ordem dos critérios', () => {
    expect(harassmentNote(0)).toBe('Sem relatos de assédio.');
    expect(harassmentNote(2)).toBe('2 relatos de assédio — lê-os com atenção.');
    expect(new Set(CRITERIA_ORDER).size).toBe(8);
  });
});
