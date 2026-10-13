import { expect, expectNoHorizontalScroll, login, pickOrg, test, uniqueEmail } from '../support/fixtures';

/** O fluxo principal: entrar, escolher a organização, dar notas, escrever, reescrever e publicar */
test.describe('Avaliar onde trabalho', () => {
  test('texto com nome e insulto: bloqueado, reescrito e publicado', async ({ page, isMobile }) => {
    await login(page, uniqueEmail('autora'));
    await page.goto('/avaliar');
    await pickOrg(page, 'oficina sete', 'Oficina Sete');
    await page.getByRole('button', { name: /Saltar|Avaliar sem verificar/ }).first().click();
    await page.waitForURL(/\/avaliar\/notas/);
    await page.getByRole('radio', { name: 'Respeito e inclusão, 2 de 5' }).first().click();
    if (isMobile) {
      await page.getByRole('button', { name: /Continuar/ }).last().click();
      await page.waitForURL(/\/avaliar\/texto/);
    }

    await page.locator('textarea').fill('O Ricardo é um idiota e o salário chega sempre atrasado.');
    await expect(page.getByText('Sem nomes nem insultos', { exact: true })).toBeVisible();
    // possível ilegalidade: aviso de apoio
    await expect(page.getByText('Isto pode ser uma ilegalidade')).toBeVisible();
    await page.getByRole('button', { name: /Reescrever com IA/ }).click();
    await expect(page.getByText('Proposta', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Usar esta versão' }).click();
    await expect(page.locator('textarea')).not.toHaveValue(/Ricardo|idiota/);
    await expect(page.locator('textarea')).toHaveValue(/salário chega sempre atrasado/);
    await expectNoHorizontalScroll(page);

    await page.getByRole('button', { name: /Publicar avaliação/ }).click();
    await page.waitForURL(/\/avaliar\/feito/);
    await expectNoHorizontalScroll(page);

    // a mensagem privada de apoio chega ao perfil
    await page.goto('/apoio');
    await expect(page.getByText(/incumprimento salarial/i).first()).toBeVisible();
  });

  test('sem sessão também se começa: escolher a organização e seguir para a verificação', async ({ page }) => {
    await page.goto('/avaliar');
    await pickOrg(page, 'oficina sete', 'Oficina Sete');
    await expect(page).toHaveURL(/verificar/);
  });
});
