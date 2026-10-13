import { findPersonalAttacks } from '@peekjob/shared';
import { REWRITER, type Rewriter } from '../../src/rewrite/rewriter';
import { createTestApp, insertOrg, resetDb, TestCtx } from '../helpers';

/**
 * Reescrever o comentário com IA: a pessoa escreve com raiva, a IA propõe uma versão
 * publicável (sem nomes, sem insultos, com os mesmos factos). A pessoa decide se usa.
 * O texto não é guardado.
 */
describe('POST /reviews/rewrite', () => {
  let t: TestCtx;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.pool.end();
    await t.app.close();
  });
  beforeEach(() => resetDb(t));

  const rewrite = (body: Record<string, unknown>, headers: Record<string, string> = {}) => t.http().post('/reviews/rewrite').set(headers).send(body);

  it('sem chave de IA usa as regras: devolve um texto publicável (200)', async () => {
    const res = await rewrite({ text: 'O Ricardo é um incompetente e grita com todos.', lang: 'pt' }).expect(200);
    expect(res.body.source).toBe('rules');
    expect(res.body.changed).toBe(true);
    expect(findPersonalAttacks(res.body.text).blocked).toBe(false);
  });

  it('o texto proposto é aceite ao publicar (fecha o ciclo do 422)', async () => {
    const orgId = await insertOrg(t.pool, { name: 'Café Central' });
    const angry = 'O Ricardo é um idiota, grita com a equipa.';
    const blocked = await t.http().post(`/orgs/${orgId}/reviews`).set(await t.login('ana')).send({ scores: { respeito: 1 }, recommend: false, tags: [], text: angry }).expect(422);
    expect(blocked.body.rewriteAvailable).toBe(true);
    const { body } = await rewrite({ text: angry }).expect(200);
    expect((await t.http().post(`/orgs/${orgId}/reviews`).set(await t.login('ana')).send({ scores: { respeito: 1 }, recommend: false, tags: [], text: body.text })).status).toBe(201);
  });

  it('não guarda o texto em lado nenhum', async () => {
    expect((await rewrite({ text: 'O Ricardo é um idiota.' })).status).toBe(200);
    const { rows } = await t.pool.query(`SELECT count(*)::int AS n FROM reviews`);
    expect(rows[0].n).toBe(0);
  });

  it('valida o texto (400): vazio ou acima do limite', async () => {
    expect((await rewrite({ text: '' })).status).toBe(400);
    expect((await rewrite({ text: 'a'.repeat(601) })).status).toBe(400);
  });

  it('limita pedidos por pessoa (429), sem afetar outras', async () => {
    const ana = await t.login('ana');
    for (let i = 0; i < 20; i++) expect((await rewrite({ text: 'Texto número ' + i }, ana)).status).toBe(200);
    expect((await rewrite({ text: 'mais um' }, ana)).status).toBe(429);
    expect((await rewrite({ text: 'outra pessoa' }, await t.login('rui'))).status).toBe(200);
  });

  it('sem conta, o limite conta por endereço (pseudónimo do IP)', async () => {
    for (let i = 0; i < 20; i++) expect((await rewrite({ text: 'Texto número ' + i })).status).toBe(200);
    expect((await rewrite({ text: 'mais um' })).status).toBe(429);
  });
});

describe('POST /reviews/rewrite com IA', () => {
  let t: TestCtx;
  const seen: { text: string; lang: string }[] = [];
  const fake: Rewriter = {
    async rewrite(text, lang) {
      seen.push({ text, lang });
      return { text: lang === 'en' ? 'The manager shouts at the team.' : 'A chefia grita com a equipa.', source: 'ai' };
    },
  };
  beforeAll(async () => {
    t = await createTestApp({ [REWRITER]: fake });
  });
  afterAll(async () => {
    await t.pool.end();
    await t.app.close();
  });

  it('devolve a proposta da IA no idioma pedido', async () => {
    const res = await t.http().post('/reviews/rewrite').send({ text: 'Ricardo is an idiot who shouts.', lang: 'en' }).expect(200);
    expect(res.body).toEqual({ text: 'The manager shouts at the team.', source: 'ai', changed: true });
    expect(seen.at(-1)).toEqual({ text: 'Ricardo is an idiot who shouts.', lang: 'en' });
  });
});
