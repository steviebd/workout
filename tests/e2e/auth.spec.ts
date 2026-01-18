import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8787';
const TEST_USERNAME = process.env.TEST_USERNAME || '';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '';
const AUTH_EMAIL_SELECTOR = process.env.PLAYWRIGHT_AUTH_EMAIL_SELECTOR || 'input[name="email"]';
const AUTH_PASSWORD_SELECTOR = process.env.PLAYWRIGHT_AUTH_PASSWORD_SELECTOR || 'input[name="password"]';
const AUTH_SUBMIT_SELECTOR = process.env.PLAYWRIGHT_AUTH_SUBMIT_SELECTOR || 'button[name="intent"]:not([data-method])';
const AUTH_CONTINUE_SELECTOR = process.env.PLAYWRIGHT_AUTH_CONTINUE_SELECTOR || 'button:has-text("Continue")';

function isAuthKitUrl(url: URL): boolean {
	return url.hostname.includes('authkit.app') || url.pathname.includes('/auth/signin');
}

test.describe('Authentication Flow', () => {
	test.beforeEach(async ({ context }) => {
		await context.clearCookies();
	});

	test('unauthenticated user - verify initial state on home page', async ({ page }) => {
		await page.goto(BASE_URL, { waitUntil: 'networkidle' });

		await expect(page.locator('text=Sign In').first()).toBeVisible({ timeout: 10000 });

		await expect(page.locator('text=Sign Out').first()).not.toBeVisible();
	});

	test('protected route redirects to signin', async ({ page }) => {
		await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });

		await expect(page).toHaveURL(isAuthKitUrl);
	});

	test('complete login flow and verify authenticated state', async ({ page }) => {
		await page.goto(BASE_URL, { waitUntil: 'networkidle' });

		const signInButton = page.locator('text=Sign In').first();
		await expect(signInButton).toBeVisible();
		await signInButton.click();

		await expect(page).toHaveURL(isAuthKitUrl, { timeout: 10000 });

		const emailInput = page.locator(AUTH_EMAIL_SELECTOR);
		await expect(emailInput).toBeVisible({ timeout: 10000 });

		await emailInput.fill(TEST_USERNAME);
		await page.locator(AUTH_CONTINUE_SELECTOR).click();

		await expect(page.locator(AUTH_PASSWORD_SELECTOR)).toBeVisible({ timeout: 10000 });
		await expect(page.locator(AUTH_SUBMIT_SELECTOR)).toBeVisible();

		await page.locator(AUTH_PASSWORD_SELECTOR).fill(TEST_PASSWORD);
		await page.locator(AUTH_SUBMIT_SELECTOR).click();

		await page.waitForURL(`${BASE_URL}/`, { timeout: 30000 });

		await expect(page.locator('text=Sign Out').first()).toBeVisible({ timeout: 10000 });

		await expect(page.locator('text=Sign In').first()).not.toBeVisible();
	});

	test('access protected routes after login', async ({ page }) => {
		await page.goto(BASE_URL, { waitUntil: 'networkidle' });

		const signInButton = page.locator('text=Sign In').first();
		await expect(signInButton).toBeVisible();
		await signInButton.click();

		await expect(page).toHaveURL(isAuthKitUrl, { timeout: 10000 });

		await page.locator(AUTH_EMAIL_SELECTOR).fill(TEST_USERNAME);
		await page.locator(AUTH_CONTINUE_SELECTOR).click();

		await expect(page.locator(AUTH_PASSWORD_SELECTOR)).toBeVisible({ timeout: 10000 });
		await page.locator(AUTH_PASSWORD_SELECTOR).fill(TEST_PASSWORD);
		await page.locator(AUTH_SUBMIT_SELECTOR).click();

		await page.waitForURL(`${BASE_URL}/`, { timeout: 30000 });

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
		await page.goto(BASE_URL, { waitUntil: 'networkidle' });

		const signInButton = page.locator('text=Sign In').first();
		await expect(signInButton).toBeVisible();
		await signInButton.click();

		await expect(page).toHaveURL(isAuthKitUrl, { timeout: 10000 });

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
	});

	test('re-authentication after logout redirects to protected route', async ({ page, context }) => {
		await page.goto(BASE_URL, { waitUntil: 'networkidle' });

		const signInButton = page.locator('text=Sign In').first();
		await expect(signInButton).toBeVisible();
		await signInButton.click();

		await expect(page).toHaveURL(isAuthKitUrl, { timeout: 10000 });

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

		await page.goto(`${BASE_URL}/workouts/new`, { waitUntil: 'networkidle' });

		await expect(page).toHaveURL(isAuthKitUrl);

		await expect(page.locator(AUTH_EMAIL_SELECTOR)).toBeVisible({ timeout: 10000 });
	});
});
