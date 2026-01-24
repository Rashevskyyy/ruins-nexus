import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'esnext', // Support top-level await
    sourcemap: false,
  },
  esbuild: {
    target: 'esnext',
  },
});
