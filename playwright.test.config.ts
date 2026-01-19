import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  webServer: {
    command: '',
    url: 'http://localhost:8787',
    reuseExistingServer: true,
    timeout: 120000,
  },
  testDir: './tests/e2e',
  outputDir: './test-results/',
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  globalSetup: undefined,
  use: {
    trace: 'on-first-retry',
    headless: true,
    baseURL: 'http://localhost:8787',
    storageState: 'playwright/.auth/state.json',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
