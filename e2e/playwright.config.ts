import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3200);

/**
 * Testes no browser contra a aplicação real (API + web de produção + PostgreSQL), em telemóvel e computador.
 * Correr: npm run build && npm run e2e   (ver docs/07-backend.md)
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1, // uma base de dados partilhada
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  // github: cada falha aparece como anotação no run (com ficheiro, linha e erro), sem descarregar o relatório
  reporter: process.env.CI ? [['list'], ['github'], ['html', { open: 'never', outputFolder: 'playwright-report' }]] : 'list',
  outputDir: 'test-results',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'pt-PT',
    ...(process.env.PW_CHROMIUM ? { launchOptions: { executablePath: process.env.PW_CHROMIUM } } : {}),
  },
  projects: [
    { name: 'telemovel', use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'computador', use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: 'node support/server.mjs',
    url: `http://localhost:${PORT}/health`,
    reuseExistingServer: false,
    timeout: 90_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
