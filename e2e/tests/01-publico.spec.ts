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
    await page.getByRole('link', { name: /Como é trabalhar lá dentro/ }).click();
    // na primeira visita pergunta as prioridades (pode saltar)
    await page.waitForURL(/\/(explorar|preferencias)$/);
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
