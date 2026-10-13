import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import istanbul from 'vite-plugin-istanbul';

/**
 * - Demo (GitHub Pages): HashRouter e base './' para funcionar em qualquer pasta.
 * - Produção (VITE_ROUTER=browser): URLs reais e base '/', servida pela API.
 * - VITE_COVERAGE=true: build instrumentada para medir a cobertura dos testes no browser (só CI, nunca em produção).
 */
const browser = process.env.VITE_ROUTER === 'browser';
const coverage = process.env.VITE_COVERAGE === 'true';

export default defineConfig({
  plugins: [
    react(),
    ...(coverage ? [istanbul({ include: 'src/**/*', exclude: ['node_modules', 'test/'], extension: ['.ts', '.tsx'], requireEnv: false, forceBuildInstrument: true })] : []),
  ],
  base: browser ? '/' : './',
  build: coverage ? { sourcemap: true } : undefined,
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify((process.env.VITE_APP_VERSION || process.env.npm_package_version || 'dev').slice(0, 12)),
  },
  test: {
    include: ['test/**/*.{spec,test}.{ts,tsx}'],
    environmentMatchGlobs: [['test/**/*.test.tsx', 'jsdom']],
    setupFiles: ['test/setup.ts'],
    coverage: {
      provider: 'istanbul',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/main.tsx'],
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: 'coverage/unit',
    },
  },
});
