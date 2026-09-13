import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/**/*.browser*.test.ts', 'tests/**/browser-integration.test.ts'],
    // Fills in the two Range measurement methods CodeMirror needs and jsdom lacks,
    // so a real failure is not buried under a wall of TypeErrors.
    setupFiles: ['tests/setup/jsdom-codemirror.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
      // The programme's floor is 95 on every dimension. The measured values before
      // this change were 100 / 98.88 / 97.14 / 100, so the gates were raised to the
      // floor rather than left at the lower numbers they had drifted to.
      thresholds: {
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95,
      },
    },
    onConsoleLog(log: string) {
      // Suppress CodeMirror decoration hydration warnings in jsdom
      if (log.includes('[CodeMirror') && log.includes('decoration')) return false;
    },
  },
});
