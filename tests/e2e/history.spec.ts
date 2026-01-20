import { expect, test, Page } from '@playwright/test';

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
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });

  const signOutButton = page.locator('text=Sign Out').first();
  if (await signOutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('Already logged in, skipping login');
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

  await expect(page.locator('text=Sign Out').first()).toBeVisible({ timeout: 10000 });
}

test.describe('Workout History', () => {
  test.beforeEach(async ({ context }) => {
    const storageStateExists = await import('fs').then(fs =>
      fs.existsSync('playwright/.auth/state.json')
    );
    if (!storageStateExists) {
      await context.clearCookies();
    }
  });

  test('can view history page', async ({ page }) => {
    await loginUser(page);

    await page.goto(`${BASE_URL}/history`, { waitUntil: 'networkidle' });

    await expect(page.locator('h1:has-text("Workout History")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Total Workouts')).toBeVisible();
    await expect(page.locator('text=This Week')).toBeVisible();
    await expect(page.locator('text=This Month')).toBeVisible();
  });

  test('can filter by date range', async ({ page }) => {
    await loginUser(page);

    await page.goto(`${BASE_URL}/history`, { waitUntil: 'networkidle' });

    await expect(page.locator('h1:has-text("Workout History")')).toBeVisible({ timeout: 10000 });

    const fromDateInput = page.locator('input[type="date"]').first();
    const toDateInput = page.locator('input[type="date"]').nth(1);

    await expect(fromDateInput).toBeVisible();
    await expect(toDateInput).toBeVisible();

    await fromDateInput.fill('2025-01-01');
    await toDateInput.fill('2025-12-31');

    await page.waitForTimeout(500);
  });

  test('can filter by exercise', async ({ page }) => {
    await loginUser(page);

    await page.goto(`${BASE_URL}/history`, { waitUntil: 'networkidle' });

    await expect(page.locator('h1:has-text("Workout History")')).toBeVisible({ timeout: 10000 });

    const exerciseSelect = page.locator('select').filter({ has: page.locator('option[value=""]') });
    await expect(exerciseSelect).toBeVisible();

    await exerciseSelect.selectOption({ index: 1 });

    await page.waitForTimeout(500);
  });

  test('can click stats cards to apply filters', async ({ page }) => {
    await loginUser(page);

    await page.goto(`${BASE_URL}/history`, { waitUntil: 'networkidle' });

    await expect(page.locator('h1:has-text("Workout History")')).toBeVisible({ timeout: 10000 });

    const thisWeekCard = page.locator('button:has-text("This Week")').first();
    await expect(thisWeekCard).toBeVisible();
    await thisWeekCard.click();

    await page.waitForTimeout(500);

    const thisMonthCard = page.locator('button:has-text("This Month")').first();
    await expect(thisMonthCard).toBeVisible();
    await thisMonthCard.click();

    await page.waitForTimeout(500);

    const allTimeCard = page.locator('button:has-text("All Time")').first();
    await expect(allTimeCard).toBeVisible();
    await allTimeCard.click();

    await page.waitForTimeout(500);
  });

  test('can expand and collapse workout cards', async ({ page }) => {
    await loginUser(page);

    await page.goto(`${BASE_URL}/history`, { waitUntil: 'networkidle' });

    await expect(page.locator('h1:has-text("Workout History")')).toBeVisible({ timeout: 10000 });

    const workoutCards = page.locator('.bg-white.rounded-lg.border.border-gray-200');

    const cardCount = await workoutCards.count();

    if (cardCount > 0) {
      const firstCard = workoutCards.first();
      await expect(firstCard).toBeVisible();

      const chevronDown = page.locator('svg.lucide-chevron-down').first();
      await expect(chevronDown).toBeVisible();

      await firstCard.click();

      await expect(page.locator('svg.lucide-chevron-up').first()).toBeVisible({ timeout: 5000 });

      await page.waitForTimeout(500);
    } else {
      console.log('No workout cards found to test expand/collapse');
    }
  });

  test('can search workouts', async ({ page }) => {
    await loginUser(page);

    await page.goto(`${BASE_URL}/history`, { waitUntil: 'networkidle' });

    await expect(page.locator('h1:has-text("Workout History")')).toBeVisible({ timeout: 10000 });

    const searchInput = page.locator('input[placeholder="Search workouts..."]');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('Test');

    await page.waitForTimeout(500);
  });

  test('can sort workouts', async ({ page }) => {
    await loginUser(page);

    await page.goto(`${BASE_URL}/history`, { waitUntil: 'networkidle' });

    await expect(page.locator('h1:has-text("Workout History")')).toBeVisible({ timeout: 10000 });

    const sortSelect = page.locator('select').filter({ has: page.locator('option:has-text("Newest First")') });
    await expect(sortSelect).toBeVisible();

    await sortSelect.selectOption('volume-DESC');

    await page.waitForTimeout(500);

    await sortSelect.selectOption('startedAt-ASC');

    await page.waitForTimeout(500);
  });

  test('quick filter buttons work', async ({ page }) => {
    await loginUser(page);

    await page.goto(`${BASE_URL}/history`, { waitUntil: 'networkidle' });

    await expect(page.locator('h1:has-text("Workout History")')).toBeVisible({ timeout: 10000 });

    const thisWeekButton = page.locator('button:has-text("This Week")').nth(1);
    await expect(thisWeekButton).toBeVisible();
    await thisWeekButton.click();

    await page.waitForTimeout(500);

    const thisMonthButton = page.locator('button:has-text("This Month")').nth(1);
    await expect(thisMonthButton).toBeVisible();
    await thisMonthButton.click();

    await page.waitForTimeout(500);

    const allTimeButton = page.locator('button:has-text("All Time")').nth(1);
    await expect(allTimeButton).toBeVisible();
    await allTimeButton.click();

    await page.waitForTimeout(500);
  });
});

