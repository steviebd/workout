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

async function loginUser(page: any) {
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

test.describe('Workout Flow', () => {
  test.beforeEach(async ({ context }) => {
    const storageStateExists = await import('fs').then(fs => 
      fs.existsSync('playwright/.auth/state.json')
    );
    if (!storageStateExists) {
      await context.clearCookies();
    }
  });

  test('can create a workout with exercises', async ({ page }) => {
    await loginUser(page);

    await page.goto(`${BASE_URL}/workouts/new`, { waitUntil: 'networkidle' });

    const startBlankButton = page.locator('text=Start with blank workout').first();
    await expect(startBlankButton).toBeVisible();
    await startBlankButton.click();

    await expect(page.locator('text=Build Your Workout')).toBeVisible({ timeout: 10000 });

    const workoutNameInput = page.locator('input[id="name"]');
    await workoutNameInput.fill('Progressive Test Workout');

    const addExerciseButton = page.locator('text=Add Exercise').first();
    await expect(addExerciseButton).toBeVisible();
    await addExerciseButton.click();

    const exerciseSelectorModal = page.locator('.fixed.inset-0').filter({ has: page.locator('text=Add Exercise') });
    await expect(exerciseSelectorModal).toBeVisible({ timeout: 5000 });

    let exerciseAdded = false;
    const buttons = await page.locator('.fixed.inset-0 button').all();
    
    for (const btn of buttons) {
      const text = await btn.textContent();
      if (text && text.includes('Barbell') && !text.includes('Added')) {
        await btn.click({ force: true });
        exerciseAdded = true;
        console.log('Added exercise:', text.substring(0, 50));
        break;
      }
    }

    expect(exerciseAdded).toBe(true);

    const startButton = page.locator('button:has-text("Start Workout")');
    await expect(startButton).toBeVisible({ timeout: 5000 });
    await startButton.click({ force: true });

    await page.waitForURL(/\/workouts\/[a-f0-9-]+/, { timeout: 30000 });
    console.log('Workout created:', page.url());

    await expect(page.locator('text=Progressive Test Workout')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Barbell')).toBeVisible({ timeout: 10000 });
    console.log('Workout page loaded successfully!');

    const exerciseCard = page.locator('[class*="bg-white"][class*="rounded-lg"][class*="border"]').first();
    
    const exerciseHeader = exerciseCard.locator('.cursor-pointer');
    await expect(exerciseHeader).toBeVisible({ timeout: 5000 });
    await exerciseHeader.click({ force: true });

    await page.waitForTimeout(1000);

    const addSetButton = exerciseCard.locator('button:has-text("Add Set")');
    const isAddSetVisible = await addSetButton.isVisible();
    console.log('Add Set visible in exercise card:', isAddSetVisible);
    
    if (!isAddSetVisible) {
      console.log('Clicking on exercise name...');
      const exerciseName = exerciseCard.locator('p.font-medium').first();
      await exerciseName.click({ force: true });
      await page.waitForTimeout(1000);
    }

    await expect(addSetButton).toBeVisible({ timeout: 5000 });
    await addSetButton.click();

    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible();

    await rows.first().locator('input[type="text"]').first().fill('100');
    await rows.first().locator('input[type="text"]').nth(1).fill('5');

    const completeButton = page.locator('tbody tr').first().locator('button').first();
    await expect(completeButton).toBeVisible();
    await completeButton.click({ force: true });

    console.log('Set completed!');

    await page.locator('text=Complete Workout').click();

    await page.waitForTimeout(2000);

    console.log('Current URL after Complete Workout:', page.url());

    const pageContent = await page.content();
    console.log('Page contains Continue:', pageContent.includes('Continue'));
    console.log('Page contains incomplete:', pageContent.toLowerCase().includes('incomplete'));

    const summaryContent = await page.evaluate(() => document.body.innerText);
    console.log('Summary page text sample:', summaryContent.substring(0, 500));

    await expect(page.locator('text=Workout Complete!').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Progressive Test Workout').first()).toBeVisible();
    await expect(page.locator('text=100kg').first()).toBeVisible();
    await expect(page.locator('text=5').first()).toBeVisible();
    console.log('Test completed successfully!');
  });
});
