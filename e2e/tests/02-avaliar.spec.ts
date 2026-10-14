import { expect, expectNoHorizontalScroll, login, pickOrg, test, uniqueEmail } from '../support/fixtures';

/** O fluxo principal: entrar, escolher a organização, dar notas e escrever no mesmo ecrã, reescrever, publicar e verificar depois */
test.describe('Avaliar onde trabalho', () => {
  test('texto com nome e insulto: bloqueado, reescrito e publicado', async ({ page, isMobile }) => {
    await login(page, uniqueEmail('autora'));
    await page.goto('/avaliar');
    await pickOrg(page, 'oficina sete', 'Oficina Sete');
    await page.getByRole('radio', { name: 'Respeito e inclusão, 2 de 5' }).first().click();
    // telemóvel: o comentário é opcional e abre-se no mesmo ecrã
    if (isMobile) await page.getByRole('button', { name: /Contar como é/ }).click();

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

    // verificar depois de publicar: o convite leva à verificação e volta a "publicado"
    await page.getByRole('link', { name: 'Confirmar agora' }).click();
    await page.waitForURL(/\/avaliar\/verificar\?org=/);
    await page.getByRole('button', { name: 'Agora não' }).first().click();
    await page.waitForURL(/\/avaliar\/feito/);

    // a mensagem privada de apoio chega ao perfil
    await page.goto('/apoio');
    await expect(page.getByText(/incumprimento salarial/i).first()).toBeVisible();
  });

  test('sem sessão também se começa: escolher a organização e seguir logo para as notas', async ({ page }) => {
    await page.goto('/avaliar');
    await pickOrg(page, 'oficina sete', 'Oficina Sete');
    await expect(page).toHaveURL(/\/avaliar\/notas/);
  });

  test('da página inicial: escrever onde trabalho, escolher e dar notas (3 cliques)', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /^O teu trabalho/ }).click();
    await page.getByRole('searchbox', { name: 'Onde trabalhas?' }).fill('oficina sete');
    await Promise.all([page.waitForResponse((r) => r.url().includes('/orgs/search')), page.keyboard.press('Enter')]);
    await expect(page).toHaveURL(/\/avaliar\?q=oficina/);
    await page.getByText('Oficina Sete', { exact: true }).first().click();
    await page.waitForURL(/\/avaliar\/notas/);
    await expect(page.getByRole('radiogroup', { name: 'Salário justo' })).toBeVisible();
  });

  test('lista → organização → avaliar → fechar → voltar: volta à lista (não à avaliação)', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'o "fechar" das notas é do telemóvel');
    await page.goto('/pesquisa');
    await page.getByRole('searchbox').first().fill('oficina sete');
    await page.getByText('Oficina Sete', { exact: true }).first().click();
    await page.waitForURL(/\/org\//);
    const orgUrl = page.url();
    await page.getByRole('button', { name: 'Avaliar esta organização' }).first().click();
    await page.waitForURL(/\/avaliar\/notas/);
    await page.getByRole('button', { name: /^Fechar/ }).click();
    await expect(page).toHaveURL(orgUrl);
    await page.goBack();
    await expect(page).toHaveURL(/\/pesquisa/);
  });
});
