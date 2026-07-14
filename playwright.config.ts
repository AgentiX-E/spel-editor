import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*{browser,browser-integration}*.test.ts',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:4173',
  },
  webServer: {
    command: 'pnpm exec vite --port 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
