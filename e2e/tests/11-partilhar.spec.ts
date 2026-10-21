import type { Page } from '@playwright/test';
import { expect, login, test, uniqueEmail } from '../support/fixtures';

/** Entrevistas e salários: partilhar a partir da página da organização e ver o resultado agregado */
async function openOrg(page: Page) {
  await page.goto('/pesquisa');
  await page.getByRole('combobox').first().fill('oficina sete');
  await page.getByText('Oficina Sete', { exact: true }).first().click();
  await page.waitForURL(/\/org\//);
  return page.url();
}

test.describe('Partilhar entrevistas e salários', () => {
  test('salário: só aparece a função com 3 salários; o "voltar" depois de partilhar não volta ao formulário', async ({ page, browser }) => {
    const role = `Design ${Date.now() % 100000}`;
    // duas pessoas já partilharam esta função
    for (const v of [1100, 1300]) {
      const ctx = await browser.newContext();
      const p = await ctx.newPage();
      await login(p, uniqueEmail('salario'));
      const url = await openOrg(p);
      await p.goto(`${url}/salarios`);
      await p.getByRole('button', { name: 'Partilhar o meu salário' }).click();
      await p.waitForURL(/\/partilhar\/salario/);
      await p.getByLabel('Função', { exact: true }).fill(role);
      await p.getByLabel('Salário bruto por mês').fill(String(v));
      await p.getByRole('button', { name: 'Partilhar salário' }).click();
      await expect(p.getByRole('heading', { name: 'Partilhado. Obrigado.' })).toBeVisible();
      await ctx.close();
    }

    await login(page, uniqueEmail('salario'));
    const orgUrl = await openOrg(page);
    await page.goto(`${orgUrl}/salarios`);
    await page.getByRole('button', { name: 'Partilhar o meu salário' }).click();
    await page.waitForURL(/\/partilhar\/salario/);
    await page.getByLabel('Função', { exact: true }).fill(role);
    await page.getByLabel('Salário bruto por mês').fill('1.200');
    await page.getByRole('button', { name: 'Sim' }).click();
    await page.getByRole('button', { name: 'Partilhar salário' }).click();
    await page.getByRole('link', { name: 'Ver na página da organização' }).click();
    await expect(page).toHaveURL(`${orgUrl}/salarios`);
    await expect(page.getByRole('img', { name: new RegExp(`^${role}: de .*, 3 salários$`) }).first()).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(orgUrl);
  });

  test('entrevista: partilhar e aparece na lista; nomes bloqueiam', async ({ page }) => {
    await login(page, uniqueEmail('entrevista'));
    const orgUrl = await openOrg(page);
    await page.goto(`${orgUrl}/entrevistas`);
    await page.getByRole('button', { name: 'Partilhar a minha entrevista' }).click();
    await page.waitForURL(/\/partilhar\/entrevista/);
    await page.getByLabel('Função', { exact: true }).fill('Ilustração');
    await page.getByRole('button', { name: 'Correu bem' }).click();
    await page.getByRole('button', { name: 'Prova prática' }).click();
    await page.getByRole('group', { name: 'Fizeram-te uma oferta?' }).getByRole('button', { name: 'Não' }).click();
    await page.getByLabel(/Como foi o processo/).fill('O Ricardo é um idiota.');
    await expect(page.getByRole('button', { name: 'Partilhar entrevista' })).toBeDisabled();
    await page.getByLabel(/Como foi o processo/).fill('Pediram um pequeno projeto e deram feedback.');
    await page.getByRole('button', { name: 'Partilhar entrevista' }).click();
    await page.getByRole('link', { name: 'Ver na página da organização' }).click();
    await expect(page).toHaveURL(`${orgUrl}/entrevistas`);
    await expect(page.getByText('Pediram um pequeno projeto e deram feedback.').first()).toBeVisible();
  });
});
