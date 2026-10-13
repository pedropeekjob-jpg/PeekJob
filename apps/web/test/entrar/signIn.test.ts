import { describe, expect, it } from 'vitest';
import { RINGS_DESKTOP, RINGS_MOBILE, ringVars } from '../../src/features/auth/signIn';

describe('anéis decorativos', () => {
  it('posição em px ou %, tamanho e espessura em px, atraso de 0,8 s entre anéis', () => {
    expect(ringVars([30, 40, 70, 10, '#00A9AF', 1], 0, 'px')).toEqual({ '--x': '30px', '--y': '40px', '--s': '70px', '--b': '10px', '--c': '#00A9AF', '--o': '1', '--delay': '0.0s' });
    expect(ringVars([52, 0, 210, 22, '#FFFFFF', 0.85], 3, '%')).toMatchObject({ '--x': '52%', '--y': '0%', '--o': '0.85', '--delay': '2.4s' });
  });
  it('cada anel é único (usado como chave)', () => {
    for (const list of [RINGS_MOBILE, RINGS_DESKTOP]) expect(new Set(list.map((r) => r.join())).size).toBe(list.length);
  });
});
