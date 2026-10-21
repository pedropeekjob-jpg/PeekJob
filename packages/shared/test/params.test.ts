import { describe, expect, it } from 'vitest';
import { CreateReviewInput, EXTRA_PARAMS, extraKind, suggestedExtras } from '../src';

describe('parâmetros por tipo de trabalho', () => {
  it('sugere 3 conforme o setor, sem acentos nem maiúsculas a contar', () => {
    expect(suggestedExtras('Restauração')).toEqual(['gorjetas', 'folgas_escala', 'refeicao']);
    expect(suggestedExtras('Ação social')).toEqual(['descanso_turnos', 'protecao', 'equipa_suficiente']);
    expect(suggestedExtras('LIMPEZA')).toEqual(['seguranca', 'pausas', 'esforco_fisico']);
    expect(suggestedExtras('Tecnologia')).toEqual(['remoto', 'equipamento', 'formacao_paga']);
    expect(suggestedExtras('Educação')).toEqual(['grupos_razoaveis', 'preparacao_paga', 'formacao_paga']);
  });

  it('voluntariado e associações sem setor conhecido; e o geral', () => {
    expect(suggestedExtras('Comunidade', 'Associação')).toEqual(['despesas', 'acompanhamento', 'reconhecimento']);
    expect(suggestedExtras(null, 'Voluntariado')).toEqual(['despesas', 'acompanhamento', 'reconhecimento']);
    expect(suggestedExtras('—', 'PME')).toEqual(['contrato_escrito', 'horas_extra_pagas', 'pausas']);
  });

  it('todos os sugeridos existem e as chaves não se repetem', () => {
    const keys = EXTRA_PARAMS.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const s of ['Restauração', 'Saúde', 'Comércio', 'Design', 'Escola', null]) for (const k of suggestedExtras(s)) expect(keys).toContain(k);
  });
});

describe('avaliação com parâmetros e comentários', () => {
  const base = { scores: { ambiente: 4 } };
  it('nota de 1 a 5 nas escalas e sim/não nos outros', () => {
    expect(extraKind('gorjetas')).toBe('yesno');
    expect(CreateReviewInput.parse({ ...base, extras: { gorjetas: true, folgas_escala: 2 } }).extras).toEqual({ gorjetas: true, folgas_escala: 2 });
    expect(CreateReviewInput.safeParse({ ...base, extras: { gorjetas: 3 } }).success).toBe(false);
    expect(CreateReviewInput.safeParse({ ...base, extras: { folgas_escala: true } }).success).toBe(false);
    expect(CreateReviewInput.safeParse({ ...base, extras: { inventado: true } }).success).toBe(false);
  });

  it('comentários por critério ou parâmetro: curtos, e os vazios caem', () => {
    const r = CreateReviewInput.parse({ ...base, comments: { ambiente: ' Boa equipa. ', salario: '  ', gorjetas: 'Divididas.' } });
    expect(r.comments).toEqual({ ambiente: 'Boa equipa.', gorjetas: 'Divididas.' });
    expect(CreateReviewInput.safeParse({ ...base, comments: { ambiente: 'x'.repeat(281) } }).success).toBe(false);
    expect(CreateReviewInput.parse(base)).toMatchObject({ extras: {}, comments: {} });
  });
});
