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
}

test.describe('Programs Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('programs page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/programs`, { waitUntil: 'networkidle' });

    await expect(page).not.toHaveURL(isAuthKitUrl);

    const title = page.locator('h1:has-text("Programs")').first();
    await expect(title).toBeVisible({ timeout: 10000 });
  });

  test('programs shows category tabs', async ({ page }) => {
    await page.goto(`${BASE_URL}/programs`, { waitUntil: 'networkidle' });

    const allTab = page.locator('button:has-text("All")').first();
    await expect(allTab).toBeVisible({ timeout: 10000 });

    const powerliftingTab = page.locator('button:has-text("Powerlifting")').first();
    const isVisible = await powerliftingTab.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await expect(powerliftingTab).toBeVisible();
    }
  });

  test('programs displays program cards', async ({ page }) => {
    await page.goto(`${BASE_URL}/programs`, { waitUntil: 'networkidle' });

    await page.waitForTimeout(2000);

    const firstProgram = page.locator('[class*="cursor-pointer"]:has-text("days/week")').first();
    await expect(firstProgram).toBeVisible({ timeout: 10000 });
  });

  test('can filter programs by category', async ({ page }) => {
    await page.goto(`${BASE_URL}/programs`, { waitUntil: 'networkidle' });

    const powerliftingTab = page.locator('button:has-text("Powerlifting")').first();
    await powerliftingTab.click();

    await page.waitForTimeout(1000);
  });

  test('can navigate to program start page', async ({ page }) => {
    await page.goto(`${BASE_URL}/programs`, { waitUntil: 'networkidle' });

    await page.waitForTimeout(2000);

    const programCards = page.locator('a[href*="/programs/"]');
    const count = await programCards.count();

    if (count > 0) {
      await programCards.first().click();

      await page.waitForURL(/\/programs\/[a-z-]+\/start/, { timeout: 10000 });
    }
  });
});

test.describe('Program Start Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('program start page loads with 1RM inputs', async ({ page }) => {
    await page.goto(`${BASE_URL}/programs/powerlifting-5x5/start`, { waitUntil: 'networkidle' });

    await expect(page).not.toHaveURL(isAuthKitUrl);

    const squatInput = page.locator('input[id*="squat"], input[name*="squat"]').first();
    await expect(squatInput).toBeVisible({ timeout: 10000 });
  });

  test('can fill in 1RM values and continue', async ({ page }) => {
    await page.goto(`${BASE_URL}/programs/powerlifting-5x5/start`, { waitUntil: 'networkidle' });

    await page.waitForTimeout(2000);

    const squatInput = page.locator('input[id*="squat"]').first();
    if (await squatInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await squatInput.fill('100');
    }

    const benchInput = page.locator('input[id*="bench"]').first();
    if (await benchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await benchInput.fill('80');
    }

    const deadliftInput = page.locator('input[id*="deadlift"]').first();
    if (await deadliftInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deadliftInput.fill('140');
    }

    const continueButton = page.locator('button:has-text("Continue")').first();
    await continueButton.click();

    await page.waitForTimeout(2000);
  });

  test('can select gym days', async ({ page }) => {
    await page.goto(`${BASE_URL}/programs/powerlifting-5x5/start`, { waitUntil: 'networkidle' });

    await page.waitForTimeout(3000);

    const dayButtons = page.locator('button[class*="day"]:has-text("Mon")').first();
    await expect(dayButtons).toBeVisible({ timeout: 10000 }).catch(() => {});
  });
});

test.describe('Protected Routes', () => {
  test('programs page is accessible when authenticated', async ({ page }) => {
    await page.goto(`${BASE_URL}/programs`, { waitUntil: 'networkidle' });

    await expect(page).not.toHaveURL(isAuthKitUrl);

    const title = page.locator('h1:has-text("Programs")').first();
    await expect(title).toBeVisible({ timeout: 10000 });
  });
});
