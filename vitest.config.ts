import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/**/*.browser*.test.ts', 'tests/**/browser-integration.test.ts'],
    // Fills in the two Range measurement methods CodeMirror needs and jsdom lacks.
    // They do not fail a test on their own, but each call is reported as an uncaught
    // exception, which vitest counts as an error and therefore exits non-zero on.
    setupFiles: ['tests/setup/jsdom-codemirror.ts'],
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
