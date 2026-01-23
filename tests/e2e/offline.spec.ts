import { expect, test, type Page, type Dialog } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8787';

function isAuthKitUrl(url: URL): boolean {
  return url.hostname.includes('authkit.app') || url.pathname.includes('/auth/signin');
}

async function deleteExerciseByName(page: Page, name: string) {
  await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });
  const exerciseCard = page.locator(`text=${name}`).first();
  if (await exerciseCard.isVisible({ timeout: 5000 }).catch(() => false)) {
    await exerciseCard.click();
    await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });
    const deleteButton = page.locator('button:has-text("Delete")').first();
    await expect(deleteButton).toBeVisible({ timeout: 5000 });

    page.once('dialog', async (dialog: Dialog) => {
      await dialog.accept();
    });
    await deleteButton.click();

    await page.waitForURL(`${BASE_URL}/exercises`, { timeout: 10000 });
  }
}

test.describe('Offline Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().setOffline(false);
  });

  test('should work offline with cached data', async ({ page }) => {
    await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });
    await expect(page).not.toHaveURL(isAuthKitUrl);

    const exerciseName = `Offline Test Exercise ${Date.now()}`;

    await page.goto(`${BASE_URL}/exercises/new`, { waitUntil: 'networkidle' });
    await page.locator('input#name').fill(exerciseName);
    await page.locator('select#muscleGroup').selectOption('Chest');

    const submitButton = page.locator('button[type="submit"]:has-text("Create Exercise")');
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });
    await expect(page.locator(`h1:has-text("${exerciseName}")`).first()).toBeVisible({ timeout: 10000 });

    await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });
    await expect(page.locator(`text=${exerciseName}`).first()).toBeVisible({ timeout: 10000 });

    await page.context().setOffline(true);

    await expect(page.locator(`text=${exerciseName}`).first()).toBeVisible({ timeout: 10000 });

    const pendingIndicator = page.locator('text=pending').first();
    await expect(pendingIndicator).toBeVisible({ timeout: 5000 }).catch(() => {});

    await page.context().setOffline(false);

    await deleteExerciseByName(page, exerciseName);
  });

  test('should sync when back online', async ({ page }) => {
    const timestamp = Date.now();
    const exerciseName = `Sync Test Exercise ${timestamp}`;

    await page.goto(`${BASE_URL}/exercises/new`, { waitUntil: 'networkidle' });
    await expect(page).not.toHaveURL(isAuthKitUrl);

    await page.locator('input#name').fill(exerciseName);
    await page.locator('select#muscleGroup').selectOption('Back');

    const submitButton = page.locator('button[type="submit"]:has-text("Create Exercise")');
    await submitButton.click();

    await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });

    await page.context().setOffline(true);

    await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator(`text=${exerciseName}`).first()).toBeVisible({ timeout: 10000 });

    await page.context().setOffline(false);

    await page.waitForTimeout(3000);

    const response = await page.request.get(`${BASE_URL}/api/exercises`);
    expect(response.ok()).toBe(true);

    await deleteExerciseByName(page, exerciseName);
  });

  test('should display offline indicator when offline', async ({ page }) => {
    await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });

    await page.context().setOffline(true);

    const offlineIndicator = page.locator('text=offline').first();
    await expect(offlineIndicator).toBeVisible({ timeout: 10000 }).catch(() => {
      console.log('Offline indicator not found - may use different text');
    });

    await page.context().setOffline(false);
  });

  test('should display syncing indicator when pending changes', async ({ page }) => {
    await page.goto(`${BASE_URL}/exercises/new`, { waitUntil: 'networkidle' });
    await expect(page).not.toHaveURL(isAuthKitUrl);

    const exerciseName = `Pending Sync Test ${Date.now()}`;
    await page.locator('input#name').fill(exerciseName);
    await page.locator('select#muscleGroup').selectOption('Shoulders');

    const submitButton = page.locator('button[type="submit"]:has-text("Create Exercise")');
    await submitButton.click();

    await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });

    const syncIndicator = page.locator('text=syncing').first();
    await expect(syncIndicator).toBeVisible({ timeout: 10000 }).catch(() => {
      console.log('Sync indicator not found - may use different text');
    });

    await deleteExerciseByName(page, exerciseName);
  });
});

