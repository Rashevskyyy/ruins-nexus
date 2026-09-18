import { defineConfig } from 'vitest/config';

export default defineConfig({
  server: {
    host: "0.0.0.0",
    proxy: { "/socket.io": { target: "http://localhost:3001", ws: true } },
  },
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
