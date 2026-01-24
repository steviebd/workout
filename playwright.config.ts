import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
	webServer: {
		command: 'curl -s --connect-timeout 5 --max-time 10 http://localhost:8787 > /dev/null 2>&1 || exit 1',
		url: 'http://localhost:8787',
		reuseExistingServer: true,
		timeout: 30000,
	},
	testDir: './tests/e2e',
	outputDir: './test-results/',
	snapshotDir: './tests/snapshots/',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: 1,
	reporter: process.env.CI ? 'github' : 'list',
	globalSetup: path.join(__dirname, 'playwright/global-setup.ts'),
	use: {
		trace: 'on-first-retry',
		headless: !!process.env.CI || !process.env.DEBUG,
		baseURL: 'http://localhost:8787',
		storageState: 'playwright/.auth/state.json',
		actionTimeout: 15000,
		navigationTimeout: 30000,
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
});
