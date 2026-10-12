import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' para o build funcionar em qualquer pasta (ex.: link de demonstração)
export default defineConfig({ plugins: [react()], base: './' });
