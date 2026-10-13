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

test('quem não é moderador não vê a moderação', async ({ page }) => {
  await login(page, uniqueEmail('curioso'));
  await page.goto('/moderacao');
  await expect(page.getByText(/só para moderadores/)).toBeVisible();
});
