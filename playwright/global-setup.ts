import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { type Browser, chromium } from '@playwright/test';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getInfisicalSecret(secretName: string): Promise<string> {
	try {
		const result = execSync(`infisical --env dev secrets get ${secretName} --plain`, {
			encoding: 'utf-8',
			stdio: ['pipe', 'pipe', 'pipe'],
		});
		return Promise.resolve(result.trim());
	} catch (error) {
		console.error(`Failed to get ${secretName} from Infisical:`, error);
		throw error;
	}
}

async function globalSetup() {
	const storageStatePath = join(__dirname, '.auth/state.json');
	const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8787';

	let TEST_USERNAME = process.env.TEST_USERNAME ?? '';
	let TEST_PASSWORD = process.env.TEST_PASSWORD ?? '';

	if (!TEST_USERNAME || !TEST_PASSWORD) {
		console.log('Fetching credentials from Infisical...');
		TEST_USERNAME = await getInfisicalSecret('TEST_USERNAME');
		TEST_PASSWORD = await getInfisicalSecret('TEST_PASSWORD');
	}

	const AUTH_EMAIL_SELECTOR = process.env.PLAYWRIGHT_AUTH_EMAIL_SELECTOR ?? 'input[name="email"]';
	const AUTH_PASSWORD_SELECTOR = process.env.PLAYWRIGHT_AUTH_PASSWORD_SELECTOR ?? 'input[name="password"]';
	const AUTH_SUBMIT_SELECTOR = process.env.PLAYWRIGHT_AUTH_SUBMIT_SELECTOR ?? 'button[name="intent"]:not([data-method])';
	const AUTH_CONTINUE_SELECTOR = process.env.PLAYWRIGHT_AUTH_CONTINUE_SELECTOR ?? 'button:has-text("Continue")';

	console.log('Credentials loaded successfully');

	mkdirSync(dirname(storageStatePath), { recursive: true });

	const browser: Browser = await chromium.launch();
	const page = await browser.newPage();

	await page.goto(BASE_URL, { waitUntil: 'networkidle' });

	// Check if already logged in
	const userAvatarButton = page.locator('button.rounded-full').first();
	const isUserAvatarVisible = await userAvatarButton.isVisible({ timeout: 2000 }).catch(() => false);

	if (isUserAvatarVisible) {
		console.log('Already logged in, skipping login');
		await browser.close();
		return;
	}

	const signInButton = page.locator('text=Sign In').first();
	const isSignInVisible = await signInButton.isVisible({ timeout: 2000 }).catch(() => false);

	if (!isSignInVisible) {
		console.log('Sign In button not visible, checking if already authenticated...');
		// Wait a bit for auth to complete
		await page.waitForTimeout(2000);
		const avatarAfterWait = page.locator('button.rounded-full').first();
		const isAvatarNowVisible = await avatarAfterWait.isVisible().catch(() => false);
		if (isAvatarNowVisible) {
			console.log('User is now authenticated');
			await browser.close();
			return;
		}
	}

	if (isSignInVisible) {
		await signInButton.click();

		await page.waitForURL((url: URL) => url.hostname.includes('authkit.app') || url.pathname.includes('/auth/signin'), { timeout: 10000 });

		await page.locator(AUTH_EMAIL_SELECTOR).fill(TEST_USERNAME);
		await page.locator(AUTH_CONTINUE_SELECTOR).click();

		await page.waitForLoadState('networkidle');

		try {
			await page.locator(AUTH_PASSWORD_SELECTOR).waitFor({ state: 'visible', timeout: 15000 });
		} catch {
			console.log('Password field not visible after 15 seconds, taking screenshot...');
			await page.screenshot({ path: '/tmp/auth-error.png' });
			throw new Error('Password field not visible after email submission. Check /tmp/auth-error.png for details.');
		}

		await page.locator(AUTH_PASSWORD_SELECTOR).fill(TEST_PASSWORD);
		await page.locator(AUTH_SUBMIT_SELECTOR).click();

		// Wait for either success or error
		try {
			await page.waitForURL((url) => url.origin === BASE_URL, { timeout: 30000 });
		} catch {
			await page.waitForLoadState('networkidle');
			// Check if there's an error
			const currentUrl = page.url();
			if (currentUrl.includes('error=auth_failed')) {
				console.log('Auth failed, checking for error details...');
				await page.screenshot({ path: '/tmp/auth-failed.png' });
			}
		}

		// Wait for user menu or sign out button
		await page.waitForTimeout(2000);

		const userButton = page.locator('button:has-text("Sign In")');
		const isSignInStillVisible = await userButton.isVisible().catch(() => false);

		if (isSignInStillVisible) {
			// Not logged in, fail with helpful message
			await page.screenshot({ path: '/tmp/login-failed.png' });
			throw new Error('Login failed - still showing Sign In button. Check /tmp/login-failed.png');
		}
	} else {
		console.log('Sign In button not found and user not already logged in');
	}

	// User is logged in, look for user avatar button
	const avatarButton = page.locator('button.rounded-full').first();
	await avatarButton.waitFor({ state: 'visible', timeout: 10000 }).catch(async () => {
		// Try clicking the header user button as fallback
		await page.locator('header button').filter({ has: page.locator('svg.lucide-user') }).click();
	});

	// Wait for dropdown with sign out
	await page.locator('text=Sign Out').first().waitFor({ state: 'visible', timeout: 10000 });

	await page.context().storageState({ path: storageStatePath });

	console.log('Authentication successful, state saved to:', storageStatePath);

	await browser.close();
}

export default globalSetup;
