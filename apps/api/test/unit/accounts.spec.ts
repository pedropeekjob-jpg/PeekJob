import { criteriaTrend, emailDomain, isPersonalDomain, tagTrend } from '../../src/accounts/accounts';

describe('contas das organizações (regras)', () => {
  it('domínio do email e serviços gratuitos', () => {
    expect(emailDomain(' Rosa@PadariaRibeira.PT ')).toBe('padariaribeira.pt');
    expect(emailDomain('sem-arroba')).toBe('');
    expect(isPersonalDomain('gmail.com')).toBe(true);
    expect(isPersonalDomain('SAPO.PT')).toBe(true);
    expect(isPersonalDomain('padariaribeira.pt')).toBe(false);
  });

  it('etiquetas: as mais citadas primeiro (empate por ordem alfabética), e se subiram', () => {
    const now = [['Horários cumpridos', 'Salário em atraso'], ['Horários cumpridos'], ['Ambiente seguro']];
    const before = [['Salário em atraso'], ['Salário em atraso'], ['Ambiente seguro']];
    expect(tagTrend(now, before)).toEqual([
      { label: 'Horários cumpridos', n: 2, up: true },
      { label: 'Ambiente seguro', n: 1, up: true },
      { label: 'Salário em atraso', n: 1, up: false },
    ]);
    expect(tagTrend(now, [], 1)).toEqual([{ label: 'Horários cumpridos', n: 2, up: true }]);
  });

  it('tendência por critério: média atual e variação face a antes (sem nada antes: 0); sem notas não aparece', () => {
    const since = new Date('2026-10-01');
    const rows = [
      { scores: { respeito: 2, salario: 3 }, createdAt: new Date('2026-09-01') },
      { scores: { respeito: 4 }, createdAt: new Date('2026-10-10') },
      { scores: { salario: 5 }, createdAt: new Date('2026-10-11') },
    ];
    expect(criteriaTrend(rows, ['respeito', 'salario', 'ambiente'], since)).toEqual({
      respeito: { now: 3, delta: 1 },
      salario: { now: 4, delta: 1 },
    });
    expect(criteriaTrend(rows.slice(1), ['respeito'], since)).toEqual({ respeito: { now: 4, delta: 0 } });
  });
});