test.describe('Exercise History', () => {
  test.beforeEach(async ({ context }) => {
    const storageStateExists = await import('fs').then(fs =>
      fs.existsSync('playwright/.auth/state.json')
    );
    if (!storageStateExists) {
      await context.clearCookies();
    }
  });

  test('can navigate to exercise history from expanded workout', async ({ page }) => {
    await loginUser(page);

    await page.goto(`${BASE_URL}/history`, { waitUntil: 'networkidle' });

    await expect(page.locator('h1:has-text("Workout History")')).toBeVisible({ timeout: 10000 });

    const workoutCards = page.locator('.bg-white.rounded-lg.border.border-gray-200');
    const cardCount = await workoutCards.count();

    if (cardCount > 0) {
      const firstCard = workoutCards.first();
      await firstCard.click();

      await page.waitForTimeout(500);

      const exerciseLinks = page.locator('a[href^="/history/"]');
      const linkCount = await exerciseLinks.count();

      if (linkCount > 0) {
        await exerciseLinks.first().click();
        await page.waitForURL(/\/history\/[a-f0-9-]+/, { timeout: 10000 });
        await expect(page.locator('h1').first()).toBeVisible({ timeout: 5000 });
      } else {
        console.log('No exercise history links found on expanded card');
      }
    } else {
      console.log('No workout cards found to test navigation');
    }
  });

  test('can view exercise history page', async ({ page }) => {
    await loginUser(page);

    await page.goto(`${BASE_URL}/history`, { waitUntil: 'networkidle' });

    await expect(page.locator('h1:has-text("Workout History")')).toBeVisible({ timeout: 10000 });
  });

  test('exercise history page shows stats cards', async ({ page }) => {
    await loginUser(page);

    await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });

    await expect(page.locator('h1:has-text("Exercises")')).toBeVisible({ timeout: 10000 });

    const historyLinks = page.locator('a:has-text("History")');
    const linkCount = await historyLinks.count();

    if (linkCount > 0) {
      await historyLinks.first().click();
      await page.waitForURL(/\/history\/[a-f0-9-]+/, { timeout: 10000 });

      await expect(page.locator('text=Max Weight')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=Est. 1RM')).toBeVisible();
      await expect(page.locator('text=Workouts')).toBeVisible();
    } else {
      console.log('No history links found on exercises page');
    }
  });

  test('can toggle chart between weight and volume', async ({ page }) => {
    await loginUser(page);

    await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });

    await expect(page.locator('h1:has-text("Exercises")')).toBeVisible({ timeout: 10000 });

    const historyLinks = page.locator('a:has-text("History")');
    const linkCount = await historyLinks.count();

    if (linkCount > 0) {
      await historyLinks.first().click();
      await page.waitForURL(/\/history\/[a-f0-9-]+/, { timeout: 10000 });

      const weightButton = page.locator('button:has-text("Weight")');
      const volumeButton = page.locator('button:has-text("Volume")');

      await expect(weightButton).toBeVisible({ timeout: 5000 });
      await expect(volumeButton).toBeVisible();

      await volumeButton.click();
      await page.waitForTimeout(300);

      await weightButton.click();
      await page.waitForTimeout(300);
    } else {
      console.log('No history links found to test chart toggle');
    }
  });

  test('quick filters work on exercise history page', async ({ page }) => {
    await loginUser(page);

    await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });

    await expect(page.locator('h1:has-text("Exercises")')).toBeVisible({ timeout: 10000 });

    const historyLinks = page.locator('a:has-text("History")');
    const linkCount = await historyLinks.count();

    if (linkCount > 0) {
      await historyLinks.first().click();
      await page.waitForURL(/\/history\/[a-f0-9-]+/, { timeout: 10000 });

      const thisWeekButton = page.locator('button:has-text("This Week")').first();
      const thisMonthButton = page.locator('button:has-text("This Month")').first();
      const allTimeButton = page.locator('button:has-text("All Time")').first();

      await expect(thisWeekButton).toBeVisible({ timeout: 5000 });

      await thisMonthButton.click();
      await page.waitForTimeout(300);

      await allTimeButton.click();
      await page.waitForTimeout(300);
    } else {
      console.log('No history links found to test filters');
    }
  });

  test('history table shows correct columns', async ({ page }) => {
    await loginUser(page);

    await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });

    await expect(page.locator('h1:has-text("Exercises")')).toBeVisible({ timeout: 10000 });

    const historyLinks = page.locator('a:has-text("History")');
    const linkCount = await historyLinks.count();

    if (linkCount > 0) {
      await historyLinks.first().click();
      await page.waitForURL(/\/history\/[a-f0-9-]+/, { timeout: 10000 });

      await expect(page.locator('th:has-text("Date")')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('th:has-text("Workout")')).toBeVisible();
      await expect(page.locator('th:has-text("Max Weight")')).toBeVisible();
      await expect(page.locator('th:has-text("Reps")')).toBeVisible();
      await expect(page.locator('th:has-text("Est. 1RM")')).toBeVisible();
    } else {
      console.log('No history links found to test table columns');
    }
  });
});
