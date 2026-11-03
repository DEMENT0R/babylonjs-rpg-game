import { defineConfig } from 'vite';

// base './' — чтобы сборка жила и в корне домена, и в /<repo>/ на GitHub Pages
export default defineConfig({
  base: './',
  server: { port: 5173, host: '127.0.0.1' },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 3000,
    sourcemap: false,
  },
});
