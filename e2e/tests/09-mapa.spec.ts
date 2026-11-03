import AxeBuilder from '@axe-core/playwright';
import { expect, login, test, uniqueEmail } from '../support/fixtures';

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
  await page.getByRole('combobox').first().fill('padaria ribeira');
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

/** Empresas já avaliadas no mapa (03/11): no «Onde trabalhas?», a pedido; a morada filtra; o pino escolhe o local */
test('avaliar: empresas avaliadas no mapa, filtradas pela morada, e o pino escolhe o local', async ({ page }) => {
  const tiles: string[] = [];
  await page.route('https://tile.openstreetmap.org/**', (route) => {
    tiles.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'image/png', body: PNG });
  });
  await login(page, uniqueEmail('mapa'));
  await page.goto('/avaliar');
  await expect(page.getByText('O mapa vem do OpenStreetMap (outro site).')).toBeVisible();
  expect(tiles).toEqual([]);

  await page.getByRole('button', { name: 'Ver empresas avaliadas no mapa' }).click();
  const map = page.locator('.leaflet-container');
  await expect(map).toBeVisible();
  // a Padaria Ribeira (avaliada) com os dois locais; as outras ainda não têm avaliações
  await expect(map.locator('.leaflet-marker-icon')).toHaveCount(2);
  await expect.poll(() => tiles.length).toBeGreaterThan(0);

  await page.getByRole('searchbox', { name: /Nome da organização/ }).fill('rua do freixo');
  await expect(map.locator('.leaflet-marker-icon')).toHaveCount(1);
  await expect(page.getByRole('status', { name: 'No mapa' })).toHaveText('1 organização avaliada no mapa');
  const axe = await new AxeBuilder({ page }).include('.leaflet-container').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);

  // com o teclado: o pino é um botão
  await map.getByRole('button', { name: 'Padaria Ribeira · Fabrico · Campanhã' }).focus();
  await page.keyboard.press('Enter');
  const card = page.getByRole('group', { name: 'Padaria Ribeira' });
  await expect(card).toContainText('Rua do Freixo, 40, Porto');
  await expect(card.getByRole('button', { name: 'É aqui que trabalho' })).toBeFocused();
  await page.screenshot({ path: test.info().outputPath('mapa-avaliar.png') });
  await card.getByRole('button', { name: 'É aqui que trabalho' }).click();
  await expect(page.getByRole('radiogroup', { name: 'Local de trabalho' }).getByRole('radio', { checked: true })).toContainText('Fabrico · Campanhã');
});