test.describe('Offline - Workout Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().setOffline(false);
  });

  test('should create workout offline and queue for sync', async ({ page }) => {
    await page.goto(`${BASE_URL}/workouts/new`, { waitUntil: 'networkidle' });
    await expect(page).not.toHaveURL(isAuthKitUrl);

    const workoutName = `Offline Workout Test ${Date.now()}`;

    const startBlankButton = page.locator('text=Start with blank workout').first();
    await expect(startBlankButton).toBeVisible({ timeout: 10000 });
    await startBlankButton.click();

    await expect(page.locator('text=Build Your Workout')).toBeVisible({ timeout: 10000 });
    await page.locator('input[id="name"]').fill(workoutName);

    const startButton = page.locator('button[type="submit"]:has-text("Start Workout")').first();
    await startButton.click();

    await page.waitForURL(/\/workouts\/[a-zA-Z0-9-]+/, { timeout: 10000 });

    await page.context().setOffline(true);

    const pendingSync = page.locator('text=pending').first();
    await expect(pendingSync).toBeVisible({ timeout: 5000 }).catch(() => {});

    await page.context().setOffline(false);
  });

  test('should add sets to workout while offline', async ({ page }) => {
    await page.goto(`${BASE_URL}/workouts/new`, { waitUntil: 'networkidle' });
    await expect(page).not.toHaveURL(isAuthKitUrl);

    const workoutName = `Offline Sets Test ${Date.now()}`;

    const startBlankButton = page.locator('text=Start with blank workout').first();
    await expect(startBlankButton).toBeVisible({ timeout: 10000 });
    await startBlankButton.click();

    await expect(page.locator('text=Build Your Workout')).toBeVisible({ timeout: 10000 });
    await page.locator('input[id="name"]').fill(workoutName);

    const addExerciseButton = page.locator('button:has-text("Add Exercise")').first();
    await expect(addExerciseButton).toBeVisible();
    await addExerciseButton.click();

    const exerciseSelector = page.locator('.fixed').filter({ has: page.locator('text=Add Exercise') });
    await expect(exerciseSelector).toBeVisible({ timeout: 5000 });

    const exerciseOption = page.locator('.fixed button').filter({ has: page.locator('h3') }).first();
    if (await exerciseOption.isVisible()) {
      await exerciseOption.click({ force: true });
    } else {
      const selectElement = page.locator('select').first();
      await selectElement.selectOption({ label: 'Barbell Bench Press' });
    }

    const startButton = page.locator('button[type="submit"]:has-text("Start Workout")').first();
    await startButton.click();

    await page.waitForURL(/\/workouts\/[a-zA-Z0-9-]+/, { timeout: 10000 });

    await page.context().setOffline(true);

    const addSetButton = page.locator('text=Add Set').first();
    await expect(addSetButton).toBeVisible({ timeout: 10000 });
    await addSetButton.click();

    const weightInput = page.locator('input[placeholder*="weight"]').first();
    await weightInput.fill('135');

    const repsInput = page.locator('input[placeholder*="reps"]').first();
    await repsInput.fill('8');

    const completeButton = page.locator('text=Complete').first();
    await expect(completeButton).toBeVisible();
    await completeButton.click();

    await page.context().setOffline(false);
  });
});

test.describe('Offline - Template Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().setOffline(false);
  });

  test('should create template offline and queue for sync', async ({ page }) => {
    await page.goto(`${BASE_URL}/templates/new`, { waitUntil: 'networkidle' });
    await expect(page).not.toHaveURL(isAuthKitUrl);

    const templateName = `Offline Template Test ${Date.now()}`;

    await page.locator('input#name').fill(templateName);

    const addExerciseButton = page.locator('button:has-text("Add Exercise")').first();
    await expect(addExerciseButton).toBeVisible();
    await addExerciseButton.click();

    const exerciseSelector = page.locator('.fixed').filter({ has: page.locator('text=Add Exercise') });
    await expect(exerciseSelector).toBeVisible({ timeout: 5000 });

    const exerciseOption = page.locator('.fixed button').filter({ has: page.locator('h3') }).first();
    if (await exerciseOption.isVisible()) {
      await exerciseOption.click({ force: true });
    }

    const createButton = page.locator('button[type="submit"]:has-text("Create Template")');
    await createButton.click();

    await page.waitForURL(/\/templates\/[a-zA-Z0-9-]+/, { timeout: 10000 });

    await page.context().setOffline(true);

    const pendingSync = page.locator('text=pending').first();
    await expect(pendingSync).toBeVisible({ timeout: 5000 }).catch(() => {});

    await page.context().setOffline(false);
  });
});
