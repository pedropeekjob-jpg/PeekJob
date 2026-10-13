import { describe, expect, it } from 'vitest';
import { dotFill, ringAria, ringDeg, ringText } from '../src/lib/rating';

describe('apresentação de notas', () => {
  it('bolinhas: cheia a partir de .75, meia a partir de .25, sem dados', () => {
    expect([0, 1, 2, 3, 4].map((k) => dotFill(3.5, k))).toEqual(['full', 'full', 'full', 'half', 'empty']);
    expect(dotFill(2.74, 2)).toBe('half');
    expect(dotFill(2.75, 2)).toBe('full');
    expect(dotFill(2.24, 2)).toBe('empty');
    expect(dotFill(null, 0)).toBe('none');
    expect(dotFill(0, 0)).toBe('empty');
  });

  it('anel: ângulo, texto e nome acessível', () => {
    expect(ringDeg(2.5, false)).toBe(180);
    expect(ringDeg(25, true)).toBe(90);
    expect(ringText(4.4, { muted: false, pct: false })).toBe('4,4');
    expect(ringText(72.6, { muted: false, pct: true })).toBe('73%');
    expect(ringText(4.4, { muted: true, pct: false })).toBe('—');
    expect(ringText(4.4, { label: '', muted: true, pct: false })).toBe('');
    expect(ringAria(4.4, { muted: false, pct: false })).toBe('Nota 4,4 de 5');
    expect(ringAria(50, { muted: false, pct: true })).toBe('50%');
    expect(ringAria(0, { muted: true, pct: true })).toBe('Ainda sem nota');
  });
});
