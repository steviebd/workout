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

test.describe('Templates E2E Tests', () => {
  test('should redirect to sign in when not authenticated', async ({ page, context }) => {
    const authResponse = await page.request.get(`${BASE_URL}/api/auth/me`);
    if (authResponse.ok()) {
      await context.clearCookies();
      const newPage = await context.newPage();
      await newPage.goto(`${BASE_URL}/templates`, { waitUntil: 'networkidle' });
      await expect(newPage).toHaveURL(isAuthKitUrl);
      return;
    }

    await page.goto(`${BASE_URL}/templates`, { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(isAuthKitUrl);
  });

  test('should create and display a new template', async ({ page }) => {
    await loginUser(page);

    const templateName = `Test Template ${Date.now()}`;
    const description = 'A test template description';

    await page.goto(`${BASE_URL}/templates/new`, { waitUntil: 'networkidle' });
    await expect(page.locator('h1:has-text("Create Template")').first()).toBeVisible({ timeout: 10000 });

    await page.fill('input[id="name"]', templateName);
    await page.fill('textarea[id="description"]', description);

    await page.click('button:has-text("Add Exercise")');
    await page.waitForSelector('.fixed.inset-0', { timeout: 10000 });

    const exerciseButton = page.locator('.fixed.inset-0 button').filter({ has: page.locator('h3') }).first();
    await expect(exerciseButton).toBeVisible({ timeout: 5000 });
    await exerciseButton.click({ force: true });

    await page.click('button:has-text("Create Template")');
    await page.waitForURL(/\/templates\/[a-zA-Z0-9-]+/, { timeout: 10000 });

    await expect(page.locator(`text=${templateName}`).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${description}`).first()).toBeVisible();
  });

  test('should update template name', async ({ page }) => {

    await loginUser(page);

    const timestamp = Date.now();
    const originalName = `Template to Update ${timestamp}`;
    const updatedName = `Updated Template ${timestamp}`;

    await page.goto(`${BASE_URL}/templates/new`, { waitUntil: 'networkidle' });
    await page.fill('input[id="name"]', originalName);
    
    await page.click('button:has-text("Add Exercise")');
    await page.waitForSelector('.fixed.inset-0', { timeout: 10000 });
    const exerciseButton = page.locator('.fixed.inset-0 button').filter({ has: page.locator('h3') }).first();
    await exerciseButton.click({ force: true });
    await page.waitForTimeout(1500);

    await page.click('button:has-text("Create Template")');
    await page.waitForURL(/\/templates\/[a-zA-Z0-9-]+/, { timeout: 15000 });

    await expect(page.locator(`text=${originalName}`).first()).toBeVisible({ timeout: 10000 });

    const editLink = page.locator('a:has-text("Edit")').first();
    await expect(editLink).toBeVisible({ timeout: 10000 });
    await editLink.click();
    await page.waitForURL(/\/templates\/.*\/edit/, { timeout: 10000 });

    await page.fill('input[id="name"]', updatedName);
    await page.click('button:has-text("Save Changes")');
    await page.waitForURL(/\/templates\//, { timeout: 10000 });

    await expect(page.locator(`text=${updatedName}`).first()).toBeVisible({ timeout: 10000 });
  });

  test('should copy a template', async ({ page }) => {
    await loginUser(page);

    const timestamp = Date.now();
    const templateName = `Template to Copy ${timestamp}`;

    await page.goto(`${BASE_URL}/templates/new`, { waitUntil: 'networkidle' });
    await page.fill('input[id="name"]', templateName);
    
    await page.click('button:has-text("Add Exercise")');
    await page.waitForSelector('.fixed.inset-0', { timeout: 10000 });
    const exerciseButton = page.locator('.fixed.inset-0 button').filter({ has: page.locator('h3') }).first();
    await exerciseButton.click({ force: true });

    await page.click('button:has-text("Create Template")');
    await page.waitForURL(/\/templates\/[a-zA-Z0-9-]+/, { timeout: 10000 });

    await expect(page.locator(`text=${templateName}`).first()).toBeVisible({ timeout: 10000 });

    await page.click('button:has-text("Copy")');
    await page.waitForURL(/\/templates\//, { timeout: 10000 });

    await expect(page.locator(`text=${templateName} (Copy)`).first()).toBeVisible({ timeout: 10000 });
  });

  test('should delete a template', async ({ page }) => {
    await loginUser(page);

    const timestamp = Date.now();
    const templateName = `Template to Delete ${timestamp}`;

    await page.goto(`${BASE_URL}/templates/new`, { waitUntil: 'networkidle' });
    await page.fill('input[id="name"]', templateName);
    
    await page.click('button:has-text("Add Exercise")');
    await page.waitForSelector('.fixed.inset-0', { timeout: 10000 });
    const exerciseButton = page.locator('.fixed.inset-0 button').filter({ has: page.locator('h3') }).first();
    await exerciseButton.click({ force: true });

    await page.click('button:has-text("Create Template")');
    await page.waitForURL(/\/templates\/[a-zA-Z0-9-]+/, { timeout: 10000 });

    await expect(page.locator(`text=${templateName}`).first()).toBeVisible({ timeout: 10000 });

    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    const deleteButton = page.locator('button:has-text("Delete")').first();
    await expect(deleteButton).toBeVisible({ timeout: 10000 });
    await deleteButton.click();

    await page.waitForURL(`${BASE_URL}/templates`, { timeout: 10000 });
  });

  test('should add multiple exercises to template', async ({ page }) => {

    await loginUser(page);

    const timestamp = Date.now();
    await page.goto(`${BASE_URL}/templates/new`, { waitUntil: 'networkidle' });
    await page.fill('input[id="name"]', `Multi Exercise Template ${timestamp}`);

    await page.click('button:has-text("Add Exercise")');
    await page.waitForSelector('.fixed.inset-0', { timeout: 10000 });

    const benchPressButton = page.locator('.fixed.inset-0 button').filter({ has: page.locator('h3') }).first();
    await benchPressButton.click({ force: true });
    await page.waitForTimeout(1500);

    await page.click('button:has-text("Add Exercise")', { timeout: 5000 });
    await page.waitForSelector('.fixed.inset-0', { timeout: 5000 });

    const searchInput = page.locator('.fixed.inset-0 input[placeholder="Search exercises..."]');
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await searchInput.fill('Squat');
    await page.waitForTimeout(500);

    const squatButtons = page.locator('.fixed.inset-0 button').filter({ has: page.locator('h3') });
    const squatCount = await squatButtons.count();
    
    if (squatCount > 0) {
      await squatButtons.first().click({ force: true });
      await page.waitForTimeout(1500);
    }

    await page.locator('button[type="submit"]:has-text("Create Template")').click({ timeout: 10000 });
    await page.waitForURL(/\/templates\//, { timeout: 15000 });
  });
});
