import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
      thresholds: {
        statements: 85,
        branches: 80,
        functions: 85,
        lines: 85,
      },
    },
    onConsoleLog(log: string) {
      // Suppress CodeMirror decoration hydration warnings in jsdom
      if (log.includes('[CodeMirror') && log.includes('decoration')) return false;
    },
  },
});
