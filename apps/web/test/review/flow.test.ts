import { describe, expect, it } from 'vitest';
import { BAD_TAGS, REVIEW_TAGS } from '../../src/data/content';
import { countDone, DESKTOP_ORDER, isBadTag, toggleIn, withScore, MOBILE_ORDER, scoreOf, scoreWord, stepState, tagOrder, visibleTags } from '../../src/features/review/flow';

describe('fluxo de avaliar: regras', () => {
  it('as duas ordens têm os mesmos 8 critérios; respeito primeiro no telemóvel', () => {
    expect([...MOBILE_ORDER].sort()).toEqual([...DESKTOP_ORDER].sort());
    expect(MOBILE_ORDER[0]).toBe('respeito');
  });

  it('nota de um critério (0 sem nota) e quantas estão feitas', () => {
    expect(scoreOf({ salario: 4 }, 'salario')).toBe(4);
    expect(scoreOf({ salario: 0 }, 'salario')).toBe(0);
    expect(scoreOf({}, 'ambiente')).toBe(0);
    expect(countDone({ salario: 4, ambiente: 2, respeito: 0 })).toBe(2);
  });

  it('o que cada nota quer dizer (etiqueta do slider)', () => {
    expect([0, 1, 2, 3, 4, 5].map(scoreWord)).toEqual(['Sem nota', 'Péssimo', 'Mau', 'Aceitável', 'Bom', 'Excelente']);
    expect(scoreWord(9)).toBe('Excelente');
  });

  it('estado de cada passo', () => {
    expect([1, 2, 3].map((n) => stepState(n, 2))).toEqual(['done', 'current', 'todo']);
  });

  it('etiquetas: as más primeiro quando pedido; visíveis = primeiras + escolhidas, ou todas', () => {
    expect(tagOrder(false)).toBe(REVIEW_TAGS);
    expect(tagOrder(true).slice(0, BAD_TAGS.length)).toEqual(BAD_TAGS);
    expect(new Set(tagOrder(true))).toEqual(new Set(REVIEW_TAGS));
    expect(isBadTag('Sem contrato')).toBe(true);
    expect(isBadTag('Ambiente seguro')).toBe(false);
    expect(visibleTags(['a', 'b', 'c', 'd'], ['d'], 2, false)).toEqual(['a', 'b', 'd']);
    expect(visibleTags(['a', 'b', 'c'], [], 1, true)).toEqual(['a', 'b', 'c']);
  });

  it('mudar uma nota e alternar uma etiqueta sem alterar o original', () => {
    const scores = { salario: 3 };
    expect(withScore(scores, 'ambiente', 4)).toEqual({ salario: 3, ambiente: 4 });
    expect(withScore(scores, 'salario', 0)).toEqual({});
    expect(scores).toEqual({ salario: 3 });
    const tags = ['a'];
    expect(toggleIn(tags, 'b')).toEqual(['a', 'b']);
    expect(toggleIn(tags, 'a')).toEqual([]);
    expect(tags).toEqual(['a']);
  });
});
