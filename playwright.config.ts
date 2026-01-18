import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
webServer: {
		command: process.env.CI
			? ''
			: 'infisical run --env dev -- sh -c "bun run build && bun run wrangler dev"',
		url: 'http://localhost:8787',
		reuseExistingServer: !!process.env.CI,
		timeout: 120000,
	},
	testDir: './tests/e2e',
	outputDir: './test-results/',
	snapshotDir: './tests/snapshots/',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		trace: 'on-first-retry',
		headless: !!process.env.CI || !process.env.DEBUG,
		baseURL: 'http://localhost:8787',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
});
