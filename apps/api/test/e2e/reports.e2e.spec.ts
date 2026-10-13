import { createTestApp, goodReview, insertOrg, resetDb, TestCtx } from '../helpers';

/**
 * Denúncias (Regulamento dos Serviços Digitais: mecanismo de notificação e ação).
 * Qualquer pessoa pode denunciar uma avaliação, com ou sem conta. A moderação decide e explica.
 */
describe('Denúncias e moderação', () => {
  let t: TestCtx;
  let orgId: string;
  let reviewId: string;
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
    const res = await t.http().post(`/orgs/${orgId}/reviews`).set(await t.login('autora')).send(goodReview).expect(201);
    reviewId = res.body.review.id;
    mod = await t.login('mod', 'moderator');
  });

  const report = (body: Record<string, unknown>, headers: Record<string, string> = {}) =>
    t.http().post(`/reviews/${reviewId}/reports`).set(headers).send(body);
  const decide = (body: Record<string, unknown>) => t.http().post(`/moderation/reviews/${reviewId}/decision`).set(mod).send(body);

  describe('denunciar', () => {
    it('qualquer pessoa pode denunciar, sem conta (201 com referência)', async () => {
      const res = await report({ reason: 'nome', details: 'Diz o nome da gerente.' }).expect(201);
      expect(res.body.reference).toMatch(/^[A-Z0-9]{8}$/);
      const { rows } = await t.pool.query('SELECT reason, details, status, reporter_ref FROM reports');
      expect(rows).toEqual([{ reason: 'nome', details: 'Diz o nome da gerente.', status: 'open', reporter_ref: null }]);
    });

    it('valida o motivo e o tamanho do texto (400)', async () => {
      await report({ reason: 'porque-sim' }).expect(400);
      await report({ reason: 'outro', details: 'x'.repeat(1001) }).expect(400);
      await report({ reason: 'outro', contactEmail: 'não-é-email' }).expect(400);
    });

    it('avaliação inexistente ou removida: 404', async () => {
      await t.http().post('/reviews/00000000-0000-0000-0000-000000000000/reports').send({ reason: 'ofensa' }).expect(404);
      await t.pool.query(`UPDATE reviews SET status = 'removed' WHERE id = $1`, [reviewId]);
      await report({ reason: 'ofensa' }).expect(404);
    });

    it('com conta, uma denúncia em aberto por pessoa e avaliação (409)', async () => {
      const me = await t.login('leitor');
      await report({ reason: 'falso' }, me).expect(201);
      await report({ reason: 'ofensa' }, me).expect(409);
    });

    it('limita abusos: no máximo 10 denúncias por dia a partir do mesmo sítio (429)', async () => {
      for (let i = 0; i < 10; i++) await report({ reason: 'outro' }).expect(201);
      await report({ reason: 'outro' }).expect(429);
      const { rows } = await t.pool.query('SELECT reporter_ip_hash FROM reports LIMIT 1');
      expect(rows[0].reporter_ip_hash).toMatch(/^[a-f0-9]{64}$/); // nunca o IP em claro
    });

    it('denunciar não esconde a avaliação sozinho: só a moderação decide', async () => {
      await report({ reason: 'ofensa' }).expect(201);
      const list = await t.http().get(`/orgs/${orgId}/reviews`).expect(200);
      expect(list.body.items).toHaveLength(1);
    });
  });

  describe('fila de moderação', () => {
    it('só moderadores (401 sem sessão, 403 sem papel)', async () => {
      await t.http().get('/moderation/reports').expect(401);
      await t.http().get('/moderation/reports').set(await t.login('curioso')).expect(403);
    });

    it('agrupa as denúncias em aberto por avaliação, com o texto e a organização', async () => {
      await report({ reason: 'nome', details: 'Nome da gerente' }).expect(201);
      await report({ reason: 'ofensa' }, await t.login('leitor')).expect(201);
      const res = await t.http().get('/moderation/reports').set(mod).expect(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toMatchObject({
        reviewId,
        orgName: 'Padaria Ribeira',
        text: goodReview.text,
        count: 2,
      });
      expect(res.body.items[0].reports.map((r: { reason: string }) => r.reason).sort()).toEqual(['nome', 'ofensa']);
      expect(JSON.stringify(res.body)).not.toMatch(/reporter_ref|reporterRef|ip_hash|author_ref/);
    });
  });

  describe('decisão', () => {
    it('remover: a avaliação sai do site, a autora recebe a explicação e quem denunciou com conta recebe a decisão', async () => {
      await report({ reason: 'nome' }, await t.login('leitor')).expect(201);
      await report({ reason: 'nome' }).expect(201);
      await decide({ action: 'remove', note: 'Identifica uma pessoa pelo nome.' }).expect(200);

      const list = await t.http().get(`/orgs/${orgId}/reviews`).expect(200);
      expect(list.body.items).toHaveLength(0);
      const { rows } = await t.pool.query(`SELECT status FROM reports`);
      expect(rows.every((r) => r.status === 'upheld')).toBe(true);

      const author = await t.http().get('/me/messages').set(await t.login('autora')).expect(200);
      const notice = author.body.items.find((m: { type: string }) => m.type === 'moderation');
      expect(notice).toMatchObject({ type: 'moderation', orgName: 'Padaria Ribeira', details: { decision: 'removed', note: 'Identifica uma pessoa pelo nome.' } });

      const reader = await t.http().get('/me/messages').set(await t.login('leitor')).expect(200);
      expect(reader.body.items[0]).toMatchObject({ type: 'moderation', details: { decision: 'upheld' } });
    });

    it('manter: a avaliação fica e as denúncias são fechadas como rejeitadas', async () => {
      await report({ reason: 'falso' }).expect(201);
      await decide({ action: 'keep', note: 'Não viola as regras: é uma crítica ao trabalho.' }).expect(200);
      const list = await t.http().get(`/orgs/${orgId}/reviews`).expect(200);
      expect(list.body.items).toHaveLength(1);
      const { rows } = await t.pool.query(`SELECT status FROM reports`);
      expect(rows).toEqual([{ status: 'rejected' }]);
    });

    it('quem deixou email sem conta recebe a decisão por email, e o contacto é apagado a seguir', async () => {
      await report({ reason: 'privado', contactName: 'Rita', contactEmail: 'rita@exemplo.pt' }).expect(201);
      await decide({ action: 'remove', note: 'Contém dados privados.' }).expect(200);
      const mail = t.mailer.outbox.at(-1)!;
      expect(mail.to).toBe('rita@exemplo.pt');
      expect(mail.subject).toMatch(/denúncia/i);
      expect(mail.text).toContain('Contém dados privados.');
      const { rows } = await t.pool.query('SELECT contact_name, contact_email FROM reports');
      expect(rows).toEqual([{ contact_name: null, contact_email: null }]);
    });

    it('exige uma justificação (400) e só moderadores (403)', async () => {
      await report({ reason: 'ofensa' }).expect(201);
      await decide({ action: 'remove', note: '' }).expect(400);
      await t.http().post(`/moderation/reviews/${reviewId}/decision`).set(await t.login('leitor')).send({ action: 'remove', note: 'Porque sim e mais nada.' }).expect(403);
    });
  });
});
