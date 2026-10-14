import { createTestApp, goodReview, insertOrg, resetDb, TestCtx } from '../helpers';

/**
 * Contestar decisões de moderação (Regulamento dos Serviços Digitais, art. 20.º):
 * quem foi afetado por uma decisão pode pedir que seja revista, por escrito, durante 6 meses.
 */
describe('Contestar decisões de moderação', () => {
  let t: TestCtx;
  let orgId: string;
  let reviewId: string;
  let author: { Cookie: string };
  let reporter: { Cookie: string };
  let mod: { Cookie: string };

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.pool.end();
    await t.app.close();
  });
  beforeEach(async () => {
    await resetDb(t);
    orgId = await insertOrg(t.pool, { name: 'Padaria Ribeira' });
    author = await t.login('autora');
    reporter = await t.login('denunciante');
    mod = await t.login('moderadora', 'moderator');
    reviewId = (await t.http().post(`/orgs/${orgId}/reviews`).set(author).send(goodReview).expect(201)).body.review.id;
    await t.http().post(`/reviews/${reviewId}/reports`).set(reporter).send({ reason: 'falso', details: 'Não é verdade.' }).expect(201);
  });

  const decide = (action: 'remove' | 'keep') =>
    t.http().post(`/moderation/reviews/${reviewId}/decision`).set(mod).send({ action, note: 'Analisámos o texto e as regras.' }).expect(200);
  const messages = async (who: { Cookie: string }) => (await t.http().get('/me/messages').set(who).expect(200)).body.items as Record<string, any>[];
  /** O aviso da decisão original (as respostas aos pedidos são mensagens à parte) */
  const notice = async (who: { Cookie: string }) => (await messages(who)).find((m) => m.type === 'moderation' && !String(m.details?.decision).startsWith('appeal_'))!;
  const appeal = (who: { Cookie: string }, id: string, text = 'A avaliação é verdadeira, trabalhei lá dois anos.') =>
    t.http().post(`/me/messages/${id}/appeal`).set(who).send({ text });
  const reviewStatus = async () => (await t.pool.query('SELECT status FROM reviews WHERE id = $1', [reviewId])).rows[0].status;
  const decideAppeal = (id: string, action: 'reverse' | 'confirm', who = mod) =>
    t.http().post(`/moderation/appeals/${id}/decision`).set(who).send({ action, note: 'Revisto por outra pessoa da equipa.' });

  it('o aviso da decisão diz que se pode contestar (e até quando)', async () => {
    await decide('remove');
    const n = await notice(author);
    expect(n.appeal).toEqual({ status: 'available', until: expect.any(String) });
    const days = (new Date(n.appeal.until).getTime() - Date.now()) / 86400000;
    expect(days).toBeGreaterThan(179);
  });

  it('quem escreveu contesta a remoção; a moderação reverte: a avaliação volta e a pessoa é avisada', async () => {
    await decide('remove');
    expect(await reviewStatus()).toBe('removed');
    const n = await notice(author);
    await appeal(author, n.id).expect(201);
    expect((await notice(author)).appeal).toMatchObject({ status: 'open' });

    const queue = (await t.http().get('/moderation/appeals').set(mod).expect(200)).body.items;
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({ side: 'author', originalDecision: 'removed', text: expect.stringContaining('trabalhei lá'), review: { text: goodReview.text } });
    expect(JSON.stringify(queue)).not.toMatch(/autora|_ref/);

    await decideAppeal(queue[0].id, 'reverse').expect(200);
    expect(await reviewStatus()).toBe('published');
    const all = await messages(author);
    expect(all.find((m) => m.details?.decision === 'appeal_reversed')).toMatchObject({ details: { note: 'Revisto por outra pessoa da equipa.' } });
    expect((await notice(author)).appeal).toMatchObject({ status: 'reversed' });
    expect((await t.http().get('/moderation/summary').set(mod)).body.openAppeals).toBe(0);
  });

  it('quem denunciou contesta o "manter"; reverter remove a avaliação e avisa quem a escreveu', async () => {
    await decide('keep');
    const n = (await messages(reporter)).find((m) => m.details?.decision === 'rejected')!;
    await appeal(reporter, n.id, 'O texto diz o nome da gerente na terceira linha.').expect(201);
    const [a] = (await t.http().get('/moderation/appeals').set(mod)).body.items;
    expect(a).toMatchObject({ side: 'reporter', originalDecision: 'rejected' });
    await decideAppeal(a.id, 'reverse').expect(200);
    expect(await reviewStatus()).toBe('removed');
    // quem escreveu recebe a decisão nova (e pode contestá-la)
    const toAuthor = (await messages(author)).find((m) => m.details?.decision === 'removed')!;
    expect(toAuthor.appeal.status).toBe('available');
  });

  it('confirmar mantém tudo e explica', async () => {
    await decide('remove');
    await appeal(author, (await notice(author)).id).expect(201);
    const [a] = (await t.http().get('/moderation/appeals').set(mod)).body.items;
    await decideAppeal(a.id, 'confirm').expect(200);
    expect(await reviewStatus()).toBe('removed');
    expect((await messages(author)).some((m) => m.details?.decision === 'appeal_confirmed')).toBe(true);
    expect((await decideAppeal(a.id, 'reverse')).status).toBe(409); // já decidido
  });

  it('só uma vez por decisão, só a própria pessoa, texto entre 10 e 2000 caracteres', async () => {
    await decide('remove');
    const n = await notice(author);
    expect((await appeal(reporter, n.id)).status).toBe(404);
    expect((await appeal(author, n.id, 'curto')).status).toBe(400);
    expect((await appeal(author, n.id, 'x'.repeat(2001))).status).toBe(400);
    await appeal(author, n.id).expect(201);
    expect((await appeal(author, n.id)).status).toBe(409);
    expect((await t.http().post(`/me/messages/${n.id}/appeal`).send({ text: 'sem sessão nenhuma aqui' })).status).toBe(401);
  });

  it('depois de 6 meses já não se pode contestar', async () => {
    await decide('remove');
    const n = await notice(author);
    await t.pool.query(`UPDATE support_messages SET created_at = now() - interval '181 days' WHERE id = $1`, [n.id]);
    expect((await notice(author)).appeal).toEqual({ status: 'expired' });
    expect((await appeal(author, n.id)).status).toBe(409);
  });

  it('mensagens de apoio e respostas a recursos não se contestam', async () => {
    await decide('remove');
    await appeal(author, (await notice(author)).id).expect(201);
    const [a] = (await t.http().get('/moderation/appeals').set(mod)).body.items;
    await decideAppeal(a.id, 'confirm').expect(200);
    const answer = (await messages(author)).find((m) => m.details?.decision === 'appeal_confirmed')!;
    expect(answer.appeal).toBeNull();
    expect((await appeal(author, answer.id)).status).toBe(409);
  });

  it('a fila de recursos é só para moderadores; a decisão exige justificação', async () => {
    expect((await t.http().get('/moderation/appeals').set(author)).status).toBe(403);
    await decide('remove');
    await appeal(author, (await notice(author)).id).expect(201);
    const [a] = (await t.http().get('/moderation/appeals').set(mod)).body.items;
    expect((await t.http().post(`/moderation/appeals/${a.id}/decision`).set(mod).send({ action: 'reverse', note: 'curta' })).status).toBe(400);
    expect((await decideAppeal(a.id, 'reverse', author)).status).toBe(403);
  });

  it('RGPD: exportar inclui os recursos; apagar a conta apaga-os', async () => {
    await decide('remove');
    await appeal(author, (await notice(author)).id).expect(201);
    const data = JSON.parse((await t.http().get('/me/export').set(author).expect(200)).text);
    expect(data.appeals).toEqual([expect.objectContaining({ status: 'open', text: expect.stringContaining('trabalhei lá') })]);
    await t.http().delete('/me').set(author).send({}).expect(204);
    expect((await t.pool.query('SELECT count(*)::int AS n FROM appeals')).rows[0].n).toBe(0);
  });
});
