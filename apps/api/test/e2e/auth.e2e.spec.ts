import { createTestApp, resetDb, sessionCookie, TestCtx } from '../helpers';

describe('Entrar com link mágico', () => {
  let t: TestCtx;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.pool.end();
    await t.app.close();
  });
  beforeEach(() => resetDb(t));

  const askLink = (email: string) => t.http().post('/auth/magic-link').send({ email });
  const verify = (token: string) => t.http().post('/auth/verify').send({ token });

  it('envia um link de acesso por email (202, sem dizer se a conta existe)', async () => {
    const res = await askLink('Pessoa@Gmail.com ').expect(202);
    expect(res.body).toEqual({ sent: true });
    const mail = t.mailer.outbox.at(-1)!;
    expect(mail.to).toBe('pessoa@gmail.com');
    expect(mail.link).toMatch(/#\/entrar\?token=[A-Za-z0-9_-]{40,}/);
  });

  it('envia o email em inglês quando lang=en (o link mantém o idioma)', async () => {
    expect((await t.http().post('/auth/magic-link').send({ email: 'ana@gmail.com', lang: 'en' })).status).toBe(202);
    const mail = t.mailer.outbox.at(-1)!;
    expect(mail.subject).toBe('Your PeekJob sign-in link');
    expect(mail.text).toMatch(/^Hi! Open this link to sign in to PeekJob \(valid for 15 minutes\)/);
    expect(mail.text).toContain("If you didn't ask for this email");
    expect(mail.link).toMatch(/#\/entrar\?token=[A-Za-z0-9_-]{40,}&lang=en$/);
  });

  it('por omissão o email vai em português; idiomas desconhecidos são recusados (400)', async () => {
    expect((await askLink('rui@gmail.com')).status).toBe(202);
    expect(t.mailer.outbox.at(-1)!.subject).toBe('O teu link de acesso à PeekJob');
    expect(t.mailer.outbox.at(-1)!.link).not.toContain('lang=');
    expect((await t.http().post('/auth/magic-link').send({ email: 'rui@gmail.com', lang: 'fr' })).status).toBe(400);
  });

  it('recusa emails inválidos (400)', async () => {
    expect((await askLink('nao-e-email')).status).toBe(400);
  });

  it('limita a 3 pedidos por email a cada 15 minutos (429)', async () => {
    for (let i = 0; i < 3; i++) expect((await askLink('a@teste.pt')).status).toBe(202);
    expect((await askLink('a@teste.pt')).status).toBe(429);
    expect((await askLink('b@teste.pt')).status).toBe(202);
  });

  it('o link abre uma sessão num cookie httpOnly', async () => {
    await askLink('pessoa@gmail.com');
    const res = await verify(t.mailer.lastTokenFor('pessoa@gmail.com')).expect(200);
    expect(res.body.user).toMatchObject({ id: expect.any(String), role: 'user' });
    const raw = ([] as string[]).concat(res.headers['set-cookie']).join(';');
    expect(raw).toMatch(/pj_session=/);
    expect(raw).toMatch(/HttpOnly/i);
    expect(raw).toMatch(/SameSite=Lax/i);

    const me = await t.http().get('/auth/me').set('Cookie', sessionCookie(res.headers['set-cookie'])).expect(200);
    expect(me.body.user.id).toBe(res.body.user.id);
  });

  it('o link só funciona uma vez', async () => {
    await askLink('pessoa@gmail.com');
    const token = t.mailer.lastTokenFor('pessoa@gmail.com');
    expect((await verify(token)).status).toBe(200);
    expect((await verify(token)).status).toBe(401);
  });

  it('o link expira ao fim de 15 minutos', async () => {
    await askLink('pessoa@gmail.com');
    await t.pool.query(`UPDATE login_tokens SET expires_at = now() - interval '1 second'`);
    expect((await verify(t.mailer.lastTokenFor('pessoa@gmail.com'))).status).toBe(401);
  });

  it('o mesmo email volta à mesma conta', async () => {
    await askLink('pessoa@gmail.com');
    const a = await verify(t.mailer.lastTokenFor('pessoa@gmail.com'));
    await askLink('PESSOA@gmail.com');
    const b = await verify(t.mailer.lastTokenFor('pessoa@gmail.com'));
    expect(b.body.user.id).toBe(a.body.user.id);
  });

  it('nunca guarda o email nem os tokens em claro', async () => {
    await askLink('pessoa@gmail.com');
    const token = t.mailer.lastTokenFor('pessoa@gmail.com');
    await verify(token);
    const dump = JSON.stringify([
      (await t.pool.query('SELECT * FROM users')).rows,
      (await t.pool.query('SELECT * FROM login_tokens')).rows,
      (await t.pool.query('SELECT * FROM sessions')).rows,
    ]);
    expect(dump).not.toMatch(/pessoa|@/);
    expect(dump).not.toContain(token);
  });

  it('terminar sessão invalida o cookie', async () => {
    const cookie = await t.login('pessoa');
    expect((await t.http().post('/auth/logout').set(cookie)).status).toBe(204);
    expect((await t.http().get('/auth/me').set(cookie)).status).toBe(401);
  });

  it('sem sessão, as rotas protegidas respondem 401 (os cabeçalhos de desenvolvimento deixaram de contar)', async () => {
    expect((await t.http().get('/auth/me')).status).toBe(401);
    expect((await t.http().get('/me/messages').set('x-user-id', 'u1')).status).toBe(401);
  });
});
