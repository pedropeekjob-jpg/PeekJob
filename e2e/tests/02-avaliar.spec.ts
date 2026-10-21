import type { Page } from '@playwright/test';
import { expect, expectNoHorizontalScroll, login, openMagicLink, pickOrg, test, uniqueEmail, setScore } from '../support/fixtures';

/** O fluxo principal: entrar, escolher a organização, dar notas e escrever no mesmo ecrã, reescrever, publicar e verificar depois */
test.describe('Avaliar onde trabalho', () => {
  test('texto com nome e insulto: bloqueado, reescrito e publicado', async ({ page, isMobile }) => {
    await login(page, uniqueEmail('autora'));
    await page.goto('/avaliar');
    await pickOrg(page, 'oficina sete', 'Oficina Sete');
    await setScore(page, 'Respeito e inclusão', 2);
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

  test('parâmetros do tipo de trabalho e comentário por critério: publicados e visíveis na página', async ({ page }) => {
    await login(page, uniqueEmail('parametros'));
    await page.goto('/avaliar');
    await pickOrg(page, 'oficina sete', 'Oficina Sete');
    await setScore(page, 'Ambiente', 4);
    await page.getByRole('button', { name: 'Comentar sobre Ambiente' }).click();
    await page.getByRole('textbox', { name: 'Comentário sobre Ambiente' }).fill('Há sempre alguém para ajudar.');
    await page.getByRole('group', { name: 'Trabalho remoto' }).getByRole('button', { name: 'Sim' }).click();
    await page.getByRole('button', { name: 'Acrescentar parâmetro' }).click();
    await page.getByRole('button', { name: '+ Contrato escrito' }).click();
    await page.getByRole('group', { name: 'Contrato escrito' }).getByRole('button', { name: 'Não' }).click();
    await page.getByRole('button', { name: /Publicar avaliação/ }).click();
    await page.waitForURL(/\/avaliar\/feito/);

    await page.getByRole('link', { name: 'Ver na página da organização' }).first().click();
    await page.waitForURL(/\/org\//);
    await expect(page.getByText('Há sempre alguém para ajudar.').first()).toBeVisible();
    await expect(page.getByText('Trabalho remoto · Sim').first()).toBeVisible();
    await expect(page.getByText('Contrato escrito · Não').first()).toBeVisible();
  });

  test('sem sessão também se começa: escolher a organização e seguir logo para as notas', async ({ page }) => {
    await page.goto('/avaliar');
    await pickOrg(page, 'oficina sete', 'Oficina Sete');
    await expect(page).toHaveURL(/\/avaliar\/notas/);
  });

  test('da página inicial: escrever onde trabalho, escolher e dar notas (3 cliques)', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /^Avalia(?!r)/ }).click();
    await page.getByRole('combobox', { name: 'Onde trabalhas?' }).fill('oficina sete');
    await Promise.all([page.waitForResponse((r) => r.url().includes('/orgs/search')), page.keyboard.press('Enter')]);
    await expect(page).toHaveURL(/\/avaliar\?q=oficina/);
    await page.getByText('Oficina Sete', { exact: true }).first().click();
    await page.waitForURL(/\/avaliar\/notas/);
    await expect(page.getByRole('slider', { name: 'Salário justo' })).toBeVisible();
  });

  test('lista → organização → avaliar → fechar → voltar: volta à lista (não à avaliação)', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'o "fechar" das notas é do telemóvel');
    await page.goto('/pesquisa');
    await page.getByRole('combobox').first().fill('oficina sete');
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

  test('publicado → "Ver na página": voltar leva à lista (nunca a "publicado" nem às notas)', async ({ page }) => {
    await login(page, uniqueEmail('voltar'));
    const orgUrl = await openOrgFromList(page);
    await startAndPublish(page);
    await page.getByRole('link', { name: 'Ver na página da organização' }).first().click();
    await expect(page).toHaveURL(orgUrl);
    await page.goBack();
    await expect(page).toHaveURL(/\/pesquisa/);
  });

  test('publicado → verificar → "Agora não" → "Voltar ao início": voltar leva à organização', async ({ page }) => {
    await login(page, uniqueEmail('inicio'));
    const orgUrl = await openOrgFromList(page);
    await startAndPublish(page);
    await page.getByRole('link', { name: 'Confirmar agora' }).click();
    await page.waitForURL(/\/avaliar\/verificar\?org=/);
    await page.getByRole('button', { name: 'Agora não' }).first().click();
    await page.waitForURL(/\/avaliar\/feito/);
    await page.getByRole('link', { name: 'Voltar ao início' }).first().click();
    await expect(page).toHaveURL(/\/$/);
    await page.goBack();
    await expect(page).toHaveURL(orgUrl);
    await page.goBack();
    await expect(page).toHaveURL(/\/pesquisa/);
  });

  test('sem sessão: "Entra para publicar" → link do email → volta às notas com o rascunho e publica', async ({ page }) => {
    const email = uniqueEmail('a-meio');
    await openOrgFromList(page);
    await page.getByRole('button', { name: 'Avaliar esta organização' }).first().click();
    await page.waitForURL(/\/avaliar\/notas/);
    await setScore(page, 'Ambiente', 4);
    await page.getByRole('button', { name: /Publicar avaliação/ }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Entra para publicar.' })).toBeVisible();
    await page.getByRole('link', { name: 'Entrar', exact: true }).click();
    await page.getByLabel('O teu email').fill(email);
    await page.getByRole('button', { name: 'Receber link de acesso' }).click();
    await expect(page.getByText('Vê o teu email.')).toBeVisible();
    await openMagicLink(page, email);
    await expect(page).toHaveURL(/\/avaliar\/notas/);
    await expect(page.getByRole('slider', { name: 'Ambiente' }).first()).toHaveAttribute('aria-valuetext', '4 de 5, Bom');
    await page.getByRole('button', { name: /Publicar avaliação/ }).click();
    await page.waitForURL(/\/avaliar\/feito/);
  });
});

/** Lista → organização (como quem navega), devolve o endereço da organização */
async function openOrgFromList(page: Page) {
  await page.goto('/pesquisa');
  await page.getByRole('combobox').first().fill('oficina sete');
  await page.getByText('Oficina Sete', { exact: true }).first().click();
  await page.waitForURL(/\/org\//);
  return page.url();
}

/** Avaliar esta organização → uma nota → publicar */
async function startAndPublish(page: Page) {
  await page.getByRole('button', { name: 'Avaliar esta organização' }).first().click();
  await page.waitForURL(/\/avaliar\/notas/);
  await setScore(page, 'Ambiente', 4);
  await page.getByRole('button', { name: /Publicar avaliação/ }).click();
  await page.waitForURL(/\/avaliar\/feito/);
}
