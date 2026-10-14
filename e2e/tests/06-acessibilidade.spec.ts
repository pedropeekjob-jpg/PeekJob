import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, login, pickOrg, test, uniqueEmail } from '../support/fixtures';

/**
 * WCAG 2.1 AA (axe-core): todas as páginas, em telemóvel e computador, também os passos de avaliar e o perfil.
 * Junta todas as falhas num só relatório para ser fácil corrigir.
 */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
type Found = { page: string; rule: string; impact: string; help: string; targets: string[] };

async function audit(page: Page, label: string, found: Found[]) {
  await page.waitForLoadState('networkidle');
  // animações de entrada (fade-up): o contraste só conta no estado final; as infinitas (anéis a flutuar) não acabam
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => undefined))));
  const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  for (const v of r.violations) {
    found.push({ page: label, rule: v.id, impact: v.impact ?? '?', help: v.help, targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) });
  }
}

const report = (found: Found[]) => found.map((f) => `${f.page} · ${f.rule} (${f.impact}): ${f.help} → ${f.targets.join(' | ')}`);

test('páginas públicas sem falhas de acessibilidade (WCAG 2.1 AA)', async ({ page }) => {
  const found: Found[] = [];
  for (const path of ['/', '/?lado=espreitar', '/?lado=avaliar', '/explorar', '/ranking', '/pesquisa', '/sobre', '/contacto', '/metodologia', '/setores', '/para-organizacoes', '/entrar', '/isto-nao-existe', '/?lang=en']) {
    await page.goto(path);
    if (page.url().endsWith('/preferencias')) await audit(page, '/preferencias', found);
    await audit(page, path, found);
  }
  await page.goto('/pesquisa');
  await page.getByRole('searchbox').first().fill('padaria');
  await page.getByText('Padaria Ribeira').first().click();
  await page.waitForURL(/\/org\//);
  await audit(page, '/org/:id', found);
  await page.locator('a[href*="/denunciar/"]').first().click();
  await audit(page, '/org/:id/denunciar', found);
  expect(report(found)).toEqual([]);
});

test('fluxo de avaliar e área pessoal sem falhas de acessibilidade', async ({ page, isMobile }) => {
  const found: Found[] = [];
  await login(page, uniqueEmail('a11y'));
  await page.goto('/avaliar');
  await audit(page, '/avaliar', found);
  await pickOrg(page, 'oficina sete', 'Oficina Sete');
  await audit(page, '/avaliar/verificar', found);
  await page.getByRole('button', { name: /Saltar|Avaliar sem verificar/ }).first().click();
  await page.waitForURL(/\/avaliar\/notas/);
  await audit(page, '/avaliar/notas', found);
  if (isMobile) {
    await page.getByRole('radio', { name: 'Ambiente, 3 de 5' }).first().click();
    await page.getByRole('button', { name: /Continuar/ }).last().click();
    await page.waitForURL(/\/avaliar\/texto/);
  }
  await page.locator('textarea').fill('O Ricardo é um idiota e o salário chega sempre atrasado.');
  await audit(page, 'avaliar: texto bloqueado', found);
  await page.getByRole('button', { name: /Reescrever com IA/ }).click();
  await expect(page.getByText('Proposta', { exact: true })).toBeVisible();
  await audit(page, 'avaliar: proposta da IA', found);
  for (const path of ['/perfil', '/perfil/dados', '/guardadas', '/apoio', '/preferencias']) {
    await page.goto(path);
    await audit(page, path, found);
  }
  expect(report(found)).toEqual([]);
});

test('reflow a 320 px (WCAG 1.4.10): sem scroll horizontal nos ecrãs principais', async ({ browser }, info) => {
  test.skip(info.project.name !== 'telemovel', 'basta uma vez');
  const ctx = await browser.newContext({ viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const wide: string[] = [];
  for (const path of ['/', '/explorar', '/ranking', '/pesquisa', '/sobre', '/contacto', '/metodologia', '/setores', '/para-organizacoes', '/entrar', '/avaliar', '/?lang=en']) {
    await page.goto(path);
    await page.waitForTimeout(300);
    const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    if (sw > cw) wide.push(`${path} (${sw}px)`);
  }
  await ctx.close();
  expect(wide).toEqual([]);
});
