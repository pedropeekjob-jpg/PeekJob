import { HttpVies } from '../../src/organizations/vies';

const reply = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe('VIES (Comissão Europeia): confirmar NIF de organizações', () => {
  it('pede o NIF português ao endpoint REST certo', async () => {
    const urls: string[] = [];
    const fetchFn = (async (url: string) => {
      urls.push(url);
      return new Response(JSON.stringify({ isValid: true, name: 'EDP, S.A.', address: 'AV 24 DE JULHO 12\n1249-300 LISBOA' }), { status: 200 });
    }) as unknown as typeof fetch;
    const r = await new HttpVies(fetchFn).check('500697256');
    expect(urls).toEqual(['https://ec.europa.eu/taxation_customs/vies/rest-api/ms/PT/vat/500697256']);
    expect(r).toEqual({ status: 'valid', name: 'EDP, S.A.', address: 'AV 24 DE JULHO 12, 1249-300 LISBOA' });
  });

  it('nome escondido ("---") fica vazio', async () => {
    const r = await new HttpVies(reply(200, { isValid: true, name: '---', address: '---' })).check('500697256');
    expect(r).toEqual({ status: 'valid', name: null, address: null });
  });

  it('NIF sem registo de IVA: "invalid" (não quer dizer que não exista — associações sem IVA)', async () => {
    expect(await new HttpVies(reply(200, { isValid: false, userError: 'INVALID' })).check('513000003')).toEqual({ status: 'invalid' });
  });

  it('serviço em baixo, erro do país ou tempo esgotado: "unavailable"', async () => {
    expect(await new HttpVies(reply(200, { isValid: false, userError: 'MS_UNAVAILABLE' })).check('500697256')).toEqual({ status: 'unavailable' });
    expect(await new HttpVies(reply(503, {})).check('500697256')).toEqual({ status: 'unavailable' });
    const hang = (() => new Promise(() => undefined)) as unknown as typeof fetch;
    expect(await new HttpVies(hang, undefined, 50).check('500697256')).toEqual({ status: 'unavailable' });
  });
});
