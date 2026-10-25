import { describe, expect, it } from 'vitest';
import { validateNewOrg } from '../../src/features/review/useAddOrg';

const ok = { name: 'Horta da Sé', type: 'Associação' as const, city: 'Porto', district: null, nif: '' };
describe('validateNewOrg', () => {
  it('tudo certo', () => expect(validateNewOrg(ok)).toBeNull());
  it('NIF válido com espaços', () => expect(validateNewOrg({ ...ok, nif: '513 000 003' })).toBeNull());
  it.each([
    [{ name: ' ' }, 'Escreve o nome da organização.'],
    [{ city: '' }, 'Escreve a localidade.'],
    [{ nif: '123' }, 'O NIF não é válido.'],
    [{ type: 'Nome individual' as const }, 'Para quem trabalha em nome individual, o NIF é obrigatório.'],
  ])('%o → %s', (patch, msg) => expect(validateNewOrg({ ...ok, ...patch })).toBe(msg));
});
