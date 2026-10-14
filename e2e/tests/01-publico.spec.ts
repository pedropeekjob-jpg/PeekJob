import { expect, expectNoHorizontalScroll, test } from '../support/fixtures';

/** Quem visita sem conta: páginas públicas, organização, 404 e inglês */
test.describe('Visita pública', () => {
  const PAGES = ['/', '/explorar', '/ranking', '/pesquisa', '/sobre', '/contacto', '/metodologia', '/setores', '/para-organizacoes'];

  test('as páginas públicas abrem sem erros nem scroll horizontal', async ({ page }) => {
    for (const path of PAGES) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      await expect(page.locator('main').first()).toBeVisible();
      await expectNoHorizontalScroll(page);
    }
  });

  test('da página inicial a uma organização', async ({ page }) => {
    await page.goto('/');
    // primeiro clique: a zona de cima ocupa a página; depois ver todas as organizações
    await page.getByRole('button', { name: /^Espreitar/ }).click();
    await expect(page).toHaveURL(/\/\?lado=espreitar$/);
    await page.getByRole('link', { name: 'Ver todas as organizações' }).click();
    // na primeira visita pergunta as prioridades (pode saltar). O explorar carrega a pedido e só então redireciona:
    // esperar pelo título do ecrã final antes de decidir
    await page.waitForURL(/\/(explorar|preferencias)$/);
    await expect(page.locator('main h1')).toBeVisible();
    if (page.url().endsWith('/preferencias')) {
      await page.getByRole('button', { name: /^Saltar( por agora)?$/ }).first().click();
      await page.waitForURL(/\/explorar$/);
    }
    // (o ranking só mostra organizações com 5 ou mais avaliações; o explorar mostra todas)
    await page.locator('main a[href^="/org/"]').first().click();
    await page.waitForURL(/\/org\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test('a avaliação publicada aparece na página da organização', async ({ page }) => {
    await page.goto('/pesquisa');
    await page.getByRole('searchbox').first().fill('padaria ribeira');
    await page.getByText('Padaria Ribeira').first().click();
    await page.waitForURL(/\/org\//);
    await expect(page.getByText('Turnos mal planeados e chefia desorganizada.')).toBeVisible();
  });

  test('página inicial: pesquisar a partir da zona de cima, voltar e escolher avaliar', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /^Espreitar/ }).click();
    await page.getByRole('searchbox', { name: 'Pesquisar organização' }).fill('padaria');
    await page.keyboard.press('Enter');
    await page.waitForURL(/\/pesquisa\?q=padaria$/);
    await page.goBack();
    await expect(page.getByRole('searchbox', { name: 'Pesquisar organização' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/$/);
    await page.getByRole('button', { name: /^O teu trabalho/ }).click();
    await page.getByRole('link', { name: 'Avaliar onde trabalho' }).click();
    await page.waitForURL(/\/avaliar$/);
    await expectNoHorizontalScroll(page);
  });

  test('caminho que não existe: página 404 (e estado 404, sem "soft 404")', async ({ page }) => {
    const res = await page.goto('/isto-nao-existe');
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Não encontrámos esse caminho' })).toBeVisible();
    await page.getByRole('link', { name: 'Voltar ao início' }).click();
    await page.waitForURL((u) => u.pathname === '/');
  });

  test('inglês: muda o idioma e mantém-no ao navegar', async ({ page }) => {
    await page.goto('/sobre');
    await page.getByRole('button', { name: 'English' }).first().click();
    await expect(page.getByRole('heading', { name: /We give a voice/ })).toBeVisible();
    await page.goto('/contacto');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-GB');
    await page.getByRole('button', { name: 'Português' }).first().click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-PT');
  });
});
