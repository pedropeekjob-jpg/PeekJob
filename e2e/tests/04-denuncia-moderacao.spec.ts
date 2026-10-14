import { expect, login, makeModerator, sql, test, uniqueEmail } from '../support/fixtures';

/** Regulamento dos Serviços Digitais: qualquer pessoa denuncia, a moderação decide e explica */
test('denúncia sem conta e decisão da moderação', async ({ page, browser }, info) => {
  // avaliação própria deste teste (cada projeto tem a sua)
  const text = `Chefia ausente e escalas mudadas sem aviso (${info.project.name}).`;
  const [org] = await sql<{ id: string }>(`SELECT id FROM organizations WHERE name = 'Clínica Foz'`);
  const [rev] = await sql<{ id: string }>(
    `INSERT INTO reviews (org_id, author_ref, scores, avg, recommend, tags, text) VALUES ($1, $2, '{"lideranca": 2}', 2, false, '{}', $3) RETURNING id`,
    [org.id, `e2e-${Date.now()}`, text],
  );

  // 1) alguém sem conta denuncia
  await page.goto(`/org/${org.id}/denunciar/${rev.id}`);
  await page.getByRole('radio', { name: /Insulto/ }).click();
  await page.getByRole('button', { name: /Enviar denúncia/ }).click();
  await expect(page.getByText(/Recebemos a tua denúncia/)).toBeVisible();

  // 2) a moderadora remove, com justificação
  const ctx = await browser.newContext({ viewport: info.project.use.viewport ?? undefined });
  const mod = await ctx.newPage();
  const email = uniqueEmail('moderadora');
  await login(mod, email);
  await makeModerator(email);
  await mod.goto('/moderacao');
  const card = mod.locator('article, section, li').filter({ hasText: text }).first();
  await expect(card).toBeVisible();
  await card.getByPlaceholder(/Ou escreve a justificação/).fill('Remoção de teste: linguagem que não descreve situações.');
  await card.getByRole('button', { name: 'Remover avaliação' }).click();
  await expect(mod.getByText(/Avaliação removida/)).toBeVisible();
  await ctx.close();

  const [r] = await sql<{ status: string }>(`SELECT status FROM reviews WHERE id = $1`, [rev.id]);
  expect(r.status).toBe('removed');
});

test('entrevistas também se denunciam e moderam', async ({ page, browser }, info) => {
  const text = `Nunca chegaram a responder (${info.project.name} ${Date.now()}).`;
  const [org] = await sql<{ id: string }>(`SELECT id FROM organizations WHERE name = 'Clínica Foz'`);
  const [iv] = await sql<{ id: string }>(
    `INSERT INTO interviews (org_id, author_ref, role, positive, offer, answered, steps, text) VALUES ($1, $2, 'Receção', false, false, false, '{Conversa}', $3) RETURNING id`,
    [org.id, `e2e-${Date.now()}`, text],
  );
  await page.goto(`/org/${org.id}/entrevistas`);
  await page.locator(`a[href$="/denunciar/${iv.id}"]`).first().click();
  await page.getByRole('radio', { name: /Parece falsa/ }).click();
  await page.getByRole('button', { name: /Enviar denúncia/ }).click();
  await expect(page.getByText(/Recebemos a tua denúncia/)).toBeVisible();

  const ctx = await browser.newContext({ viewport: info.project.use.viewport ?? undefined });
  const mod = await ctx.newPage();
  const email = uniqueEmail('moderadora');
  await login(mod, email);
  await makeModerator(email);
  await mod.goto('/moderacao');
  const card = mod.locator('article').filter({ hasText: text }).first();
  await expect(card.getByText('Entrevista · Receção')).toBeVisible();
  await card.getByPlaceholder(/Ou escreve a justificação/).fill('Remoção de teste: não descreve o processo.');
  await card.getByRole('button', { name: 'Remover entrevista' }).click();
  await expect(mod.getByText(/Entrevista removida/)).toBeVisible();
  await ctx.close();
  const [r] = await sql<{ status: string }>(`SELECT status FROM interviews WHERE id = $1`, [iv.id]);
  expect(r.status).toBe('removed');
});

test('quem não é moderador não vê a moderação', async ({ page }) => {
  await login(page, uniqueEmail('curioso'));
  await page.goto('/moderacao');
  await expect(page.getByText(/só para moderadores/)).toBeVisible();
});

/** DSA art. 20.º: quem escreveu contesta a remoção; outra pessoa da moderação revê e reverte */
test('contestar uma remoção: pedido no aviso, revisão na moderação, a avaliação volta', async ({ page, browser }, info) => {
  const text = `Turnos trocados no próprio dia, sem aviso (${info.project.name} ${Date.now()}).`;
  const [org] = await sql<{ id: string }>(`SELECT id FROM organizations WHERE name = 'Clínica Foz'`);
  await login(page, uniqueEmail('autora'));
  const created = await page.request.post(`/orgs/${org.id}/reviews`, { data: { scores: { lideranca: 2 }, recommend: false, tags: [], text } });
  expect(created.status()).toBe(201);
  const reviewId = (await created.json()).review.id as string;
  expect((await page.request.post(`/reviews/${reviewId}/reports`, { headers: { cookie: '' }, data: { reason: 'falso' } })).status()).toBe(201);

  const ctx = await browser.newContext({ viewport: info.project.use.viewport ?? undefined });
  const mod = await ctx.newPage();
  const email = uniqueEmail('moderadora');
  await login(mod, email);
  await makeModerator(email);
  await mod.goto('/moderacao');
  const card = mod.locator('article').filter({ hasText: text }).first();
  await card.getByPlaceholder(/Ou escreve a justificação/).fill('Remoção de teste: parece não descrever factos.');
  await card.getByRole('button', { name: 'Remover avaliação' }).click();
  await expect(mod.getByText(/Avaliação removida/)).toBeVisible();

  // quem escreveu vê o aviso e pede a revisão
  await page.goto('/apoio');
  const notice = page.locator('.card').filter({ hasText: 'A tua avaliação de Clínica Foz foi removida.' }).first();
  await notice.getByRole('button', { name: 'Contestar esta decisão' }).click();
  await notice.getByRole('textbox', { name: 'Porque deve ser revista?' }).fill('Aconteceu mesmo: tenho as escalas guardadas.');
  await notice.getByRole('button', { name: 'Pedir revisão' }).click();
  await expect(notice.getByRole('status')).toHaveText(/Pedido de revisão enviado/);

  // a moderação revê e reverte
  await mod.goto('/moderacao');
  await mod.getByRole('tab', { name: /Pedidos de revisão/ }).click();
  const appeal = mod.locator('article').filter({ hasText: text }).first();
  await expect(appeal.getByText(/tenho as escalas guardadas/)).toBeVisible();
  await appeal.getByRole('textbox').fill('Revisto: descreve factos do trabalho.');
  await appeal.getByRole('button', { name: 'Reverter a decisão' }).click();
  await expect(mod.getByText(/Decisão revertida/)).toBeVisible();
  await ctx.close();

  const [r] = await sql<{ status: string }>(`SELECT status FROM reviews WHERE id = $1`, [reviewId]);
  expect(r.status).toBe('published');
  await page.goto('/apoio');
  await expect(page.getByText('Revimos a tua contestação sobre Clínica Foz: a decisão foi revertida.')).toBeVisible();
});
