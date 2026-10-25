import { expect, fillJob, login, randomNif, sql, test, uniqueEmail } from '../support/fixtures';

/** Organização que falta: formulário com NIF (o VIES está desligado nos testes: "confirmamos depois") */
test('adicionar uma organização com NIF', async ({ page }) => {
  await login(page, uniqueEmail('nova'));
  const name = `Horta Comunitária ${Date.now() % 100000}`;
  const nif = randomNif();
  await page.goto('/avaliar');
  await Promise.all([page.waitForResponse((r) => r.url().includes('/orgs/search')), page.getByPlaceholder(/empresa, associação/i).fill(name)]);
  await page.getByRole('button', { name: /Adicionar organização que não está cá|Não encontras/ }).first().click();
  await page.locator('#nn').fill(name);
  await page.locator('#nt').selectOption('Associação');
  // a localidade sugere os concelhos (25/10): escolhe-se Porto, do distrito do Porto
  await page.locator('#na').fill('Port');
  await page.getByRole('option', { name: /^Porto\s*Porto$/ }).click();
  await expect(page.locator('#na')).toHaveValue('Porto');
  await page.locator('#nnif').fill('500697257');
  await expect(page.getByText(/Este NIF não é válido/)).toBeVisible();
  await page.locator('#nnif').fill(`${nif.slice(0, 3)} ${nif.slice(3, 6)} ${nif.slice(6)}`);
  await expect(page.getByText(/Não conseguimos confirmar agora/)).toBeVisible();
  await page.getByRole('button', { name: /Adicionar e continuar/ }).first().click();
  await fillJob(page, 'Voluntária');
  const rows = await sql<{ status: string; nif: string; district: string }>(`SELECT status, nif, district FROM organizations WHERE name = $1`, [name]);
  expect(rows).toEqual([{ status: 'pending', nif, district: 'Porto' }]);
});

/** A morada de uma organização adicionada à mão ganha coordenadas em segundo plano e entra no mapa real */
test('organização nova com morada: depois de aprovada, aparece no mapa real', async ({ page }) => {
  await login(page, uniqueEmail('morada'));
  const name = `Tasca do Largo ${Date.now() % 100000}`;
  const created = await page.request.post('/orgs', { data: { name, type: 'Empresa', city: 'Porto', address: 'Largo de São Domingos, 12' } });
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  await expect.poll(async () => (await sql<{ lat: number | null }>(`SELECT lat FROM org_locations WHERE org_id = $1`, [id]))[0]?.lat, { timeout: 15_000 }).toBe(41.1496);
  await sql(`UPDATE organizations SET status = 'active' WHERE id = $1`, [id]);
  await page.route('https://tile.openstreetmap.org/**', (r) => r.fulfill({ status: 204 }));
  await page.goto(`/org/${id}`);
  await page.getByRole('button', { name: /Ver mapa/ }).click();
  await page.getByRole('button', { name: 'Ver no mapa' }).click();
  await expect(page.locator('.leaflet-container path.leaflet-interactive')).toHaveCount(1);
});
