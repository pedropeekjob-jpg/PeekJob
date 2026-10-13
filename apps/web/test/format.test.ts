import { describe, expect, it } from 'vitest';
import { byPt } from '../src/lib/format';

describe('byPt: ordem alfabética portuguesa', () => {
  it('acentos ficam no sítio certo (não depois do Z)', () => {
    expect(['Zona', 'Óbidos', 'Évora', 'Amadora'].sort(byPt)).toEqual(['Amadora', 'Évora', 'Óbidos', 'Zona']);
  });
});
