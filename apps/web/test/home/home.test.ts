import { describe, expect, it } from 'vitest';
import { isTypingKey, searchHref, zoneFromParam, zoneParam } from '../../src/features/home/home';

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
});
