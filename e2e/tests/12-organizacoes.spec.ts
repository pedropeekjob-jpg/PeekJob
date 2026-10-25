import { expect, lastMail, login, makeModerator, sql, test, uniqueEmail } from '../support/fixtures';

/** Contas das organizações: pedir para gerir a página, a moderação aprova, responder em público */
test('reivindicar a página, aprovação da moderação e resposta pública', async ({ page, browser }, info) => {
  const stamp = `${info.project.name} ${Date.now()}`;
  // organização própria deste teste (cada projeto e cada corrida tem a sua)
  const name = `Clínica Mar ${Date.now() % 1_000_000}`;
  const [org] = await sql<{ id: string }>(`INSERT INTO organizations (name, type, city, status, source) VALUES ($1, 'Empresa', 'Porto', 'active', 'seed') RETURNING id`, [name]);
  const text = `Escalas mudadas na véspera (${stamp}).`;
  await sql(`INSERT INTO reviews (org_id, author_ref, scores, avg, recommend, tags, text) VALUES ($1, $2, '{"equilibrio": 2}', 2, false, '{}', $3)`, [org.id, `e2e-${Date.now()}`, text]);

  // 1) quem representa a clínica pede a gestão da página (a partir da página pública)
  await login(page, uniqueEmail('gerente'));
  await page.goto(`/org/${org.id}`);
  await page.getByRole('link', { name: 'É a tua organização? Gerir esta página' }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'Gerir a página da tua organização' })).toBeVisible();
  await expect(page.getByRole('button', { name: new RegExp(name) })).toHaveAttribute('aria-pressed', 'true');
  const work = `direcao.${Date.now()}@clinicafoz.pt`;
  await page.getByLabel('O teu nome').fill('Teresa Foz');
  await page.getByLabel('Cargo').fill('Diretora');
  await page.getByLabel('Email de trabalho').fill(work);
  await page.getByRole('button', { name: 'Receber código' }).click();
  await expect(page.getByLabel('Código que recebeste por email')).toBeVisible();
  const code = (await lastMail(work)).match(/\b(\d{6})\b/)![1];
  await page.getByLabel('Código que recebeste por email').fill(code);
  await page.getByRole('button', { name: 'Confirmar e enviar pedido' }).click();
  await expect(page.getByText('Pedido enviado.')).toBeVisible();

  // 2) a moderação aprova
  const ctx = await browser.newContext({ viewport: info.project.use.viewport ?? undefined });
  const mod = await ctx.newPage();
  const email = uniqueEmail('moderadora');
  await login(mod, email);
  await makeModerator(email);
  await mod.goto('/moderacao');
  await mod.getByRole('tab', { name: /Páginas de organizações/ }).click();
  const card = mod.locator('article').filter({ hasText: 'Teresa Foz' }).first();
  await card.getByRole('button', { name: /Domínio do email confirmado/ }).click();
  await card.getByRole('button', { name: 'Aprovar' }).click();
  await expect(mod.getByText(/Pedido aprovado/)).toBeVisible();
  await ctx.close();

  // 3) o painel abre com dados reais; responder à avaliação
  await page.goto('/painel');
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
  const review = page.locator('article').filter({ hasText: text });
  await review.getByRole('button', { name: 'Responder' }).click();
  await review.getByRole('textbox').fill('Obrigado. Já fixámos as escalas com duas semanas de antecedência.');
  await review.getByRole('button', { name: 'Publicar resposta' }).click();
  await expect(review.getByText('A tua resposta · publicada')).toBeVisible();

  // 4) na página pública: gerida pela organização e a resposta por baixo da avaliação
  await page.goto(`/org/${org.id}`);
  await expect(page.getByText('Página gerida pela organização').first()).toBeVisible();
  await expect(page.getByText('Obrigado. Já fixámos as escalas com duas semanas de antecedência.').first()).toBeAttached();

  // 5) relatórios: sem o Pro explicam o que trazem; com o Pro abrem com os dados reais
  await page.goto('/painel');
  await page.getByRole('link', { name: 'Relatório semanal' }).click();
  await expect(page.getByRole('heading', { name: 'Os relatórios fazem parte do plano Pro' })).toBeVisible();
  await sql(`UPDATE organizations SET plan = 'pro' WHERE id = $1`, [org.id]);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: new RegExp(`Relatório semanal · ${name}`) })).toBeVisible();
  await expect(page.getByRole('rowheader', { name: 'Equilíbrio' })).toBeVisible();
  await page.getByRole('link', { name: 'Mensal' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /Relatório mensal/ })).toBeVisible();
});
