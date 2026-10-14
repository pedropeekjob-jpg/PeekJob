// Build de demonstração com o React de "profiling" (mede o tempo de render em produção).
// Usada só por scripts/react-profile.mjs, para o commit de referência e para a versão atual.
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: process.env.PJ_WEB_ROOT,
  base: './',
  plugins: [react()],
  logLevel: 'error',
  resolve: { alias: [{ find: /^react-dom$/, replacement: 'react-dom/profiling' }] },
  define: { 'import.meta.env.VITE_APP_VERSION': JSON.stringify('profile') },
  // PJ_NAMES=1: sem minificar, para listar os componentes pelo nome
  build: { minify: process.env.PJ_NAMES !== '1' },
});
