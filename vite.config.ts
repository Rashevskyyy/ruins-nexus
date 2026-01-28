import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'esnext', // Support top-level await
    sourcemap: false,
  },
  esbuild: {
    target: 'esnext',
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/render/**'],
    },
  },
});
