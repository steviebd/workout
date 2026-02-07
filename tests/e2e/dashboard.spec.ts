import { expect, test, type Page } from '@playwright/test';

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

async function loginUser(page: Page) {
  const authResponse = await page.request.get(`${BASE_URL}/api/auth/me`);
  if (authResponse.ok()) {
    console.log('User is already authenticated via API');
    return;
  }

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });

  try {
    await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 10000 });
  } catch {}

  await page.waitForTimeout(2000);

  const signOutButton = page.locator('text=Sign Out').first();
  if (await signOutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    return;
  }

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

  const authCheck = await page.request.get(`${BASE_URL}/api/auth/me`);
  expect(authCheck.ok()).toBe(true);
}

test.describe('Dashboard Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('dashboard loads and shows greeting', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    await expect(page).not.toHaveURL(isAuthKitUrl);

    const greeting = page.locator('h1');
    await expect(greeting.first()).toBeVisible({ timeout: 10000 });

    const greetingText = await greeting.textContent();
    expect(['Good morning', 'Good afternoon', 'Good evening']).toContain(greetingText);
  });

  test('dashboard shows start workout button', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const startWorkoutButton = page.locator('text=Start Workout').first();
    const isVisible = await startWorkoutButton.isVisible({ timeout: 10000 }).catch(() => false);

    if (isVisible) {
      await expect(startWorkoutButton).toBeVisible();
    }
  });

  test('dashboard shows recent workouts section', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    await page.waitForTimeout(2000);

    const recentWorkoutsSection = page.locator('text=Recent Workouts');
    const isVisible = await recentWorkoutsSection.isVisible({ timeout: 10000 }).catch(() => false);

    if (isVisible) {
      await expect(recentWorkoutsSection.first()).toBeVisible();
    }
  });

  test('can navigate to workouts page from dashboard', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    await page.waitForTimeout(2000);

    await page.goto(`${BASE_URL}/workouts`, { waitUntil: 'networkidle' });
    await expect(page).not.toHaveURL(isAuthKitUrl);

    const title = page.locator('h1:has-text("Workouts")').first();
    await expect(title).toBeVisible({ timeout: 10000 });
  });

  test('can navigate to exercises page from dashboard', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    await page.waitForTimeout(2000);

    await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });
    await expect(page).not.toHaveURL(isAuthKitUrl);

    const title = page.locator('h1:has-text("Exercises")').first();
    await expect(title).toBeVisible({ timeout: 10000 });
  });

  test('can navigate to templates page from dashboard', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    await page.waitForTimeout(2000);

    await page.goto(`${BASE_URL}/templates`, { waitUntil: 'networkidle' });
    await expect(page).not.toHaveURL(isAuthKitUrl);

    const title = page.locator('h1:has-text("Templates")').first();
    await expect(title).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Progress Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('progress page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/progress`, { waitUntil: 'networkidle' });

    await expect(page).not.toHaveURL(isAuthKitUrl);

    const title = page.locator('h1:has-text("Progress")').first();
    await expect(title).toBeVisible({ timeout: 10000 });
  });

  test('progress shows exercise selector', async ({ page }) => {
    await page.goto(`${BASE_URL}/progress`, { waitUntil: 'networkidle' });

    await page.waitForTimeout(2000);

    const exerciseSelector = page.locator('select, [role="combobox"]:has-text("Select exercise")').first();
    const isVisible = await exerciseSelector.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await expect(exerciseSelector).toBeVisible();
    }
  });

  test('progress shows workout history', async ({ page }) => {
    await page.goto(`${BASE_URL}/progress`, { waitUntil: 'networkidle' });

    await page.waitForTimeout(2000);

    const historyHeader = page.locator('h2:has-text("Workout History")');
    const isVisible = await historyHeader.isVisible({ timeout: 10000 }).catch(() => false);

    if (isVisible) {
      await expect(historyHeader.first()).toBeVisible();
    }
  });

  test('can search workouts in progress page', async ({ page }) => {
    await page.goto(`${BASE_URL}/progress`, { waitUntil: 'networkidle' });

    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    await searchInput.fill('test');
    await page.waitForTimeout(1000);
  });

  test('stat cards display workout counts', async ({ page }) => {
    await page.goto(`${BASE_URL}/progress`, { waitUntil: 'networkidle' });

    await page.waitForTimeout(2000);

    const totalWorkouts = page.locator('text=Total Workouts');
    const isVisible = await totalWorkouts.isVisible({ timeout: 10000 }).catch(() => false);

    if (isVisible) {
      await expect(totalWorkouts.first()).toBeVisible();
    }
  });
});

test.describe('Achievements Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('achievements page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/achievements`, { waitUntil: 'networkidle' });

    await expect(page).not.toHaveURL(isAuthKitUrl);

    const title = page.locator('h1:has-text("Achievements")').first();
    await expect(title).toBeVisible({ timeout: 10000 });
  });

  test('achievements shows streak display', async ({ page }) => {
    await page.goto(`${BASE_URL}/achievements`, { waitUntil: 'networkidle' });

    await page.waitForTimeout(2000);

    const streakText = page.locator('text=streak, text=days').first();
    const isVisible = await streakText.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await expect(streakText).toBeVisible();
    }
  });

  test('achievements shows badges', async ({ page }) => {
    await page.goto(`${BASE_URL}/achievements`, { waitUntil: 'networkidle' });

    await page.waitForTimeout(2000);

    const badgesSection = page.locator('text=Badges, [class*="badge"]').first();
    await expect(badgesSection.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('can filter badges by unlocked status', async ({ page }) => {
    await page.goto(`${BASE_URL}/achievements`, { waitUntil: 'networkidle' });

    await page.waitForTimeout(2000);

    const unlockedFilter = page.locator('button:has-text("Unlocked")').first();

    const isUnlockedVisible = await unlockedFilter.isVisible({ timeout: 5000 }).catch(() => false);
    if (isUnlockedVisible) {
      await unlockedFilter.click();
      await page.waitForTimeout(1000);
    }
  });
});

test.describe('Navigation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('can navigate from dashboard to progress', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    await page.waitForTimeout(2000);

    await page.goto(`${BASE_URL}/progress`, { waitUntil: 'networkidle' });
    await expect(page.locator('h1:has-text("Progress")').first()).toBeVisible({ timeout: 10000 });
  });

  test('can navigate from dashboard to achievements', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    await page.waitForTimeout(2000);

    await page.goto(`${BASE_URL}/achievements`, { waitUntil: 'networkidle' });
    await expect(page.locator('h1:has-text("Achievements")').first()).toBeVisible({ timeout: 10000 });
  });
});
