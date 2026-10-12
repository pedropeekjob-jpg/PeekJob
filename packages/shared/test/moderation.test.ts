import { describe, expect, it } from 'vitest';
import { detectRedFlags, findPersonalAttacks, softenText } from '../src/moderation';

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
