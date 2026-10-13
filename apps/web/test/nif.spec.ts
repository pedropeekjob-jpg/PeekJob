import { describe, expect, it } from 'vitest';
import { cityFromAddress } from '../src/components/NifField';

describe('localidade a partir da morada oficial (VIES)', () => {
  it.each([
    ['AV 24 DE JULHO 12, 1249-300 LISBOA', 'Lisboa'],
    ['RUA DE CEDOFEITA 100, 4050-180 PORTO', 'Porto'],
    ['RUA X, 4400-001 VILA NOVA DE GAIA', 'Vila Nova de Gaia'],
    ['RUA SEM CODIGO', null],
    [null, null],
  ])('%s → %s', (addr, city) => {
    expect(cityFromAddress(addr)).toBe(city);
  });
});
