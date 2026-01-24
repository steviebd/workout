import { expect, test } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8787';
const TEST_USERNAME = process.env.TEST_USERNAME ?? '';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? '';
const AUTH_EMAIL_SELECTOR = process.env.PLAYWRIGHT_AUTH_EMAIL_SELECTOR ?? 'input[name="email"]';
const AUTH_PASSWORD_SELECTOR = process.env.PLAYWRIGHT_AUTH_PASSWORD_SELECTOR ?? 'input[name="password"]';
const AUTH_SUBMIT_SELECTOR = process.env.PLAYWRIGHT_AUTH_SUBMIT_SELECTOR ?? 'button[name="intent"]:not([data-method])';
const AUTH_CONTINUE_SELECTOR = process.env.PLAYWRIGHT_AUTH_CONTINUE_SELECTOR ?? 'button:has-text("Continue")';

function isAuthKitUrl(url: URL): boolean {
	return url.hostname.includes('authkit.app') || url.pathname.includes('/auth/signin');
}

	test.describe('Authentication Flow', () => {
		test.beforeEach(async ({ context }) => {
			const storageState = await context.storageState();
			if (storageState.cookies.length === 0) {
				await context.clearCookies();
			}
		});

	test('unauthenticated user - verify initial state on home page', () => {
		test.skip(true, 'This test requires manual browser testing - the auth state is determined client-side');
	});

	test('protected route redirects to signin', async ({ page }) => {
		const response = await page.request.get(`${BASE_URL}/api/auth/me`);
		if (response.ok()) {
			test.skip(true, 'User is authenticated - this test verifies redirect for unauthenticated users');
			return;
		}
		
		await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'domcontentloaded', timeout: 30000 });
		await page.waitForTimeout(2000);

		await expect(page).toHaveURL(isAuthKitUrl);
	});

	test('complete login flow and verify authenticated state', async ({ page }) => {
		const response = await page.request.get(`${BASE_URL}/api/auth/me`);
		if (response.ok()) {
			console.log('User is already authenticated via API');
			
			await page.goto(BASE_URL, { waitUntil: 'networkidle' });
			await page.waitForTimeout(3000);
			
			const userAvatar = page.locator('button.rounded-full').first();
			const isVisible = await userAvatar.isVisible().catch(() => false);
			
			if (!isVisible) {
				console.log('User avatar not immediately visible, checking page state...');
				await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 10000 }).catch(() => {});
				await page.waitForTimeout(2000);
			}
			
			await expect(userAvatar).toBeVisible({ timeout: 10000 });
			return;
		}

		await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
		
		try {
			await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 10000 });
		} catch {}
		
		await page.waitForTimeout(3000);

		const signInButton = page.locator('button:has-text("Sign In")').first();
		await expect(signInButton).toBeVisible();
		await signInButton.click();

		await expect(page).toHaveURL(isAuthKitUrl, { timeout: 15000 });

		const emailInput = page.locator(AUTH_EMAIL_SELECTOR);
		await expect(emailInput).toBeVisible({ timeout: 10000 });

		await emailInput.fill(TEST_USERNAME);
		await page.locator(AUTH_CONTINUE_SELECTOR).click();

		await expect(page.locator(AUTH_PASSWORD_SELECTOR)).toBeVisible({ timeout: 10000 });
		await expect(page.locator(AUTH_SUBMIT_SELECTOR)).toBeVisible();

		await page.locator(AUTH_PASSWORD_SELECTOR).fill(TEST_PASSWORD);
		await page.locator(AUTH_SUBMIT_SELECTOR).click();

		await page.waitForURL(`${BASE_URL}/`, { timeout: 30000 });

		const authCheck = await page.request.get(`${BASE_URL}/api/auth/me`);
		expect(authCheck.ok()).toBe(true);

		const userAvatar = page.locator('button.rounded-full').first();
		await expect(userAvatar).toBeVisible({ timeout: 10000 });
	});

	test('access protected routes after login', async ({ page }) => {
		const authResponse = await page.request.get(`${BASE_URL}/api/auth/me`);
		if (!authResponse.ok()) {
			test.skip(true, 'User is not authenticated - this test requires prior authentication');
			return;
		}

		await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });
		await expect(page).not.toHaveURL(isAuthKitUrl);

		await page.goto(`${BASE_URL}/templates`, { waitUntil: 'networkidle' });
		await expect(page).not.toHaveURL(isAuthKitUrl);

		await page.goto(`${BASE_URL}/workouts/new`, { waitUntil: 'networkidle' });
		await expect(page).not.toHaveURL(isAuthKitUrl);

		await page.goto(`${BASE_URL}/history`, { waitUntil: 'networkidle' });
		await expect(page).not.toHaveURL(isAuthKitUrl);
	});

	test('sign out and verify logged out state', async ({ page }) => {
		const authResponse = await page.request.get(`${BASE_URL}/api/auth/me`);
		if (!authResponse.ok()) {
			test.skip(true, 'User is not authenticated - cannot test sign out');
			return;
		}

		const signOutResponse = await page.request.get(`${BASE_URL}/auth/signout`, { maxRedirects: 0 });
		expect(signOutResponse.status()).toBe(302);

		const afterSignOut = await page.request.get(`${BASE_URL}/api/auth/me`);
		expect(afterSignOut.status()).toBe(401);
	});

	test('re-authentication after logout redirects to protected route', async ({ page, context }) => {
		test.skip(true, 'Flaky test - WorkOS session caching causes inconsistent behavior');

		await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
		await page.waitForTimeout(2000);

		const signInButton = page.locator('text=Sign In').first();
		await expect(signInButton).toBeVisible();
		await signInButton.click();

		await expect(page).toHaveURL(isAuthKitUrl, { timeout: 15000 });

		await page.locator(AUTH_EMAIL_SELECTOR).fill(TEST_USERNAME);
		await page.locator(AUTH_CONTINUE_SELECTOR).click();

		await expect(page.locator(AUTH_PASSWORD_SELECTOR)).toBeVisible({ timeout: 10000 });
		await page.locator(AUTH_PASSWORD_SELECTOR).fill(TEST_PASSWORD);
		await page.locator(AUTH_SUBMIT_SELECTOR).click();

		await page.waitForURL(`${BASE_URL}/`, { timeout: 30000 });

		const signOutButton = page.locator('text=Sign Out');
		await expect(signOutButton).toBeVisible({ timeout: 10000 });
		await signOutButton.click();

		await expect(page.locator('text=Sign In').first()).toBeVisible({ timeout: 10000 });

		await context.clearCookies();
		
		const newPage = await context.newPage();
		await newPage.goto(`${BASE_URL}/workouts/new`, { waitUntil: 'networkidle' });

		await expect(newPage).toHaveURL(isAuthKitUrl, { timeout: 15000 });

		await expect(newPage.locator(AUTH_EMAIL_SELECTOR)).toBeVisible({ timeout: 10000 });
	});
});
