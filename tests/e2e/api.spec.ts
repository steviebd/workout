import { expect, test, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8787';
const TEST_USERNAME = process.env.TEST_USERNAME ?? '';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? '';

function isAuthKitUrl(url: URL): boolean {
	return url.hostname.includes('authkit.app') || url.pathname.includes('/auth/signin');
}

async function loginUser(page: Page) {
	const authResponse = await page.request.get(`${BASE_URL}/api/auth/me`);
	if (authResponse.ok()) {
		return;
	}

	await page.goto(BASE_URL, { waitUntil: 'load' });

	await page.waitForTimeout(3000);

	const userAvatar = page.locator('button.rounded-full').first();
	if (await userAvatar.isVisible({ timeout: 2000 }).catch(() => false)) {
		return;
	}

	const signInButton = page.locator('text=Sign In').first();
	if (await signInButton.isVisible({ timeout: 2000 }).catch(() => false)) {
		await signInButton.click();
	} else {
		const currentUrl = page.url();
		if (!isAuthKitUrl(new URL(currentUrl))) {
			await page.waitForTimeout(2000);
		}
	}

	await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 10000 });

	await page.locator('input[name="email"]').fill(TEST_USERNAME);
	await page.locator('button:has-text("Continue")').click();

	await expect(page.locator('input[name="password"]')).toBeVisible({ timeout: 10000 });
	await page.locator('input[name="password"]').fill(TEST_PASSWORD);
	await page.locator('button[name="intent"]:not([data-method])').click();

	await page.waitForURL(BASE_URL, { timeout: 30000 });

	const authCheck = await page.request.get(`${BASE_URL}/api/auth/me`);
	expect(authCheck.ok()).toBe(true);
}

test.describe('API Endpoints', () => {
	test.beforeEach(async ({ page }) => {
		await loginUser(page);
	});

	test('GET /api/streaks returns valid response with streak data', async ({ page }) => {
		const response = await page.request.get(`${BASE_URL}/api/streaks`);

		expect(response.status()).toBe(200);

		const data = await response.json();
		expect(data).toHaveProperty('weeklyCount');
		expect(data).toHaveProperty('weeklyTarget');
		expect(data).toHaveProperty('thirtyDayStreak');
		expect(data).toHaveProperty('totalWorkouts');
		expect(data).toHaveProperty('rolling30Days');

		expect(typeof data.weeklyCount).toBe('number');
		expect(typeof data.weeklyTarget).toBe('number');
		expect(typeof data.thirtyDayStreak).toBe('object');
		expect(typeof data.totalWorkouts).toBe('number');
		expect(typeof data.rolling30Days).toBe('number');

		expect(data.thirtyDayStreak).toHaveProperty('current');
		expect(data.thirtyDayStreak).toHaveProperty('target');
		expect(data.thirtyDayStreak).toHaveProperty('progress');
		expect(data.thirtyDayStreak).toHaveProperty('maxConsecutive');
		expect(data.thirtyDayStreak).toHaveProperty('weeklyDetails');

		expect(data.weeklyTarget).toBeGreaterThan(0);
		expect(data.weeklyCount).toBeGreaterThanOrEqual(0);
		expect(data.totalWorkouts).toBeGreaterThanOrEqual(0);
		expect(data.rolling30Days).toBeGreaterThanOrEqual(0);

		console.log('Streaks API response:', JSON.stringify(data, null, 2));
	});

	test('GET /api/streaks includes weekly details with correct structure', async ({ page }) => {
		const response = await page.request.get(`${BASE_URL}/api/streaks`);

		expect(response.status()).toBe(200);

		const data = await response.json();
		expect(Array.isArray(data.thirtyDayStreak.weeklyDetails)).toBe(true);

		for (const week of data.thirtyDayStreak.weeklyDetails) {
			expect(week).toHaveProperty('weekStart');
			expect(week).toHaveProperty('count');
			expect(week).toHaveProperty('meetsTarget');
			expect(typeof week.weekStart).toBe('string');
			expect(typeof week.count).toBe('number');
			expect(typeof week.meetsTarget).toBe('boolean');
		}

		console.log('Weekly details validated:', data.thirtyDayStreak.weeklyDetails.length, 'weeks');
	});

	test('GET /api/streaks sets correct cache headers', async ({ page }) => {
		const response = await page.request.get(`${BASE_URL}/api/streaks`);

		expect(response.status()).toBe(200);

		const cacheControl = response.headers()['cache-control'];
		expect(cacheControl).toBeDefined();
		expect(cacheControl).toContain('public');
		expect(cacheControl).toContain('s-maxage=');
	});

	test('GET /api/streaks is accessible when authenticated', async ({ page }) => {
		const authResponse = await page.request.get(`${BASE_URL}/api/auth/me`);
		expect(authResponse.ok()).toBe(true);

		const streaksResponse = await page.request.get(`${BASE_URL}/api/streaks`);
		expect(streaksResponse.status()).toBe(200);

		console.log('Authenticated streaks request successful');
	});

	test('POST /api/workouts creates workout and returns 201', async ({ page }) => {
		const workoutData = {
			name: 'Test E2E Workout',
			localId: `test-e2e-${Date.now()}`,
		};

		const response = await page.request.post(`${BASE_URL}/api/workouts`, {
			headers: {
				'Content-Type': 'application/json',
			},
			data: workoutData,
		});

		expect(response.status()).toBe(201);

		const data = await response.json();
		expect(data).toHaveProperty('id');
		expect(data).toHaveProperty('name');
		expect(data.name).toBe(workoutData.name);

		console.log('Workout created:', data.id);
	});

	test('GET /api/workouts returns list of workouts', async ({ page }) => {
		const response = await page.request.get(`${BASE_URL}/api/workouts`);

		expect(response.status()).toBe(200);

		const data = await response.json();
		expect(Array.isArray(data)).toBe(true);

		console.log('Workouts list retrieved, count:', data.length);
	});
});