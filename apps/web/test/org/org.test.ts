import { describe, expect, it } from 'vitest';
import { ORG_BY_ID, type Org } from '../../src/data/orgs';
import { dotFill, harassmentLine, hiddenExtra, hiddenNote, salaryEmptyBody, interviewNumbers, interviewRings, locationsSuffix, osmLink, paidOnTimeCount, reviewLists, salaryScale, scoreAria, shareCta, splitCriteria } from '../../src/features/org/org';

const padaria = ORG_BY_ID['padaria-ribeira'];
const withSalaries = (salaries: Org['salaries']) => ({ ...padaria, salaries });

describe('página da organização: regras puras', () => {
  it('salários: só funções com 3+ e escala às centenas', () => {
    const o = withSalaries([
      { role: 'Balcão', min: 820, max: 1000, median: 900, count: 4 },
      { role: 'Cozinha', min: 900, max: 1200, median: 1000, count: 2 },
    ]);
    const s = salaryScale(o);
    expect(s.shown.map((x) => x.role)).toEqual(['Balcão']);
    expect(s.hidden.map((x) => x.role)).toEqual(['Cozinha']);
    expect(s.pos(700)).toBe(0); // 820-50 → 700
    expect(s.pos(1100)).toBe(100); // 1000+50 → 1100
    expect(hiddenExtra(o)).toBe('Cozinha tem 2 — falta 1');
    expect(hiddenNote(o)).toMatch(/pelo menos 3 salários.*Cozinha tem 2 — falta 1\.$/);
    expect(hiddenExtra(withSalaries([{ role: 'Sala', min: 1, max: 2, median: 1, count: 1 }]))).toBe('Sala tem 1 — faltam 2');
    expect(hiddenNote(withSalaries([]))).not.toMatch(/tem/);
    expect(salaryScale(withSalaries([])).pos(0)).toBe(0);
  });

  it('salários: sem funções visíveis, diz quantos já há em cada uma', () => {
    // quem acabou de partilhar o 1.º salário tem de ver que contou
    expect(salaryEmptyBody(withSalaries([{ role: 'Sala', min: 0, max: 0, median: 0, count: 1 }]))).toBe(
      'Mostramos uma função quando houver pelo menos 3 salários partilhados. Para já: Sala tem 1 — faltam 2.',
    );
    expect(salaryEmptyBody(withSalaries([]))).toBe('Mostramos uma função quando houver pelo menos 3 salários partilhados.');
  });

  it('entrevistas: estatísticas próprias ou calculadas', () => {
    expect(interviewNumbers(padaria).n).toBe(3);
    const calc = { ...padaria, interviewStats: undefined };
    expect(interviewNumbers(calc)).toMatchObject({ positivePct: 67, offerPct: 33, usualSteps: 'Conversa + dia de experiência' });
    expect(interviewRings(calc).map((r) => r.label)).toEqual(['Gostaram do processo', 'Receberam oferta']);
    expect(interviewRings(padaria).map((r) => r.label)).toEqual(['Dificuldade', 'Gostaram do processo', 'Tiveram resposta']);
    expect(interviewNumbers({ ...calc, interviews: [] })).toMatchObject({ n: 0, positivePct: 0 });
  });

  it('critérios: prioridades com número, restantes à parte', () => {
    const { rest, prio } = splitCriteria(['respeito', 'salario']);
    expect(prio('respeito')).toBe(1);
    expect(prio('ambiente')).toBeUndefined();
    expect(rest).toHaveLength(6);
  });

  it('bolinhas: cheia, meia, vazia', () => {
    expect([0, 1, 2, 3, 4].map((k) => dotFill(3.5, k))).toEqual(['full', 'full', 'full', 'half', 'empty']);
    expect(dotFill(null, 0)).toBe('empty');
  });

  it('avaliações: as minhas à parte, 2 de início', () => {
    const mine = [{ id: 'r1', orgId: 'padaria-ribeira' }] as never;
    const l = reviewLists(padaria, mine, false);
    expect(l.mine).toHaveLength(1);
    expect(l.others.map((r) => r.id)).not.toContain('r1');
    expect(l.shown).toHaveLength(2);
    expect(reviewLists(padaria, [], true).shown).toHaveLength(5);
  });

  it('textos', () => {
    expect(scoreAria(padaria)).toBe('Nota 4,4 de 5, com 23 avaliações');
    expect(scoreAria({ ...padaria, reviewsCount: 0 })).toBe('Ainda sem nota');
    expect(shareCta('entrevistas', 'Empresa')).toBe('Partilhar a minha entrevista');
    expect(shareCta('salarios', 'Voluntariado')).toBe('Avaliar esta organização');
    expect(shareCta('salarios', 'Empresa')).toBe('Partilhar o meu salário');
    expect(harassmentLine({ harassmentReports: 1, reviewsCount: 1 })).toBe('1 relato de assédio em 1 avaliação.');
    expect(locationsSuffix(1)).toBe('');
    expect(locationsSuffix(3)).toBe(' · 3 locais');
    expect(osmLink({ lat: 41.1, lng: -8.6 })).toBe('https://www.openstreetmap.org/?mlat=41.1&mlon=-8.6#map=17/41.1/-8.6');
    expect(paidOnTimeCount(padaria)).toBe(Math.round(0.92 * 21));
    expect(paidOnTimeCount({ ...padaria, paidOnTimePct: undefined })).toBe(0);
  });
});
