import { describe, expect, it } from 'vitest';
import { DISTRICTS, districtOf, isDistrict, MUNICIPALITIES } from '../src';

/** Contagens oficiais de concelhos por distrito e região autónoma */
const OFFICIAL: Record<string, number> = {
  Aveiro: 19, Beja: 14, Braga: 14, Bragança: 12, 'Castelo Branco': 11, Coimbra: 17, Évora: 14, Faro: 16, Guarda: 14, Leiria: 16,
  Lisboa: 16, Portalegre: 15, Porto: 18, Santarém: 21, Setúbal: 13, 'Viana do Castelo': 10, 'Vila Real': 14, Viseu: 24, Açores: 19, Madeira: 11,
};

describe('distritos e concelhos', () => {
  it('20 distritos/regiões e 308 concelhos, com as contagens oficiais', () => {
    expect(DISTRICTS).toHaveLength(20);
    for (const d of DISTRICTS) expect([d, MUNICIPALITIES[d].length]).toEqual([d, OFFICIAL[d]]);
    expect(DISTRICTS.reduce((n, d) => n + MUNICIPALITIES[d].length, 0)).toBe(308);
  });

  it('distrito de um concelho, sem ligar a acentos, maiúsculas ou espaços', () => {
    expect(districtOf('Matosinhos')).toBe('Porto');
    expect(districtOf('vila nova de gaia')).toBe('Porto');
    expect(districtOf('  Évora ')).toBe('Évora');
    expect(districtOf('evora')).toBe('Évora');
    expect(districtOf('Ponta Delgada')).toBe('Açores');
    expect(districtOf('Funchal')).toBe('Madeira');
    expect(districtOf('Porto Santo')).toBe('Madeira');
  });

  it('nomes que existem em duas regiões, localidades que não são concelhos e vazio: null', () => {
    expect(districtOf('Lagoa')).toBeNull();
    expect(districtOf('Calheta')).toBeNull();
    expect(MUNICIPALITIES.Faro).toContain('Lagoa');
    expect(MUNICIPALITIES.Açores).toContain('Lagoa');
    expect(districtOf('Leça da Palmeira')).toBeNull();
    expect(districtOf('')).toBeNull();
    expect(districtOf(null)).toBeNull();
  });

  it('valida nomes de distrito', () => {
    expect(isDistrict('Setúbal')).toBe(true);
    expect(isDistrict('Setubal')).toBe(false);
    expect(isDistrict(3)).toBe(false);
  });
});
