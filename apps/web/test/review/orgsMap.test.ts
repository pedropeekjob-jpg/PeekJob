import { describe, expect, it } from 'vitest';
import { ORGS, type Org } from '../../src/data/orgs';
import { matchPins, orgPins } from '../../src/features/review/orgsMap';

const base = ORGS.find((o) => o.id === 'lavandaria-sol')!;
const org = (patch: Partial<Org>): Org => ({ ...base, ...patch });

describe('mapa das organizações avaliadas: pinos', () => {
  it('um pino por local com coordenadas, com a nota geral da organização', () => {
    const pins = orgPins([ORGS.find((o) => o.id === 'padaria-ribeira')!]);
    expect(pins.map((p) => p.locationId)).toEqual(['flores', 'campanha']);
    expect(pins[0]).toMatchObject({ orgId: 'padaria-ribeira', name: 'Padaria Ribeira', place: 'Loja · Rua das Flores', address: 'Rua das Flores, 112, Porto', lat: 41.1437, lng: -8.6129 });
  });

  it('só organizações já avaliadas; nome individual e locais sem coordenadas ficam de fora', () => {
    const pins = orgPins([
      org({ id: 'sem-avaliacoes', reviewsCount: 0 }),
      org({ id: 'pessoa', type: 'Nome individual' }),
      org({ id: 'sem-coords', locations: [{ ...base.locations[0], lat: 0, lng: 0 }] }),
      org({ id: 'ok' }),
    ]);
    expect(pins.map((p) => p.orgId)).toEqual(['ok']);
  });

  it('procura pelo nome, pela localidade ou pela morada (sem acentos nem maiúsculas)', () => {
    const pins = orgPins(ORGS);
    expect(matchPins(pins, '').length).toBe(pins.length);
    expect(matchPins(pins, 'rua brito capelo').map((p) => p.orgId)).toEqual(['lavandaria-sol']);
    expect(matchPins(pins, 'CAMPANHA').map((p) => p.locationId)).toEqual(['campanha']);
    expect(matchPins(pins, 'matosinhos').every((p) => p.city === 'Matosinhos' || /Matosinhos/.test(p.address))).toBe(true);
    expect(matchPins(pins, 'lavandaria').map((p) => p.orgId)).toEqual(['lavandaria-sol']);
  });
});
