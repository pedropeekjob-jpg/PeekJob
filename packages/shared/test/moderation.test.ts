import { describe, expect, it } from 'vitest';
import { detectRedFlags, findPersonalAttacks, softenText, toneIssues } from '../src/moderation';

describe('detectRedFlags', () => {
  it('deteta salário em atraso e assédio sexual no texto', () => {
    const r = detectRedFlags('Há meses que o salário chega com atraso. O encarregado faz comentários sobre o meu corpo.');
    expect(r.flagged).toBe(true);
    expect(r.kinds).toEqual(expect.arrayContaining(['incumprimento salarial', 'assédio sexual']));
  });

  it.each([
    ['assédio moral', 'O chefe grita e humilha a equipa.'],
    ['trabalho não declarado', 'Trabalhei dois anos sem contrato.'],
    ['discriminação', 'Há discriminação contra quem tem filhos.'],
    ['incumprimento salarial', 'As horas extra nunca são pagas.'],
  ])('deteta %s', (kind, text) => {
    expect(detectRedFlags(text).kinds).toContain(kind);
  });

  it('considera as etiquetas "más" mesmo sem texto', () => {
    const r = detectRedFlags('', ['Sem contrato']);
    expect(r.flagged).toBe(true);
  });

  it('deteta também textos em inglês (mesmas categorias)', () => {
    const r = detectRedFlags('My pay is always late and the manager makes comments about my body. He shouts and humiliates us.');
    expect(r.flagged).toBe(true);
    expect(r.kinds).toEqual(expect.arrayContaining(['incumprimento salarial', 'assédio sexual', 'assédio moral']));
    expect(detectRedFlags('Unpaid overtime every week, no contract, cash in hand.').kinds).toEqual(
      expect.arrayContaining(['incumprimento salarial', 'trabalho não declarado']),
    );
    expect(detectRedFlags('Great team, fair pay and flexible hours.').flagged).toBe(false);
  });

  it('não marca um texto positivo', () => {
    expect(detectRedFlags('Equipa simpática, horários cumpridos e salário a horas.').flagged).toBe(false);
  });
});

describe('findPersonalAttacks', () => {
  it('encontra insultos', () => {
    expect(findPersonalAttacks('A gestão é incompetente.').insults).toContain('incompetente');
  });

  it('encontra nomes próprios de pessoas', () => {
    expect(findPersonalAttacks('O Ricardo muda tudo sem avisar.').names).toContain('Ricardo');
    expect(findPersonalAttacks('A Ana Sousa grita com todos.').names).toContain('Ana');
  });

  it('não confunde início de frase nem nomes de lugares comuns', () => {
    const r = findPersonalAttacks('Porto é ótimo. Equipa unida e chefia que ouve.');
    expect(r.names).toEqual([]);
    expect(r.blocked).toBe(false);
  });

  it('bloqueia quando há insulto ou nome', () => {
    expect(findPersonalAttacks('O Ricardo é idiota.').blocked).toBe(true);
  });
});

describe('softenText', () => {
  it('substitui nomes e insultos por formulações neutras', () => {
    const out = softenText('O Ricardo é incompetente e muda tudo.');
    expect(out).not.toMatch(/Ricardo|incompetente/);
    expect(findPersonalAttacks(out).blocked).toBe(false);
  });
});

describe('textos em inglês e tom agressivo', () => {
  it('bloqueia também insultos em inglês', () => {
    const r = findPersonalAttacks('The manager is an idiot and totally incompetent.');
    expect(r.blocked).toBe(true);
    expect(r.insults).toEqual(expect.arrayContaining(['idiot', 'incompetent']));
  });

  it('a reescrita por regras usa o idioma do texto', () => {
    const out = softenText('Ricardo is an idiot.', undefined, 'en');
    expect(out).toMatch(/^The manager is/);
    expect(findPersonalAttacks(out).blocked).toBe(false);
    expect(out).not.toMatch(/a chefia|desorganizada/);
  });

  it('toneIssues: deteta insultos, nomes, gritos (MAIÚSCULAS) e palavrões, sem bloquear os dois últimos', () => {
    expect(toneIssues('Equipa unida e horários cumpridos.')).toEqual({ aggressive: false, blocked: false, reasons: [] });
    expect(toneIssues('O Ricardo é idiota').reasons).toEqual(expect.arrayContaining(['insult', 'name']));
    const shout = toneIssues('NUNCA PAGAM A HORAS E ISTO É UMA VERGONHA!!!');
    expect(shout).toMatchObject({ aggressive: true, blocked: false });
    expect(shout.reasons).toContain('shouting');
    expect(toneIssues('Que merda de horários.').reasons).toContain('profanity');
    expect(toneIssues('This place is shit.').reasons).toContain('profanity');
  });

  it('siglas curtas não contam como gritar', () => {
    expect(toneIssues('Trabalhei numa PME com IVA e IRS em dia.').aggressive).toBe(false);
  });
});
