import { defineConfig } from 'vite';

export default defineConfig({
  root: 'public',
  server: {
    port: 4173,
    fs: {
      allow: ['..'],
    },
  },
  build: { outDir: '../dist-demo' },
});
