import { readFileSync } from 'node:fs';
import { expect, login, sql, test, uniqueEmail } from '../support/fixtures';

/** RGPD: descarregar os meus dados e apagar a conta */
test('exportar e apagar a conta', async ({ page }) => {
  await login(page, uniqueEmail('rgpd'));
  await page.goto('/perfil/dados');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Descarregar/ }).click()]);
  expect(dl.suggestedFilename()).toMatch(/^peekjob-os-meus-dados-\d{4}-\d{2}-\d{2}\.json$/);
  const data = JSON.parse(readFileSync((await dl.path())!, 'utf8'));
  expect(data).toHaveProperty('reviews');
  expect(JSON.stringify(data)).not.toMatch(/email_hash|author_ref/);

  const before = await sql<{ n: number }>(`SELECT count(*)::int AS n FROM users`);
  await page.getByRole('button', { name: 'Apagar a minha conta' }).click();
  await page.getByRole('button', { name: 'Apagar definitivamente' }).click();
  await expect(page.getByText(/A tua conta foi apagada/)).toBeVisible();
  const after = await sql<{ n: number }>(`SELECT count(*)::int AS n FROM users`);
  expect(after[0].n).toBe(before[0].n - 1);
});

/** RGPD: corrigir e apagar uma avaliação publicada, sem apagar a conta */
test('corrigir o texto e apagar a minha avaliação', async ({ page }) => {
  await login(page, uniqueEmail('retifica'));
  const [org] = await sql<{ id: string }>(`SELECT id FROM organizations WHERE name = 'Oficina Sete'`);
  const pub = await page.request.post(`/orgs/${org.id}/reviews`, { data: { scores: { respeito: 4 }, text: 'Bom ambiente, horários certos.' } });
  expect(pub.status()).toBe(201);
  const reviewId = (await pub.json()).review.id as string;

  await page.goto(`/org/${org.id}`);
  const mine = page.getByRole('article', { name: 'A tua avaliação' });
  await expect(mine.getByText('Bom ambiente, horários certos.')).toBeVisible();

  // nomes e insultos continuam a bloquear, com a versão sugerida
  await mine.getByRole('button', { name: 'Corrigir o texto' }).click();
  await mine.getByLabel(/O teu texto/).fill('O Rui é um idiota.');
  await mine.getByRole('button', { name: 'Guardar' }).click();
  await expect(mine.getByRole('alert')).toContainText('Tira nomes de pessoas e insultos');
  await mine.getByLabel(/O teu texto/).fill('Bom ambiente, mas os horários mudaram no verão.');
  await mine.getByRole('button', { name: 'Guardar' }).click();
  await expect(mine.getByText('Bom ambiente, mas os horários mudaram no verão.')).toBeVisible();
  await expect(mine.getByText(/editada/)).toBeVisible();
  const [edited] = await sql<{ text: string; edited: boolean }>(`SELECT text, edited_at IS NOT NULL AS edited FROM reviews WHERE id = $1`, [reviewId]);
  expect(edited).toEqual({ text: 'Bom ambiente, mas os horários mudaram no verão.', edited: true });

  await mine.getByRole('button', { name: 'Apagar' }).click();
  await mine.getByRole('button', { name: 'Apagar de vez' }).click();
  await expect(page.getByRole('article', { name: 'A tua avaliação' })).toHaveCount(0);
  expect(await sql(`SELECT 1 FROM reviews WHERE id = $1`, [reviewId])).toHaveLength(0);
});
