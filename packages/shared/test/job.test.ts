import { describe, expect, it } from 'vitest';
import { CreateReviewInput, jobYears, JOB_FIRST_YEAR, publicJob, ReviewJobInput, tenureBand, thisYear } from '../src';

describe('cargo e período (25/10)', () => {
  const now = thisYear();

  it('aceita quem ainda lá trabalha (sem saída) e quem já saiu (saída depois da entrada)', () => {
    expect(ReviewJobInput.parse({ role: '  Balcão ', current: true, from: 2021 })).toEqual({ role: 'Balcão', current: true, from: 2021, to: null });
    expect(ReviewJobInput.parse({ role: 'Cozinha', current: false, from: 2019, to: 2019 }).to).toBe(2019);
  });

  it('recusa datas incoerentes, anos no futuro e cargo vazio', () => {
    const bad = (j: object) => ReviewJobInput.safeParse(j).success;
    expect(bad({ role: 'Balcão', current: true, from: 2021, to: 2022 })).toBe(false);
    expect(bad({ role: 'Balcão', current: false, from: 2021 })).toBe(false);
    expect(bad({ role: 'Balcão', current: false, from: 2021, to: 2020 })).toBe(false);
    expect(bad({ role: 'Balcão', current: true, from: now + 1 })).toBe(false);
    expect(bad({ role: 'Balcão', current: true, from: JOB_FIRST_YEAR - 1 })).toBe(false);
    expect(bad({ role: ' ', current: true, from: 2021 })).toBe(false);
  });

  it('na avaliação é opcional (as de antes não o têm)', () => {
    const base = { scores: { salario: 3 } };
    expect(CreateReviewInput.parse(base).job).toBeUndefined();
    expect(CreateReviewInput.parse({ ...base, job: { role: 'Balcão', current: true, from: 2020 } }).job?.role).toBe('Balcão');
  });

  it('em público só vai o cargo, se ainda lá trabalha e o escalão de tempo (nunca os anos)', () => {
    expect(tenureBand(2024, null, 2024)).toBe('lt1');
    expect(tenureBand(2021, 2024)).toBe('1to3');
    expect(tenureBand(2015, null, 2024)).toBe('gt3');
    expect(publicJob({ role: 'Balcão', current: false, from: 2018, to: 2020 })).toEqual({ role: 'Balcão', current: false, tenure: '1to3' });
    expect(publicJob(null)).toBeNull();
  });

  it('anos para escolher: do atual até ao primeiro', () => {
    const years = jobYears(2026);
    expect(years[0]).toBe(2026);
    expect(years.at(-1)).toBe(JOB_FIRST_YEAR);
  });
});
