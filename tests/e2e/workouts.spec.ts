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
    let addedExerciseName = '';

    const exerciseButtons = page.locator('.fixed.inset-0 button').filter({ has: page.locator('h3') });
    const buttonCount = await exerciseButtons.count();

    if (buttonCount > 0) {
      for (let i = 0; i < buttonCount; i++) {
        const btn = exerciseButtons.nth(i);
        const text = await btn.textContent() ?? '';
        if (!text.includes('Added')) {
          await btn.click({ force: true });
          exerciseAdded = true;
          addedExerciseName = text.substring(0, 50);
          console.log('Added exercise:', addedExerciseName);
          break;
        }
      }
    }

    expect(exerciseAdded).toBe(true);

    const startButton = page.locator('button:has-text("Start Workout")');
    await expect(startButton).toBeVisible({ timeout: 5000 });
    await startButton.click({ force: true });

    await page.waitForURL(/\/workouts\/[a-f0-9-]+/, { timeout: 30000 });
    console.log('Workout created:', page.url());

    await expect(page.locator('text=Progressive Test Workout')).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${addedExerciseName}`).first()).toBeVisible({ timeout: 10000 });
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

  test('prepopulates sets and reps from previous workout', async ({ page }) => {
    await loginUser(page);

    await page.goto(`${BASE_URL}/workouts/new`, { waitUntil: 'networkidle' });

    const startBlankButton = page.locator('text=Start with blank workout').first();
    await expect(startBlankButton).toBeVisible();
    await startBlankButton.click();

    await expect(page.locator('text=Build Your Workout')).toBeVisible({ timeout: 10000 });

    const workoutNameInput = page.locator('input[id="name"]');
    await workoutNameInput.fill('Prepopulate Test Workout');

    const addExerciseButton = page.locator('text=Add Exercise').first();
    await expect(addExerciseButton).toBeVisible();
    await addExerciseButton.click();

    const exerciseSelectorModal = page.locator('.fixed.inset-0').filter({ has: page.locator('text=Add Exercise') });
    await expect(exerciseSelectorModal).toBeVisible({ timeout: 5000 });

    let exerciseAdded = false;
    let addedExerciseName = '';

    const exerciseButtons = page.locator('.fixed.inset-0 button').filter({ has: page.locator('h3') });
    const buttonCount = await exerciseButtons.count();

    if (buttonCount > 0) {
      for (let i = 0; i < buttonCount; i++) {
        const btn = exerciseButtons.nth(i);
        const text = await btn.textContent() ?? '';
        if (!text.includes('Added')) {
          await btn.click({ force: true });
          exerciseAdded = true;
          addedExerciseName = text.substring(0, 50);
          console.log('Added exercise:', addedExerciseName);
          break;
        }
      }
    }

    expect(exerciseAdded).toBe(true);

    const startButton = page.locator('button:has-text("Start Workout")');
    await expect(startButton).toBeVisible({ timeout: 5000 });
    await startButton.click({ force: true });

    await page.waitForURL(/\/workouts\/[a-f0-9-]+/, { timeout: 30000 });
    console.log('First workout created:', page.url());

    await expect(page.locator('text=Prepopulate Test Workout')).toBeVisible({ timeout: 10000 });

    const exerciseCard = page.locator('[class*="bg-white"][class*="rounded-lg"][class*="border"]').first();
    
    const exerciseHeader = exerciseCard.locator('.cursor-pointer');
    await expect(exerciseHeader).toBeVisible({ timeout: 5000 });
    await exerciseHeader.click({ force: true });

    await page.waitForTimeout(1000);

    const addSetButton = exerciseCard.locator('button:has-text("Add Set")');
    await expect(addSetButton).toBeVisible({ timeout: 5000 });

    await addSetButton.click();
    await addSetButton.click();
    await addSetButton.click();

    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(3);

    await rows.nth(0).locator('input[type="text"]').first().fill('100');
    await rows.nth(0).locator('input[type="text"]').nth(1).fill('5');

    await rows.nth(1).locator('input[type="text"]').first().fill('90');
    await rows.nth(1).locator('input[type="text"]').nth(1).fill('6');

    await rows.nth(2).locator('input[type="text"]').first().fill('80');
    await rows.nth(2).locator('input[type="text"]').nth(1).fill('8');

    const completeButton = page.locator('tbody tr').first().locator('button').first();
    await expect(completeButton).toBeVisible();
    await completeButton.click({ force: true });

    console.log('First set completed!');

    await page.locator('text=Complete Workout').click();
    await page.waitForTimeout(2000);

    await expect(page.locator('text=Workout Complete!').first()).toBeVisible({ timeout: 10000 });

    console.log('First workout completed!');

    await page.goto(`${BASE_URL}/workouts/new`, { waitUntil: 'networkidle' });

    const startBlankButton2 = page.locator('text=Start with blank workout').first();
    await expect(startBlankButton2).toBeVisible();
    await startBlankButton2.click();

    await expect(page.locator('text=Build Your Workout')).toBeVisible({ timeout: 10000 });

    const workoutNameInput2 = page.locator('input[id="name"]');
    await workoutNameInput2.fill('Second Prepopulate Test Workout');

    const addExerciseButton2 = page.locator('text=Add Exercise').first();
    await expect(addExerciseButton2).toBeVisible();
    await addExerciseButton2.click();

    await expect(page.locator('.fixed.inset-0').filter({ has: page.locator('text=Add Exercise') })).toBeVisible({ timeout: 5000 });

    const exerciseButtons2 = page.locator('.fixed.inset-0 button').filter({ has: page.locator('h3') });
    const buttonCount2 = await exerciseButtons2.count();

    if (buttonCount2 > 0) {
      for (let i = 0; i < buttonCount2; i++) {
        const btn = exerciseButtons2.nth(i);
        const text = await btn.textContent() ?? '';
        if (!text.includes('Added')) {
          await btn.click({ force: true });
          console.log('Added exercise for second workout:', text.substring(0, 50));
          break;
        }
      }
    }

    const startButton2 = page.locator('button:has-text("Start Workout")');
    await expect(startButton2).toBeVisible({ timeout: 5000 });
    await startButton2.click({ force: true });

    await page.waitForURL(/\/workouts\/[a-f0-9-]+/, { timeout: 30000 });
    console.log('Second workout created:', page.url());

    await expect(page.locator('text=Second Prepopulate Test Workout')).toBeVisible({ timeout: 10000 });

    const exerciseCard2 = page.locator('[class*="bg-white"][class*="rounded-lg"][class*="border"]').first();
    
    const exerciseHeader2 = exerciseCard2.locator('.cursor-pointer');
    await expect(exerciseHeader2).toBeVisible({ timeout: 5000 });
    await exerciseHeader2.click({ force: true });

    await page.waitForTimeout(1000);

    const setRows = page.locator('tbody tr');
    const rowCount = await setRows.count();

    console.log('Number of set rows found:', rowCount);

    expect(rowCount).toBe(3);

    const firstWeightInput = setRows.first().locator('input[type="text"]').first();
    const firstRepsInput = setRows.first().locator('input[type="text"]').nth(1);

    const weightValue1 = await firstWeightInput.inputValue();
    const repsValue1 = await firstRepsInput.inputValue();

    console.log('First set weight value:', weightValue1);
    console.log('First set reps value:', repsValue1);

    expect(weightValue1).toBe('100');
    expect(repsValue1).toBe('5');

    const secondWeightInput = setRows.nth(1).locator('input[type="text"]').first();
    const secondRepsInput = setRows.nth(1).locator('input[type="text"]').nth(1);

    const weightValue2 = await secondWeightInput.inputValue();
    const repsValue2 = await secondRepsInput.inputValue();

    console.log('Second set weight value:', weightValue2);
    console.log('Second set reps value:', repsValue2);

    expect(weightValue2).toBe('90');
    expect(repsValue2).toBe('6');

    const thirdWeightInput = setRows.nth(2).locator('input[type="text"]').first();
    const thirdRepsInput = setRows.nth(2).locator('input[type="text"]').nth(1);

    const weightValue3 = await thirdWeightInput.inputValue();
    const repsValue3 = await thirdRepsInput.inputValue();

    console.log('Third set weight value:', weightValue3);
    console.log('Third set reps value:', repsValue3);

    expect(weightValue3).toBe('80');
    expect(repsValue3).toBe('8');

    console.log('All 3 sets were prepopulated from previous workout!');

    const addSetButton2 = exerciseCard2.locator('button:has-text("Add Set")');
    await addSetButton2.click();

    const fourthRow = page.locator('tbody tr').nth(3);
    await expect(fourthRow).toBeVisible();
    await fourthRow.locator('input[type="text"]').first().fill('70');
    await fourthRow.locator('input[type="text"]').nth(1).fill('10');

    const completeButton2 = page.locator('tbody tr').first().locator('button').first();
    await completeButton2.click({ force: true });

    await page.locator('text=Complete Workout').click();
    await page.waitForTimeout(2000);

    await expect(page.locator('text=Workout Complete!').first()).toBeVisible({ timeout: 10000 });

    console.log('Second workout completed with 4 sets!');

    await page.goto(`${BASE_URL}/workouts/new`, { waitUntil: 'networkidle' });

    const startBlankButton3 = page.locator('text=Start with blank workout').first();
    await expect(startBlankButton3).toBeVisible();
    await startBlankButton3.click();

    await expect(page.locator('text=Build Your Workout')).toBeVisible({ timeout: 10000 });

    const workoutNameInput3 = page.locator('input[id="name"]');
    await workoutNameInput3.fill('Third Prepopulate Test Workout');

    const addExerciseButton3 = page.locator('text=Add Exercise').first();
    await expect(addExerciseButton3).toBeVisible();
    await addExerciseButton3.click();

    await expect(page.locator('.fixed.inset-0').filter({ has: page.locator('text=Add Exercise') })).toBeVisible({ timeout: 5000 });

    const exerciseButtons3 = page.locator('.fixed.inset-0 button').filter({ has: page.locator('h3') });
    const buttonCount3 = await exerciseButtons3.count();

    if (buttonCount3 > 0) {
      for (let i = 0; i < buttonCount3; i++) {
        const btn = exerciseButtons3.nth(i);
        const text = await btn.textContent() ?? '';
        if (!text.includes('Added')) {
          await btn.click({ force: true });
          console.log('Added exercise for third workout:', text.substring(0, 50));
          break;
        }
      }
    }

    const startButton3 = page.locator('button:has-text("Start Workout")');
    await expect(startButton3).toBeVisible({ timeout: 5000 });
    await startButton3.click({ force: true });

    await page.waitForURL(/\/workouts\/[a-f0-9-]+/, { timeout: 30000 });
    console.log('Third workout created:', page.url());

    await expect(page.locator('text=Third Prepopulate Test Workout')).toBeVisible({ timeout: 10000 });

    const exerciseCard3 = page.locator('[class*="bg-white"][class*="rounded-lg"][class*="border"]').first();
    
    const exerciseHeader3 = exerciseCard3.locator('.cursor-pointer');
    await expect(exerciseHeader3).toBeVisible({ timeout: 5000 });
    await exerciseHeader3.click({ force: true });

    await page.waitForTimeout(1000);

    const setRows3 = page.locator('tbody tr');
    const rowCount3 = await setRows3.count();

    console.log('Number of set rows found in third workout:', rowCount3);

    expect(rowCount3).toBe(4);

    console.log('All 4 sets were prepopulated from previous workout!');

    console.log('Prepopulate test completed successfully!');
  });
});
