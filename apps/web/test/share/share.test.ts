import { describe, expect, it } from 'vitest';
import { ORG_BY_ID } from '../../src/data/orgs';
import { emptyShared, orgTabPath, parseEuros, shareErrorMessage, withShared } from '../../src/features/share/share';
import type { Failure } from '../../src/lib/store';

const fail = (status: number, body: Record<string, unknown> | null = null, message = 'erro'): Failure => ({ ok: false, status, message, body });
const ribeira = ORG_BY_ID['padaria-ribeira'];

describe('partilhar entrevista ou salário (regras)', () => {
  it('lê euros como as pessoas escrevem', () => {
    expect(parseEuros('950')).toBe(950);
    expect(parseEuros(' 1.050 € ')).toBe(1050);
    expect(parseEuros('1 050,50')).toBe(1051);
    expect(parseEuros('1050.5')).toBe(1051);
    expect(parseEuros('')).toBeNull();
    expect(parseEuros('mil')).toBeNull();
  });

  it('volta ao separador certo da organização', () => {
    expect(orgTabPath('padaria-ribeira', 'entrevista')).toBe('/org/padaria-ribeira/entrevistas');
    expect(orgTabPath('a b', 'salario')).toBe('/org/a%20b/salarios');
  });

  it('erros: insultos com sugestão, já partilhado, entrar', () => {
    expect(shareErrorMessage(fail(422, { suggestion: 'Sem nomes.' }), 'entrevista')).toEqual({ message: 'Tira nomes de pessoas e insultos. Descreve a situação.', suggestion: 'Sem nomes.' });
    expect(shareErrorMessage(fail(422, { code: 'PERSONAL_ATTACK' }), 'salario').message).toBe('Tira nomes de pessoas e insultos. Descreve a situação.');
    expect(shareErrorMessage(fail(409), 'entrevista').message).toBe('Já partilhaste uma entrevista nesta organização.');
    expect(shareErrorMessage(fail(401), 'salario')).toEqual({ message: 'Entra para partilhar.', signIn: true });
    expect(shareErrorMessage(fail(500, null, 'Sem ligação ao servidor.'), 'salario')).toEqual({ message: 'Sem ligação ao servidor.' });
  });

  it('demonstração: sem nada partilhado a organização fica igual', () => {
    expect(withShared(ribeira, emptyShared())).toBe(ribeira);
  });

  it('demonstração: a minha entrevista aparece primeiro; o meu salário soma à função (ou cria uma escondida)', () => {
    const mine = { id: 'eu', role: 'Balcão', when: 'hoje', positive: true, offer: true, steps: 'Conversa', body: '' };
    const o = withShared(ribeira, {
      interviews: { 'padaria-ribeira': mine },
      salaries: { 'padaria-ribeira': { role: 'balcao', monthlyGross: 990, paidOnTime: true } },
    });
    expect(o.interviews[0]).toBe(mine);
    expect(o.interviews).toHaveLength(ribeira.interviews.length + 1);
    expect(o.salaries.find((s) => s.role === 'Balcão')!.count).toBe(10);
    const other = withShared(ribeira, { interviews: {}, salaries: { 'padaria-ribeira': { role: 'Cozinha', monthlyGross: 900, paidOnTime: null } } });
    expect(other.salaries.at(-1)).toEqual({ role: 'Cozinha', count: 1, min: 0, max: 0, median: 0 });
  });
});
