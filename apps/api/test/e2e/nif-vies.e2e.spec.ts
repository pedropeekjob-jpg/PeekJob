import { VIES, type ViesClient, type ViesResult } from '../../src/organizations/vies';
import { createTestApp, goodReview, resetDb, TestCtx } from '../helpers';

/**
 * NIF confirmado no VIES (registo europeu de IVA, gratuito).
 * Confirma que a organização existe e dá o nome oficial. Não bloqueia: associações sem IVA não aparecem no VIES.
 */
describe('Organizações: NIF confirmado no VIES', () => {
  let t: TestCtx;
  const answers = new Map<string, ViesResult>();
  const asked: string[] = [];
  const vies: ViesClient = {
    async check(nif) {
      asked.push(nif);
      return answers.get(nif) ?? { status: 'invalid' };
    },
  };
  beforeAll(async () => {
    t = await createTestApp({ [VIES]: vies });
  });
  afterAll(async () => {
    await t.pool.end();
    await t.app.close();
  });
  beforeEach(async () => {
    await resetDb(t);
    answers.clear();
    asked.length = 0;
  });

  const create = (body: Record<string, unknown>, cookie: { Cookie: string }) => t.http().post('/orgs').set(cookie).send(body);

  it('NIF confirmado e nome parecido: fica com NIF verificado, nome oficial como alias e proveniência', async () => {
    answers.set('500697256', { status: 'valid', name: 'EDP - ENERGIAS DE PORTUGAL, S.A.', address: 'AV 24 DE JULHO 12, LISBOA' });
    const res = await create({ name: 'EDP Energias de Portugal', type: 'PME', city: 'Lisboa', nif: '500697256' }, await t.login('ana')).expect(201);
    expect(res.body.nifCheck).toEqual({ status: 'confirmed', officialName: 'EDP - ENERGIAS DE PORTUGAL, S.A.' });
    const o = await t.pool.query('SELECT nif_verified, status FROM organizations WHERE id = $1', [res.body.id]);
    expect(o.rows[0]).toEqual({ nif_verified: true, status: 'pending' });
    const a = await t.pool.query('SELECT alias FROM org_aliases WHERE org_id = $1', [res.body.id]);
    expect(a.rows).toEqual([{ alias: 'EDP - ENERGIAS DE PORTUGAL, S.A.' }]);
    const s = await t.pool.query(`SELECT field, source, license FROM org_sources WHERE org_id = $1 AND source = 'vies'`, [res.body.id]);
    expect(s.rows).toEqual([{ field: 'nif,official_name', source: 'vies', license: 'Comissão Europeia (VIES), reutilização autorizada' }]);
  });

  it('com o NIF confirmado, a primeira avaliação ativa a organização (regra existente)', async () => {
    answers.set('500697256', { status: 'valid', name: 'EDP, S.A.', address: null });
    const res = await create({ name: 'EDP', type: 'PME', city: 'Lisboa', nif: '500697256' }, await t.login('ana')).expect(201);
    const r = await t.http().post(`/orgs/${res.body.id}/reviews`).set(await t.login('ana')).send(goodReview).expect(201);
    expect(r.body.orgStatus).toBe('active');
  });

  it('NIF existe mas o nome não bate certo: não verifica e devolve o nome oficial para a pessoa confirmar', async () => {
    answers.set('500697256', { status: 'valid', name: 'EDP, S.A.', address: null });
    const res = await create({ name: 'Padaria Ribeira', type: 'PME', city: 'Porto', nif: '500697256' }, await t.login('ana')).expect(201);
    expect(res.body.nifCheck).toEqual({ status: 'name_mismatch', officialName: 'EDP, S.A.' });
    const o = await t.pool.query('SELECT nif_verified FROM organizations WHERE id = $1', [res.body.id]);
    expect(o.rows[0].nif_verified).toBe(false);
  });

  it('NIF fora do VIES (ex.: associação sem IVA) ou VIES em baixo: cria na mesma, por verificar', async () => {
    const a = await create({ name: 'Associação Mãos Dadas', type: 'Associação', city: 'Braga', nif: '513000003' }, await t.login('ana')).expect(201);
    expect(a.body.nifCheck).toEqual({ status: 'not_found' });
    answers.set('500697256', { status: 'unavailable' });
    const b = await create({ name: 'EDP', type: 'PME', city: 'Lisboa', nif: '500697256' }, await t.login('rui')).expect(201);
    expect(b.body.nifCheck).toEqual({ status: 'unavailable' });
  });

  it('NIF de pessoa (nome individual): nunca guarda nem devolve o nome da pessoa', async () => {
    answers.set('200000004', { status: 'valid', name: 'MARIA DA SILVA SANTOS', address: 'RUA X, PORTO' });
    const res = await create({ name: 'Maria Costura', type: 'Nome individual', city: 'Porto', nif: '200000004' }, await t.login('ana')).expect(201);
    expect(res.body.nifCheck).toEqual({ status: 'exists' });
    expect(JSON.stringify(res.body)).not.toContain('MARIA DA SILVA');
    const a = await t.pool.query('SELECT count(*)::int AS n FROM org_aliases');
    expect(a.rows[0].n).toBe(0);
  });

  it('sem NIF não pergunta ao VIES', async () => {
    const res = await create({ name: 'Grupo Coral', type: 'Associação', city: 'Porto' }, await t.login('ana')).expect(201);
    expect(res.body.nifCheck).toBeUndefined();
    expect(asked).toEqual([]);
  });

  describe('GET /orgs/nif/:nif — preencher o formulário a partir do NIF', () => {
    it('devolve o nome e a morada oficiais (organizações)', async () => {
      answers.set('500697256', { status: 'valid', name: 'EDP, S.A.', address: 'AV 24 DE JULHO 12, LISBOA' });
      const res = await t.http().get('/orgs/nif/PT 500 697 256').set(await t.login('ana')).expect(200);
      expect(res.body).toEqual({ nif: '500697256', status: 'valid', name: 'EDP, S.A.', address: 'AV 24 DE JULHO 12, LISBOA', kind: 'coletiva' });
    });

    it('para NIF de pessoa só diz se existe', async () => {
      answers.set('200000004', { status: 'valid', name: 'MARIA DA SILVA SANTOS', address: 'RUA X' });
      const res = await t.http().get('/orgs/nif/200000004').set(await t.login('ana')).expect(200);
      expect(res.body).toEqual({ nif: '200000004', status: 'valid', name: null, address: null, kind: 'singular' });
    });

    it('precisa de sessão (401) e de um NIF válido (400)', async () => {
      expect((await t.http().get('/orgs/nif/500697256')).status).toBe(401);
      expect((await t.http().get('/orgs/nif/123').set(await t.login('ana'))).status).toBe(400);
    });
  });
});
