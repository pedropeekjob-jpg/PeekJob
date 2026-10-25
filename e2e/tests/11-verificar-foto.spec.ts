import { createCanvas } from '@napi-rs/canvas';
import { expect, login, randomNif, sql, test, uniqueEmail } from '../support/fixtures';

/** Recibo fotografado (ligeiramente torto, JPEG), como sai de um telemóvel */
function receiptPhoto(lines: string[]): Buffer {
  const W = 1400;
  const H = 260 + lines.length * 70;
  const c = createCanvas(W, H);
  const x = c.getContext('2d');
  x.fillStyle = '#d8d4cc';
  x.fillRect(0, 0, W, H);
  x.translate(W / 2, H / 2);
  x.rotate((1.5 * Math.PI) / 180);
  x.translate(-W / 2, -H / 2);
  x.fillStyle = '#fbfaf6';
  x.fillRect(60, 60, W - 120, H - 120);
  x.fillStyle = '#1a1a1a';
  x.font = '38px DejaVu Sans, sans-serif';
  lines.forEach((l, i) => x.fillText(l, 110, 150 + i * 70));
  return c.toBuffer('image/jpeg', 82);
}

/** Verificar com a fotografia do recibo (OCR no servidor): depois de publicar, a partir de "Confirmar agora" */
test('verificar com uma fotografia do recibo', async ({ page }, info) => {
  const nif = randomNif();
  const name = `Oficina Foto ${info.project.name} ${Date.now() % 100000}`;
  const [org] = await sql<{ id: string }>(
    `INSERT INTO organizations (name, type, city, status, nif, nif_verified, source) VALUES ($1, 'Empresa', 'Porto', 'active', $2, true, 'seed') RETURNING id`,
    [name, nif],
  );
  await login(page, uniqueEmail('foto'));
  await page.goto(`/avaliar/verificar?org=${org.id}`);
  await page.getByRole('tab', { name: /Documento|Contrato ou recibo/ }).click();
  const formatted = `${nif.slice(0, 3)} ${nif.slice(3, 6)} ${nif.slice(6)}`;
  await page.locator('input[type=file]').setInputFiles({
    name: 'IMG_2041.jpg',
    mimeType: 'image/jpeg',
    buffer: receiptPhoto(['RECIBO DE VENCIMENTO - SETEMBRO 2026', name, `NIF ${formatted}`, 'Trabalhador: Joana Silva']),
  });
  await expect(page.getByText(/Só procuramos o NIF da organização/)).toBeVisible();
  await page.getByRole('button', { name: /^Continuar/ }).first().click();
  await page.waitForURL(/\/avaliar\/feito/, { timeout: 30_000 });
  const rows = await sql<{ method: string }>(`SELECT method FROM verifications WHERE org_id = $1`, [org.id]);
  expect(rows).toEqual([{ method: 'document' }]);
});
