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
