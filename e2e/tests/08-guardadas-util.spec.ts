import { expect, login, test, uniqueEmail } from '../support/fixtures';

/** Guardadas e "útil" ficam na conta: outro aparelho (outro browser) vê o mesmo */
test.describe('Guardadas e útil na conta', () => {
  async function openOrg(page: import('@playwright/test').Page, name: string) {
    await page.goto('/pesquisa');
    await page.getByRole('combobox').first().fill(name.toLowerCase());
    await page.getByText(name, { exact: true }).first().click();
    await page.waitForURL(/\/org\//);
  }

  test('guardar sem sessão, entrar: a organização passa para a conta e aparece noutro aparelho', async ({ page, browser }) => {
    const email = uniqueEmail('guarda');
    await openOrg(page, 'Padaria Ribeira');
    await page.getByRole('button', { name: /^Guardar$/ }).first().click();
    await expect(page.getByRole('button', { name: /^Guardada$/ }).first()).toBeVisible();
    await login(page, email);

    // outro aparelho: browser novo, sem nada guardado localmente
    const other = await browser.newPage();
    await login(other, email);
    await other.goto('/guardadas');
    await expect(other.getByText('Padaria Ribeira').first()).toBeVisible();
    await other.close();
  });

  test('útil conta no servidor: ao recarregar continua marcado e com a mesma contagem', async ({ page }) => {
    await login(page, uniqueEmail('util'));
    await openOrg(page, 'Padaria Ribeira');
    const btn = page.getByRole('button', { name: /^Útil, \d+ pessoas?$/ }).first();
    const before = Number(/(\d+)/.exec((await btn.getAttribute('aria-label'))!)![1]);
    await btn.click();
    await expect(page.getByRole('button', { name: `Útil, ${before + 1} ${before + 1 === 1 ? 'pessoa' : 'pessoas'}` }).first()).toHaveAttribute('aria-pressed', 'true');
    await page.waitForLoadState('networkidle');
    await page.reload();
    const after = page.getByRole('button', { name: `Útil, ${before + 1} ${before + 1 === 1 ? 'pessoa' : 'pessoas'}` }).first();
    await expect(after).toHaveAttribute('aria-pressed', 'true');
  });
});
