import { describe, expect, it } from 'vitest';
import { CreateOrganizationInput, CreateReviewInput } from '../src/schemas';

describe('CreateOrganizationInput', () => {
  const base = { name: '  Padaria Nova  ', type: 'PME', city: 'Porto' };

  it('aceita dados mínimos e normaliza espaços', () => {
    const r = CreateOrganizationInput.parse(base);
    expect(r.name).toBe('Padaria Nova');
    expect(r.nif).toBeUndefined();
  });

  it('normaliza e valida o NIF', () => {
    expect(CreateOrganizationInput.parse({ ...base, nif: 'PT 500 000 000' }).nif).toBe('500000000');
    expect(() => CreateOrganizationInput.parse({ ...base, nif: '500000001' })).toThrow();
  });

  it('exige NIF a empresas em nome individual (o nome pode ser o de uma pessoa)', () => {
    expect(() => CreateOrganizationInput.parse({ ...base, type: 'Nome individual' })).toThrow(/NIF/);
  });

  it('aceita grandes empresas (qualquer empresa pode ser avaliada)', () => {
    expect(CreateOrganizationInput.parse({ ...base, name: 'Continente', type: 'Grande empresa' }).type).toBe('Grande empresa');
  });

  it('recusa tipos desconhecidos e nomes curtos', () => {
    expect(() => CreateOrganizationInput.parse({ ...base, type: 'Multinacional' })).toThrow();
    expect(() => CreateOrganizationInput.parse({ ...base, name: 'A' })).toThrow();
  });
});

describe('CreateReviewInput', () => {
  const base = { scores: { respeito: 5, salario: 3 }, recommend: true, tags: ['Horários cumpridos'], text: 'Bom sítio.' };

  it('aceita notas parciais de 1 a 5', () => {
    expect(CreateReviewInput.parse(base).scores).toEqual({ respeito: 5, salario: 3 });
  });

  it('exige pelo menos uma nota', () => {
    expect(() => CreateReviewInput.parse({ ...base, scores: {} })).toThrow();
  });

  it('recusa notas fora de 1–5 e critérios desconhecidos', () => {
    expect(() => CreateReviewInput.parse({ ...base, scores: { respeito: 6 } })).toThrow();
    expect(() => CreateReviewInput.parse({ ...base, scores: { beleza: 3 } })).toThrow();
  });

  it('limita o texto a 600 caracteres', () => {
    expect(() => CreateReviewInput.parse({ ...base, text: 'x'.repeat(601) })).toThrow();
  });

  it('só aceita etiquetas conhecidas', () => {
    expect(() => CreateReviewInput.parse({ ...base, tags: ['Inventada'] })).toThrow();
  });
});
