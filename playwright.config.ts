import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
	webServer: {
		command: 'infisical run --env dev -- sh -c "bun x tsx scripts/generate-wrangler-config.ts --env dev && vite dev --port 8787"',
		url: 'http://localhost:8787',
		reuseExistingServer: !process.env.CI,
		timeout: 60000,
	},
	testDir: './tests/e2e',
	outputDir: './test-results/',
	snapshotDir: './tests/snapshots/',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 2 : 2,
	reporter: process.env.CI ? 'github' : 'list',
	globalSetup: path.join(__dirname, 'playwright/global-setup.ts'),
	timeout: 60000,
	use: {
		trace: 'on-first-retry',
		headless: !!process.env.CI || !process.env.DEBUG,
		baseURL: 'http://localhost:8787',
		storageState: 'playwright/.auth/state.json',
		actionTimeout: 15000,
		navigationTimeout: 45000,
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
});
