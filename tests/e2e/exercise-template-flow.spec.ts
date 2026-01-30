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

  await page.waitForTimeout(3000);

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

async function deleteExercise(page: Page, exerciseName: string) {
  await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });
  const exerciseCard = page.locator(`text=${exerciseName}`).first();
  if (await exerciseCard.isVisible({ timeout: 5000 }).catch(() => false)) {
    await exerciseCard.click();
    await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });
    const deleteButton = page.locator('button:has-text("Delete")').first();
    await expect(deleteButton).toBeVisible({ timeout: 5000 });

    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await deleteButton.click({ force: true });

    await page.waitForURL(`${BASE_URL}/exercises`, { timeout: 10000 });
  }
}

async function deleteTemplate(page: Page, templateName: string) {
  await page.goto(`${BASE_URL}/templates`, { waitUntil: 'networkidle' });
  const templateCard = page.locator(`text=${templateName}`).first();
  if (await templateCard.isVisible({ timeout: 5000 }).catch(() => false)) {
    await templateCard.click();
    await page.waitForURL(/\/templates\/[a-zA-Z0-9-]+/, { timeout: 10000 });

    const deleteButton = page.locator('button:has-text("Delete")').first();
    await expect(deleteButton).toBeVisible({ timeout: 10000 });

    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await deleteButton.click({ force: true });

    await page.waitForURL(`${BASE_URL}/templates`, { timeout: 10000 });
  }
}

test.describe('Exercise → Template Full Flow', () => {
  test('create exercise, create template with exercise, then clean up', async ({ page }) => {
    await loginUser(page);

    const timestamp = Date.now();
    const exerciseName = `E2E Test Exercise ${timestamp}`;
    const templateName = `E2E Test Template ${timestamp}`;
    const description = 'Created during E2E test flow';

    await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });
    await expect(page.locator('h1:has-text("Exercises")').first()).toBeVisible({ timeout: 10000 });

    await page.locator('button:has-text("New")').first().click();
    await expect(page.locator('h2:has-text("Create Exercise")').first()).toBeVisible({ timeout: 5000 });

    await page.locator('input[placeholder="Exercise name"]').fill(exerciseName);
    await page.locator('select').first().selectOption('Chest');
    await page.locator('textarea').first().fill(description);

    const submitButton = page.locator('button:has-text("Create")').first();
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });

    await expect(page.locator(`h1:has-text("${exerciseName}")`).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=Chest`).first()).toBeVisible();
    await expect(page.locator(`text=${description}`).first()).toBeVisible();

    await page.goto(`${BASE_URL}/templates/new`, { waitUntil: 'networkidle' });
    await expect(page.locator('h1:has-text("Create Template")').first()).toBeVisible({ timeout: 10000 });

    await page.fill('input[id="name"]', templateName);

    const descriptionCollapsible = page.locator('button:has-text("Description (optional)")');
    if (await descriptionCollapsible.isVisible({ timeout: 2000 }).catch(() => false)) {
      await descriptionCollapsible.click();
      await page.waitForTimeout(500);
    }
    await page.fill('textarea[id="description"]', description);

    await page.click('button:has-text("Add Exercise")');
    await page.waitForSelector('.fixed.inset-0', { timeout: 10000 });

    const searchInput = page.locator('.fixed input[placeholder="Search exercises..."]');
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await searchInput.fill(exerciseName);

    const exerciseButton = page.getByRole('button', { name: exerciseName }).first();
    await expect(exerciseButton).toBeVisible({ timeout: 5000 });
    await page.evaluate(() => {
      const button = document.querySelector('button[data-tsd-source*="ExerciseSearch.tsx"]');
      if (button instanceof HTMLElement) {
        button.click();
      }
    });

    await page.click('button:has-text("Done")');
    await page.waitForSelector('.fixed.inset-0', { state: 'hidden', timeout: 5000 });

    await page.click('button:has-text("Create Template")');
    await page.waitForURL(/\/templates\/[a-zA-Z0-9-]+/, { timeout: 10000 });

    await expect(page.locator(`text=${templateName}`).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${description}`).first()).toBeVisible();
    await expect(page.locator(`text=${exerciseName}`).first()).toBeVisible();

    await deleteTemplate(page, templateName);
    await deleteExercise(page, exerciseName);
  });
});
