import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NEXT_TTL_MS, rememberNext, safeNext, takeNext } from '../../src/lib/returnTo';

describe('voltar depois de entrar', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.useRealTimers());

  it('só aceita caminhos deste site', () => {
    expect(safeNext('/avaliar/notas')).toBe('/avaliar/notas');
    expect(safeNext('/org/x?tab=1')).toBe('/org/x?tab=1');
    expect(safeNext('//mau.pt')).toBeNull();
    expect(safeNext('/\\mau.pt')).toBeNull();
    expect(safeNext('https://mau.pt')).toBeNull();
    expect(safeNext('avaliar')).toBeNull();
    expect(safeNext('')).toBeNull();
    expect(safeNext(null)).toBeNull();
  });

  it('guarda o destino até o link do email ser aberto, uma só vez', () => {
    rememberNext('/avaliar/notas');
    expect(takeNext()).toBe('/avaliar/notas');
    expect(takeNext()).toBeNull();
  });

  it('esquece destinos inseguros, expirados ou estragados', () => {
    rememberNext('//mau.pt');
    expect(takeNext()).toBeNull();
    vi.useFakeTimers();
    rememberNext('/avaliar/notas');
    vi.advanceTimersByTime(NEXT_TTL_MS + 1);
    expect(takeNext()).toBeNull();
    localStorage.setItem('pj-next', '{nada');
    expect(takeNext()).toBeNull();
    rememberNext(null);
    expect(localStorage.getItem('pj-next')).toBeNull();
  });
});
