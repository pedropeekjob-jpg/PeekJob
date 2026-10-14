import { expect, test } from '../support/fixtures';

/** Página inicial com rato: a frase segue o cursor em cada zona, mas não por cima do logo (pedido do cliente) */
test('a frase que segue o rato esconde-se por cima do logo', async ({ page, isMobile }) => {
  test.skip(isMobile, 'a frase só existe com rato');
  await page.goto('/');
  const opacity = (zone: 'peek' | 'job') =>
    page.evaluate((z) => {
      const half = [...document.querySelectorAll('main > div')][z === 'peek' ? 0 : 1];
      return Number(getComputedStyle(half.querySelector('[class*="_hint_"]')!).opacity);
    }, zone);
  const box = (await page.locator('main').boundingBox())!;

  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.2);
  await expect.poll(() => opacity('peek')).toBe(1);

  // centro do logo (na linha entre as zonas)
  const mark = (await page.locator('main [class*="_mark_"]').boundingBox())!;
  await page.mouse.move(mark.x + mark.width / 2, mark.y + mark.height / 2);
  await expect.poll(() => Promise.all([opacity('peek'), opacity('job')])).toEqual([0, 0]);

  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.8);
  await expect.poll(() => opacity('job')).toBe(1);
  expect(await opacity('peek')).toBe(0); // só a frase da zona onde está o rato
});
