import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * - Demo (GitHub Pages): HashRouter e base './' para funcionar em qualquer pasta.
 * - Produção (VITE_ROUTER=browser): URLs reais e base '/', servida pela API.
 */
const browser = process.env.VITE_ROUTER === 'browser';

export default defineConfig({
  plugins: [react()],
  base: browser ? '/' : './',
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify((process.env.VITE_APP_VERSION || process.env.npm_package_version || 'dev').slice(0, 12)),
  },
});
