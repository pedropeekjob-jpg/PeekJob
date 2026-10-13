import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ORGS } from '../../src/data/orgs';
import { compatibility, countText, emptyTitle, needsSearch, rankResults, ringLabel, SEARCH_MS } from '../../src/features/search/search';
import { useAppliedQuery } from '../../src/features/search/useSearchPage';
import { match } from '../../src/lib/match';

const [padaria, maos] = ORGS;
const unrated = { ...padaria, id: 'nova', name: 'Nova', reviewsCount: 0, score: 0 };

describe('pesquisa: regras e textos', () => {
  it('compatibilidade: pelas prioridades, pela nota sem prioridades, null sem avaliações', () => {
    expect(compatibility(padaria, [])).toBe(88);
    expect(compatibility(padaria, ['salario'])).toBe(match(padaria, ['salario']));
    expect(compatibility(unrated, [])).toBeNull();
  });

  it('ordena pela compatibilidade, desempata pela nota e põe as sem avaliações no fim', () => {
    const tie = { ...padaria, id: 'tie', score: 4.41 };
    expect(rankResults([unrated, padaria, maos, tie], []).map((r) => r.org.id)).toEqual([maos.id, 'tie', padaria.id, 'nova']);
    expect(rankResults([], ['salario'])).toEqual([]);
  });

  it('procura de novo quando o termo muda ou a procura anterior não acabou', () => {
    expect(needsSearch(' porto ', 'porto', false)).toBe(false);
    expect(needsSearch('porto', 'braga', false)).toBe(true);
    expect(needsSearch('porto', 'porto', true)).toBe(true);
  });

  it('textos: contagem, sem resultados e nota', () => {
    expect(countText(1, false)).toBe('1 resultado, ordenado para ti');
    expect(countText(3, false)).toBe('3 resultados, ordenados para ti');
    expect(countText(1, true)).toBe('1 resultado, por compatibilidade');
    expect(countText(0, true)).toBe('0 resultados, por compatibilidade');
    expect(emptyTitle('  zzz ')).toBe('Nada encontrado para “zzz”');
    expect(emptyTitle(' ')).toBe('Nada encontrado com este filtro');
    expect(ringLabel(unrated)).toBe('Ainda sem avaliações');
    expect(ringLabel(padaria)).toBe('Nota 4,4 de 5, 23 avaliações');
  });
});

describe('useAppliedQuery', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('sem termo inicial não procura; cada mudança espera e só então aplica', () => {
    const onSettle = vi.fn();
    const { result, rerender } = renderHook(({ q }) => useAppliedQuery(q, onSettle), { initialProps: { q: '' } });
    expect(result.current).toEqual({ applied: '', loading: false });

    rerender({ q: 'por' });
    expect(result.current).toEqual({ applied: '', loading: true });
    act(() => vi.advanceTimersByTime(SEARCH_MS / 2));
    rerender({ q: 'porto' }); // escrever reinicia a espera
    act(() => vi.advanceTimersByTime(SEARCH_MS - 1));
    expect(result.current.applied).toBe('');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toEqual({ applied: 'porto', loading: false });
    expect(onSettle).toHaveBeenCalledTimes(1);

    rerender({ q: 'porto ' }); // só espaços: não procura
    expect(result.current.loading).toBe(false);
  });

  it('com termo inicial começa a procurar', () => {
    const { result } = renderHook(() => useAppliedQuery('gaia', () => {}));
    expect(result.current).toEqual({ applied: 'gaia', loading: true });
    act(() => vi.advanceTimersByTime(SEARCH_MS));
    expect(result.current).toEqual({ applied: 'gaia', loading: false });
  });
});
