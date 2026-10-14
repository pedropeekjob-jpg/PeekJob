import { test as base, expect, type Page } from '@playwright/test';
import { createHmac, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

const MAIL = `http://localhost:${process.env.E2E_MAIL_PORT ?? 4610}`;
const DB = process.env.E2E_DATABASE_URL ?? 'postgres://postgres@localhost:5544/peekjob_e2e';
const SECRET = 'e2e-secret';

/** Email único por teste e por projeto (a base de dados é partilhada) */
export const uniqueEmail = (who: string) => `${who}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}@teste.pt`;

export async function sql<T = Record<string, unknown>>(q: string, params: unknown[] = []): Promise<T[]> {
  const c = new pg.Client({ connectionString: DB });
  await c.connect();
  try {
    return (await c.query(q, params)).rows as T[];
  } finally {
    await c.end();
  }
}

/** Entra como uma pessoa real: pede o link, lê o email no servidor falso e abre o link */
export async function login(page: Page, email: string) {
  await page.goto('/entrar');
  await page.getByLabel(/O teu email|Your email/i).fill(email);
  await page.getByRole('button', { name: /Receber link|Enviar|Send/i }).first().click();
  await expect(page.getByText(/Vê o teu email|Check your email/i)).toBeVisible();
  await openMagicLink(page, email);
}

/** Abre o último link de acesso enviado para este email (como quem o abre no email) */
export async function openMagicLink(page: Page, email: string) {
  const mails = (await (await fetch(`${MAIL}/__mails`)).json()) as { to: string[]; text: string }[];
  const mail = mails.filter((m) => m.to[0] === email).at(-1);
  expect(mail, `email para ${email}`).toBeTruthy();
  await page.goto(mail!.text.match(/https?:\/\/\S+token=[\w-]+/)![0]);
  await page.waitForURL((u) => !u.pathname.startsWith('/entrar'));
}

export async function makeModerator(email: string) {
  const hash = createHmac('sha256', SECRET).update(`email:${email.trim().toLowerCase()}`).digest('hex');
  await sql(`UPDATE users SET role = 'moderator' WHERE email_hash = $1`, [hash]);
}

export async function expectNoHorizontalScroll(page: Page) {
  const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  expect(sw, `scroll horizontal em ${page.url()}`).toBeLessThanOrEqual(cw);
}

/**
 * Em todos os testes: nenhum erro de JavaScript nem violação da CSP.
 * (Pedidos com 4xx esperados, como /auth/me sem sessão, não contam.)
 */
export const test = base.extend<{ guard: void }>({
  guard: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on('pageerror', (e) => problems.push(`erro JS: ${e.message}`));
      page.on('console', (m) => {
        const t = m.text();
        if (m.type() === 'error' && !/Failed to load resource|fonts\.(googleapis|gstatic)/.test(t)) problems.push(`consola: ${t}`);
        if (/Content Security Policy|Refused to (load|execute|connect|apply)/.test(t) && !/fonts\.(googleapis|gstatic)/.test(t)) problems.push(`CSP: ${t}`);
      });
      await use();
      // Cobertura da web nos testes no browser (build com VITE_COVERAGE=true): junta-se à dos testes unitários no SonarQube
      if (process.env.E2E_COVERAGE) {
        const cov = await page.evaluate(() => (window as unknown as { __coverage__?: unknown }).__coverage__).catch(() => undefined);
        if (cov) {
          const dir = join(__dirname, '..', '.nyc_output');
          mkdirSync(dir, { recursive: true });
          writeFileSync(join(dir, `${randomUUID()}.json`), JSON.stringify(cov));
        }
      }
      expect(problems, 'erros no browser').toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };

/**
 * Procura no fluxo de avaliar e escolhe a organização (espera pela resposta da pesquisa, como quem vê os resultados).
 * Com um só local segue logo para as notas; com vários, confirma o local primeiro.
 */
export async function pickOrg(page: Page, query: string, name: string) {
  await Promise.all([page.waitForResponse((r) => r.url().includes('/orgs/search')), page.getByPlaceholder(/Empresa, associação/).fill(query)]);
  await page.getByText(name, { exact: true }).first().click();
  const next = page.getByRole('button', { name: /^Continuar/ }).first();
  await Promise.race([page.waitForURL(/\/avaliar\/notas/), next.waitFor().then(() => next.click())]);
  await page.waitForURL(/\/avaliar\/notas/);
}

/** NIF válido e diferente em cada teste (pessoa coletiva, começa por 5) */
export function randomNif(): string {
  const base = '5' + String(Math.floor(Math.random() * 1e7)).padStart(7, '0');
  const sum = base.split('').reduce((a, d, i) => a + Number(d) * (9 - i), 0);
  const r = sum % 11;
  return base + (r < 2 ? 0 : 11 - r);
}
