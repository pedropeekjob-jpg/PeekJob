import { createTestApp, insertOrg, resetDb, TestCtx } from '../helpers';

const interview = { role: 'Balcão', positive: false, offer: false, steps: ['Conversa'], text: 'Ficaram de responder e nunca responderam.' };

/** Entrevistas também se denunciam e moderam como as avaliações (DSA: notificação, decisão explicada e contestação) */
describe('Denunciar e moderar entrevistas', () => {
  let t: TestCtx;
  let orgId: string;
  let interviewId: string;
  let author: { Cookie: string };
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
    mod = await t.login('moderadora', 'moderator');
    interviewId = (await t.http().post(`/orgs/${orgId}/interviews`).set(author).send(interview).expect(201)).body.interview.id;
  });

  const report = (who?: { Cookie: string }) => {
    const r = t.http().post(`/interviews/${interviewId}/reports`);
    return (who ? r.set(who) : r).send({ reason: 'falso', details: 'Não é verdade.' });
  };
  const decide = (action: 'remove' | 'keep') =>
    t.http().post(`/moderation/interviews/${interviewId}/decision`).set(mod).send({ action, note: 'Analisámos o texto e as regras.' });
  const messages = async (who: { Cookie: string }) => (await t.http().get('/me/messages').set(who).expect(200)).body.items as Record<string, any>[];
  const listed = async () => (await t.http().get(`/orgs/${orgId}/interviews`)).body.items.length;

  it('denunciar: com ou sem conta; inexistente → 404; a mesma pessoa só uma vez', async () => {
    expect((await report()).status).toBe(201);
    const reader = await t.login('leitor');
    expect((await report(reader)).status).toBe(201);
    expect((await report(reader)).status).toBe(409);
    expect((await t.http().post('/interviews/00000000-0000-0000-0000-000000000000/reports').send({ reason: 'falso' })).status).toBe(404);
    expect((await t.http().post('/interviews/xyz/reports').send({ reason: 'falso' })).status).toBe(404);
  });

  it('na fila aparece como entrevista, com a função e o texto', async () => {
    await report().expect(201);
    const items = (await t.http().get('/moderation/reports').set(mod).expect(200)).body.items;
    expect(items).toEqual([expect.objectContaining({ kind: 'interview', contentId: interviewId, role: 'Balcão', text: interview.text, orgName: 'Padaria Ribeira', count: 1 })]);
  });

  it('remover: sai da página; quem escreveu recebe a explicação (como entrevista) e pode contestar; reverter repõe', async () => {
    const reader = await t.login('leitor');
    await report(reader).expect(201);
    expect((await decide('remove')).status).toBe(200);
    expect(await listed()).toBe(0);
    expect((await t.http().get('/moderation/reports').set(mod)).body.items).toEqual([]);

    const notice = (await messages(author)).find((m) => m.type === 'moderation')!;
    expect(notice.details).toMatchObject({ decision: 'removed', kind: 'interview', orgName: 'Padaria Ribeira' });
    expect((await messages(reader)).find((m) => m.type === 'moderation')!.details).toMatchObject({ decision: 'upheld', kind: 'interview' });

    await t.http().post(`/me/messages/${notice.id}/appeal`).set(author).send({ text: 'É mesmo verdade, candidatei-me em maio.' }).expect(201);
    const queue = (await t.http().get('/moderation/appeals').set(mod).expect(200)).body.items;
    expect(queue[0]).toMatchObject({ side: 'author', content: { kind: 'interview', id: interviewId, text: interview.text, role: 'Balcão', status: 'removed' } });
    await t.http().post(`/moderation/appeals/${queue[0].id}/decision`).set(mod).send({ action: 'reverse', note: 'Revisto por outra pessoa da equipa.' }).expect(200);
    expect(await listed()).toBe(1);
  });

  it('manter: fica publicada; quem denunciou contesta e a moderação reverte → é removida e quem escreveu é avisado', async () => {
    const reader = await t.login('leitor');
    await report(reader).expect(201);
    await decide('keep').expect(200);
    expect(await listed()).toBe(1);
    const notice = (await messages(reader)).find((m) => m.type === 'moderation')!;
    await t.http().post(`/me/messages/${notice.id}/appeal`).set(reader).send({ text: 'Tem informação falsa sobre o processo.' }).expect(201);
    const [a] = (await t.http().get('/moderation/appeals').set(mod)).body.items;
    await t.http().post(`/moderation/appeals/${a.id}/decision`).set(mod).send({ action: 'reverse', note: 'Afinal viola as regras.' }).expect(200);
    expect(await listed()).toBe(0);
    expect((await messages(author)).find((m) => m.details?.decision === 'removed')!.details.kind).toBe('interview');
  });

  it('decidir exige moderação; entrevista inexistente → 404', async () => {
    expect((await t.http().post(`/moderation/interviews/${interviewId}/decision`).set(author).send({ action: 'remove', note: 'Porque sim e mais nada.' })).status).toBe(403);
    expect((await t.http().post('/moderation/interviews/00000000-0000-0000-0000-000000000000/decision').set(mod).send({ action: 'remove', note: 'Porque sim e mais nada.' })).status).toBe(404);
  });
});
