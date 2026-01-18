import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
	globalSetup: path.join(__dirname, 'playwright/global-setup.ts'),
	use: {
		trace: 'on-first-retry',
		headless: !!process.env.CI || !process.env.DEBUG,
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
