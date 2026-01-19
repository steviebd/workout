import { expect, test } from '@playwright/test';

test.describe('Templates E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/signin');
  });

  test('should redirect to sign in when not authenticated', async ({ page }) => {
    await page.goto('/templates');
    await expect(page).toHaveURL(/.*signin/);
  });

  test('should create a new template with exercises', async ({ page }) => {
    await page.goto('/auth/signin');

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('/');
    await page.click('text=Templates');
    await page.waitForURL('/templates');

    await page.click('text=New Template');

    await page.fill('input[id="name"]', 'Test Template');
    await page.fill('textarea[id="description"]', 'A test template description');
    await page.fill('textarea[id="notes"]', 'Some notes for the template');

    await page.click('text=Add Exercise');
    await page.waitForSelector('.bg-white.rounded-xl');

    const exerciseButton = page.locator('.bg-white.rounded-xl button').first();
    await exerciseButton.click();

    await page.click('button:has-text("Create Template")');

    await page.waitForURL(/\/templates\//);
  });

  test('should display template details', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('/');
    await page.click('text=Templates');

    await page.waitForSelector('text=Test Template');
    await page.click('text=Test Template');

    await page.waitForSelector('h1:has-text("Test Template")');
    await page.waitForSelector('text=A test template description');
  });

  test('should update template details', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('/');
    await page.click('text=Templates');

    await page.waitForSelector('text=Test Template');
    await page.click('text=Test Template');

    await page.waitForSelector('h1:has-text("Test Template")');
    await page.click('text=Edit');

    await page.fill('input[id="name"]', 'Updated Template Name');
    await page.click('button:has-text("Save Changes")');

    await page.waitForURL(/\/templates\//);
    await page.waitForSelector('h1:has-text("Updated Template Name")');
  });

  test('should create a copy of the template', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('/');
    await page.click('text=Templates');

    await page.waitForSelector('text=Test Template');
    await page.click('text=Test Template');

    await page.waitForSelector('h1:has-text("Updated Template Name")');
    await page.click('button:has-text("Copy")');

    await page.waitForURL(/\/templates\//);
    await page.waitForSelector('h1:has-text("Updated Template Name (Copy)")');
  });

  test('should remove the template from the list', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('/');
    await page.click('text=Templates');

    const templateCard = page.locator('text=Test Template').first();
    await templateCard.hover();

    await page.click('.bg-white.rounded-lg >> button[title="Delete template"]');

    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    await page.waitForTimeout(500);

    await expect(page.locator('text=Test Template')).not.toBeVisible();
  });

  test('should add and remove exercises', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('/');
    await page.click('text=Templates');
    await page.click('text=New Template');

    await page.fill('input[id="name"]', 'Exercise Management Test');
    await page.click('text=Add Exercise');

    const exerciseModal = page.locator('.bg-white.rounded-xl');
    await expect(exerciseModal).toBeVisible();

    const exerciseButtons = page.locator('.bg-white.rounded-xl button:has-text("Bench Press")');
    await exerciseButtons.first().click();

    await page.waitForSelector('.bg-gray-50:has-text("Bench Press")');

    await page.click('text=Add Exercise');
    await page.waitForSelector('.bg-white.rounded-xl');

    await page.fill('input[placeholder="Search exercises..."]', 'Squat');
    await page.waitForTimeout(300);

    const squatButton = page.locator('.bg-white.rounded-xl button:has-text("Squats")');
    await squatButton.first().click();

    await page.waitForSelector('.bg-gray-50:has-text("Squats")');

    await page.click('.bg-gray-50:has-text("Bench Press") >> button >> nth=2');
    await page.waitForTimeout(300);

    await expect(page.locator('.bg-gray-50:has-text("Bench Press")')).not.toBeVisible();

    await page.click('button:has-text("Create Template")');
    await page.waitForURL(/\/templates\//);
  });

  test('should reorder exercises', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('/');
    await page.click('text=Templates');

    await page.waitForSelector('text=Exercise Management Test');
    await page.click('text=Exercise Management Test');

    await page.waitForSelector('h1:has-text("Exercise Management Test")');
    await page.click('text=Edit');

    await page.waitForSelector('.bg-gray-50:has-text("Squats")');

    const squatsCard = page.locator('.bg-gray-50:has-text("Squats")');
    await squatsCard.hover();

    const downButton = squatsCard.locator('button >> nth=1');
    await downButton.click();

    await page.click('button:has-text("Save Changes")');

    await page.waitForURL(/\/templates\//);
  });
});
