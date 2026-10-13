import { describe, expect, it } from 'vitest';
import { ctaText, isComplete, rankText, statusText, tintOf, togglePick } from '../../src/features/preferences/prefs';

describe('preferências: regras e textos', () => {
  it('escolher acrescenta no fim, tirar mantém a ordem, e nunca passa de 3', () => {
    expect(togglePick([], 'salario')).toEqual(['salario']);
    expect(togglePick(['salario', 'ambiente', 'respeito'], 'ambiente')).toEqual(['salario', 'respeito']);
    const full = ['salario', 'ambiente', 'respeito'] as const;
    expect(togglePick([...full], 'proposito')).toEqual(full);
    expect(isComplete([...full])).toBe(true);
    expect(isComplete(['salario'])).toBe(false);
  });

  it('linha de estado e botão', () => {
    expect(statusText(['respeito', 'salario', 'equilibrio'], false)).toBe('Respeito e inclusão · Salário justo · Equilíbrio');
    expect(statusText(['respeito'], false)).toBe('1 de 3 · toca de novo para tirar');
    expect(statusText(['respeito', 'salario', 'equilibrio'], true)).toBe('3 de 3 · clica de novo para tirar');
    expect(ctaText([])).toBe('Escolhe mais 3');
    expect(ctaText(['respeito', 'salario', 'equilibrio'])).toBe('Ver organizações para mim');
    expect(rankText(0)).toBe(', prioridade 1');
  });

  it('respeito tem fundo roxo; os outros verde-água', () => {
    expect(tintOf('respeito')).toBe('var(--purple-tint)');
    expect(tintOf('salario')).toBe('var(--teal-tint)');
  });
});
