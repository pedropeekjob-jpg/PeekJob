import { describe, expect, it } from 'vitest';
import { cursorLabelSpot, isTypingKey, reviewHref, searchHref, zoneFromParam, zoneParam } from '../../src/features/home/home';

describe('página inicial: regras', () => {
  it('zona no endereço (?lado=) e de volta', () => {
    expect(zoneFromParam('espreitar')).toBe('peek');
    expect(zoneFromParam('avaliar')).toBe('job');
    expect(zoneFromParam(null)).toBeNull();
    expect(zoneFromParam('xpto')).toBeNull();
    expect(zoneParam('peek')).toBe('espreitar');
    expect(zoneParam('job')).toBe('avaliar');
  });

  it('para onde vai a pesquisa', () => {
    expect(searchHref('  padaria ribeira ')).toBe('/pesquisa?q=padaria+ribeira');
    expect(searchHref('   ')).toBe('/pesquisa');
  });

  it('para onde vai "o teu trabalho"', () => {
    expect(reviewHref(' padaria ribeira ')).toBe('/avaliar?q=padaria+ribeira');
    expect(reviewHref('')).toBe('/avaliar');
  });

  it('só letras e números (sem Ctrl/Cmd/Alt) abrem a pesquisa', () => {
    const k = (key: string, mods: Partial<Record<'ctrlKey' | 'metaKey' | 'altKey', boolean>> = {}) => ({ key, ctrlKey: false, metaKey: false, altKey: false, ...mods });
    expect(isTypingKey(k('p'))).toBe(true);
    expect(isTypingKey(k('Ç'))).toBe(true);
    expect(isTypingKey(k('7'))).toBe(true);
    expect(isTypingKey(k(' '))).toBe(false);
    expect(isTypingKey(k('Enter'))).toBe(false);
    expect(isTypingKey(k('c', { ctrlKey: true }))).toBe(false);
    expect(isTypingKey(k('v', { metaKey: true }))).toBe(false);
    expect(isTypingKey(k('/'))).toBe(false);
  });

  describe('etiqueta junto ao rato', () => {
    const size = { w: 200, h: 60 };
    const zone = { w: 1000, h: 400 };
    // o logo ao centro, a entrar pela parte de baixo da zona de cima
    const logo = { left: 400, top: 300, right: 600, bottom: 460 };
    const overlaps = (p: { x: number; y: number }) =>
      p.x < logo.right && p.x + size.w > logo.left && p.y < logo.bottom && p.y + size.h > logo.top;

    it('longe do logo fica em baixo à direita do cursor', () => {
      expect(cursorLabelSpot({ x: 100, y: 100 }, size, zone, logo)).toEqual({ x: 118, y: 118 });
    });

    it('perto da margem direita passa para a esquerda do cursor', () => {
      expect(cursorLabelSpot({ x: 950, y: 100 }, size, zone, logo)).toEqual({ x: 732, y: 118 });
    });

    it('nunca se sobrepõe ao logo, em nenhum ponto da zona', () => {
      for (let x = 0; x <= zone.w; x += 25)
        for (let y = 0; y <= zone.h; y += 25) {
          if (x >= logo.left && x <= logo.right && y >= logo.top) continue; // o cursor em cima do logo esconde a etiqueta
          const p = cursorLabelSpot({ x, y }, size, zone, logo);
          expect(overlaps(p), `cursor em ${x},${y}`).toBe(false);
        }
    });

    it('sem logo (zona aberta) só fica dentro da zona', () => {
      expect(cursorLabelSpot({ x: 990, y: 390 }, size, zone, null)).toEqual({ x: 772, y: 312 });
    });
  });
});
