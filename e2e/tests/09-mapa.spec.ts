import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '../support/fixtures';

// 1×1 px transparente: os mosaicos não saem para a internet nos testes
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

/** Mapa real: só depois de pedir (vem de outro site), com os locais e a atribuição; fica lembrado */
test('organização com coordenadas: "Ver no mapa" abre o mapa real dentro da CSP', async ({ page }) => {
  const tiles: string[] = [];
  await page.route('https://tile.openstreetmap.org/**', (route) => {
    tiles.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'image/png', body: PNG });
  });

  await page.goto('/pesquisa');
  await page.getByRole('searchbox').first().fill('padaria ribeira');
  await page.getByText('Padaria Ribeira', { exact: true }).first().click();
  await page.waitForURL(/\/org\//);
  await page.getByRole('button', { name: /Ver mapa/ }).click(); // o mapa abre a pedido (telemóvel e computador)

  // antes de pedir: nenhum pedido ao fornecedor do mapa
  await expect(page.getByText('O mapa vem do OpenStreetMap (outro site).')).toBeVisible();
  expect(tiles).toEqual([]);

  await page.getByRole('button', { name: 'Ver no mapa' }).click();
  const map = page.locator('.leaflet-container');
  await expect(map).toBeVisible();
  await expect(map.locator('path.leaflet-interactive')).toHaveCount(2); // os dois locais
  // os dois à vista na primeira vez
  for (const p of await map.locator('path.leaflet-interactive').all()) await expect(p).toBeInViewport();
  await expect(map.getByRole('link', { name: 'OpenStreetMap' })).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright');
  await expect.poll(() => tiles.length).toBeGreaterThan(0);
  await expect(map.getByRole('button', { name: 'Aproximar' })).toBeVisible();
  // acessibilidade com o mapa aberto (WCAG 2.1 AA)
  const axe = await new AxeBuilder({ page }).include('.leaflet-container').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  await page.screenshot({ path: test.info().outputPath('mapa.png') });

  // fica lembrado neste browser
  await page.reload();
  await page.getByRole('button', { name: /Ver mapa/ }).click(); // o mapa abre a pedido (telemóvel e computador)
  await expect(page.locator('.leaflet-container')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ver no mapa' })).toHaveCount(0);
});
