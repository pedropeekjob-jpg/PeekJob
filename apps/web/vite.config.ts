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
  build: {
    sourcemap: coverage,
    rollupOptions: {
      output: {
        // React e o router mudam pouco: ficheiro próprio, que fica em cache entre publicações
        manualChunks: (id) => (/node_modules\/(react|react-dom|scheduler|react-router)\//.test(id) ? 'vendor' : undefined),
      },
    },
  },
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify((process.env.VITE_APP_VERSION || process.env.npm_package_version || 'dev').slice(0, 12)),
  },
  test: {
    setupFiles: ['test/setup.ts'],
    // *.test.* são ecrãs e componentes (browser simulado: jsdom); *.spec.* são regras puras (Node)
    projects: [
      { extends: true, test: { name: 'ecras', include: ['test/**/*.test.{ts,tsx}'], environment: 'jsdom' } },
      { extends: true, test: { name: 'regras', include: ['test/**/*.spec.{ts,tsx}'], environment: 'node' } },
    ],
    coverage: {
      provider: 'istanbul',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/main.tsx'],
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: 'coverage/unit',
    },
  },
});
