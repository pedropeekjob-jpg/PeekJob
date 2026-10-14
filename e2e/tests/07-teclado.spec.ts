import { expect, login, pickOrg, test, uniqueEmail } from '../support/fixtures';

/** Usar só com o teclado (e leitores de ecrã): saltar para o conteúdo, foco ao mudar de ecrã, notas e separadores com setas */
test.describe('Teclado', () => {
  test('o primeiro Tab mostra "Saltar para o conteúdo" e leva ao conteúdo', async ({ page }) => {
    await page.goto('/sobre');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Saltar para o conteúdo' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.locator('#conteudo')).toBeFocused();
    await expect(page).toHaveURL(/\/sobre$/); // não muda de página (também com o HashRouter da demo)
  });

  test('ao mudar de ecrã o foco vai para o título (o leitor de ecrã anuncia a página nova)', async ({ page }) => {
    await page.goto('/sobre');
    await page.getByRole('link', { name: 'Contacto' }).first().click();
    await page.waitForURL(/\/contacto$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  });

  test('o foco vê-se sempre (anel de dois tons, também em fundos escuros)', async ({ page }) => {
    await page.goto('/sobre');
    await page.keyboard.press('Tab');
    const ring = await page.evaluate(() => {
      const s = getComputedStyle(document.activeElement as Element);
      return { outline: s.outlineStyle, width: parseFloat(s.outlineWidth), shadow: s.boxShadow };
    });
    expect(ring.outline).toBe('solid');
    expect(ring.width).toBeGreaterThanOrEqual(2);
    expect(ring.shadow).toContain('rgb(255, 255, 255)');
  });

  test('notas: um Tab por critério e setas para escolher a nota', async ({ page, isMobile }) => {
    test.skip(isMobile, 'teclado físico: computador');
    await login(page, uniqueEmail('teclado'));
    await page.goto('/avaliar');
    await pickOrg(page, 'oficina sete', 'Oficina Sete');
    const group = page.getByRole('radiogroup', { name: 'Salário justo' });
    await expect(group).toBeVisible();
    await expect(group.locator('[tabindex="0"]')).toHaveCount(1);
    await group.getByRole('radio').first().focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(group.getByRole('radio', { name: 'Salário justo, 3 de 5' })).toBeFocused();
    await expect(group.getByRole('radio', { name: 'Salário justo, 3 de 5' })).toHaveAttribute('aria-checked', 'true');
    // Tab sai do grupo para o critério seguinte
    await page.keyboard.press('Tab');
    await expect(page.getByRole('radiogroup', { name: 'Equilíbrio' }).getByRole('radio').first()).toBeFocused();
  });

  test('verificação: separadores com setas', async ({ page }) => {
    await login(page, uniqueEmail('tabs'));
    await page.goto('/avaliar');
    await pickOrg(page, 'oficina sete', 'Oficina Sete');
    // a verificação (agora depois de publicar) também abre com a organização do rascunho
    await page.goto('/avaliar/verificar');
    const tabs = page.getByRole('tab');
    await tabs.first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(1)).toBeFocused();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  });
});
