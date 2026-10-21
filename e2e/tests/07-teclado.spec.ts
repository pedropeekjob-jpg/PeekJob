import { expect, login, pickOrg, test, uniqueEmail, setScore } from '../support/fixtures';

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

  test('notas: slider por critério, setas para escolher a nota e Tab para o seguinte', async ({ page, isMobile }) => {
    test.skip(isMobile, 'teclado físico: computador');
    await login(page, uniqueEmail('teclado'));
    await page.goto('/avaliar');
    await pickOrg(page, 'oficina sete', 'Oficina Sete');
    const slider = page.getByRole('slider', { name: 'Salário justo' });
    await expect(slider).toHaveAttribute('aria-valuetext', 'Sem nota');
    await slider.focus();
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(slider).toBeFocused();
    await expect(slider).toHaveAttribute('aria-valuetext', '3 de 5, Aceitável');
    // Delete tira a nota
    await page.keyboard.press('Delete');
    await expect(slider).toHaveAttribute('aria-valuetext', 'Sem nota');
    // Tab passa pelo × (escondido sem nota) e pela ajuda do critério seguinte, até ao slider dele
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'O que conta em Equilíbrio' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('slider', { name: 'Equilíbrio' })).toBeFocused();
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
