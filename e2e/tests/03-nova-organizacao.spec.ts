import { expect, login, randomNif, sql, test, uniqueEmail } from '../support/fixtures';

/** Organização que falta: formulário com NIF (o VIES está desligado nos testes: "confirmamos depois") */
test('adicionar uma organização com NIF', async ({ page }) => {
  await login(page, uniqueEmail('nova'));
  const name = `Horta Comunitária ${Date.now() % 100000}`;
  const nif = randomNif();
  await page.goto('/avaliar');
  await Promise.all([page.waitForResponse((r) => r.url().includes('/orgs/search')), page.getByPlaceholder(/Empresa, associação/).fill(name)]);
  await page.getByRole('button', { name: /Adicionar organização que não está cá|Não encontras/ }).first().click();
  await page.locator('#nn').fill(name);
  await page.locator('#nt').selectOption('Associação');
  await page.locator('#na').fill('Porto');
  await page.locator('#nnif').fill('500697257');
  await expect(page.getByText(/Este NIF não é válido/)).toBeVisible();
  await page.locator('#nnif').fill(`${nif.slice(0, 3)} ${nif.slice(3, 6)} ${nif.slice(6)}`);
  await expect(page.getByText(/Não conseguimos confirmar agora/)).toBeVisible();
  await page.getByRole('button', { name: /Adicionar e continuar/ }).first().click();
  await page.waitForURL(/\/avaliar\/notas/);
  const rows = await sql<{ status: string; nif: string }>(`SELECT status, nif FROM organizations WHERE name = $1`, [name]);
  expect(rows).toEqual([{ status: 'pending', nif }]);
});
