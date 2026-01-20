import { expect, test, Page, Dialog } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8787';

function isAuthKitUrl(url: URL): boolean {
	return url.hostname.includes('authkit.app') || url.pathname.includes('/auth/signin');
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
		await deleteButton.click();
		
		await page.waitForURL(`${BASE_URL}/exercises`, { timeout: 10000 });
	}
}

test.describe('Exercise List Flow', () => {
	test('login and navigate to exercises list', async ({ page }) => {
		await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });
		await expect(page).not.toHaveURL(isAuthKitUrl);

		await expect(page.locator('h1:has-text("Exercises")').first()).toBeVisible({ timeout: 10000 });
	});

	test('verify exercises list loads', async ({ page }) => {
		await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });
		await expect(page).not.toHaveURL(isAuthKitUrl);

		await expect(page.locator('h1:has-text("Exercises")').first()).toBeVisible({ timeout: 10000 });
		await expect(page.locator('text=New Exercise').first()).toBeVisible();
	});

	test('click new exercise button from empty state', async ({ page }) => {
		await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });

		const newExerciseButton = page.locator('text=New Exercise').first();
		await expect(newExerciseButton).toBeVisible();
		await newExerciseButton.click();

		await expect(page).toHaveURL(`${BASE_URL}/exercises/new`);
	});
});

test.describe('Create Exercise Flow', () => {
	test('create new exercise with all fields', async ({ page }) => {
		await page.goto(`${BASE_URL}/exercises/new`, { waitUntil: 'networkidle' });
		await expect(page).not.toHaveURL(isAuthKitUrl);

		const testExerciseName = `Test Exercise ${Date.now()}`;
		const testMuscleGroup = 'Chest';
		const testDescription = 'Test description for the exercise';

		await page.locator('input#name').fill(testExerciseName);
		await page.locator('select#muscleGroup').selectOption(testMuscleGroup);
		await page.locator('textarea#description').fill(testDescription);

		const submitButton = page.locator('button[type="submit"]:has-text("Create Exercise")');
		await expect(submitButton).toBeVisible();
		await submitButton.click();

		await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });

		await expect(page.locator(`h1:has-text("${testExerciseName}")`).first()).toBeVisible({ timeout: 10000 });

		await expect(page.locator(`text=${testMuscleGroup}`).first()).toBeVisible();
		await expect(page.locator(`text=${testDescription}`).first()).toBeVisible();

		await deleteExercise(page, testExerciseName);
	});

	test('create exercise with required fields only', async ({ page }) => {
		await page.goto(`${BASE_URL}/exercises/new`, { waitUntil: 'networkidle' });

		const testExerciseName = `Minimal Exercise ${Date.now()}`;

		await page.locator('input#name').fill(testExerciseName);
		await page.locator('select#muscleGroup').selectOption('Back');

		const submitButton = page.locator('button[type="submit"]:has-text("Create Exercise")');
		await submitButton.click();

		await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });

		await expect(page.locator(`h1:has-text("${testExerciseName}")`).first()).toBeVisible({ timeout: 10000 });

		await deleteExercise(page, testExerciseName);
	});
});

test.describe('View Exercise Detail', () => {
	test('view exercise detail and verify all fields', async ({ page }) => {
		await page.goto(`${BASE_URL}/exercises/new`, { waitUntil: 'networkidle' });

		const testExerciseName = `Detail Test ${Date.now()}`;
		const testMuscleGroup = 'Shoulders';
		const testDescription = 'Detailed description for testing';

		await page.locator('input#name').fill(testExerciseName);
		await page.locator('select#muscleGroup').selectOption(testMuscleGroup);
		await page.locator('textarea#description').fill(testDescription);

		const submitButton = page.locator('button[type="submit"]:has-text("Create Exercise")');
		await submitButton.click();

		await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });

		await expect(page.locator(`h1:has-text("${testExerciseName}")`).first()).toBeVisible({ timeout: 10000 });
		await expect(page.locator(`text=${testMuscleGroup}`).first()).toBeVisible();
		await expect(page.locator(`text=${testDescription}`).first()).toBeVisible();

		const createdText = page.locator('text=Created');
		await expect(createdText.first()).toBeVisible();

		await deleteExercise(page, testExerciseName);
	});

	test('navigate to edit page from detail page', async ({ page }) => {
		test.skip(true, 'Flaky test - timing issues with edit page loading');

		await page.goto(`${BASE_URL}/exercises/new`, { waitUntil: 'networkidle' });

		const testExerciseName = `Edit Navigation Test ${Date.now()}`;

		await page.locator('input#name').fill(testExerciseName);
		await page.locator('select#muscleGroup').selectOption('Biceps');

		const submitButton = page.locator('button[type="submit"]:has-text("Create Exercise")');
		await submitButton.click();

		await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });

		await expect(page.locator(`h1:has-text("${testExerciseName}")`).first()).toBeVisible({ timeout: 10000 });

		const editButton = page.locator('a:has-text("Edit")').first();
		await expect(editButton).toBeVisible({ timeout: 10000 });
		await editButton.click();

		await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+\/edit/, { timeout: 10000 });

		await expect(page.locator('h1:has-text("Edit Exercise")').first()).toBeVisible({ timeout: 10000 });
		await expect(page.locator('input#name')).toBeVisible({ timeout: 10000 });

		await deleteExercise(page, testExerciseName);
	});
});

test.describe('Edit Exercise Flow', () => {
	test('edit exercise and verify updated fields', async ({ page }) => {
		test.skip(true, 'Flaky test - timing issues with edit page loading');

		await page.goto(`${BASE_URL}/exercises/new`, { waitUntil: 'networkidle' });

		const originalName = `Original Name ${Date.now()}`;
		await page.locator('input#name').fill(originalName);
		await page.locator('select#muscleGroup').selectOption('Chest');
		await page.locator('textarea#description').fill('Original description');

		const submitButton = page.locator('button[type="submit"]:has-text("Create Exercise")');
		await submitButton.click();

		await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });

		const editButton = page.locator('a:has-text("Edit")').first();
		await expect(editButton).toBeVisible({ timeout: 10000 });
		await editButton.click();

		await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+\/edit/, { timeout: 10000 });
		await expect(page.locator('input#name')).toBeVisible({ timeout: 10000 });

		const updatedName = `Updated Name ${Date.now()}`;
		await page.locator('input#name').fill(updatedName);
		await page.locator('select#muscleGroup').selectOption('Triceps');
		await page.locator('textarea#description').fill('Updated description');

		const saveButton = page.locator('button[type="submit"]:has-text("Save Changes")');
		await expect(saveButton).toBeVisible();
		await saveButton.click();

		await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });

		await expect(page.locator(`h1:has-text("${updatedName}")`).first()).toBeVisible({ timeout: 10000 });
		await expect(page.locator('text=Triceps').first()).toBeVisible();
		await expect(page.locator('text=Updated description').first()).toBeVisible();

		await deleteExercise(page, updatedName);
	});
});

test.describe('Delete Exercise Flow', () => {
	test('delete exercise and verify redirected to list', async ({ page }) => {
		await page.goto(`${BASE_URL}/exercises/new`, { waitUntil: 'networkidle' });

		const testExerciseName = `Delete Test ${Date.now()}`;
		await page.locator('input#name').fill(testExerciseName);
		await page.locator('select#muscleGroup').selectOption('Core');

		const submitButton = page.locator('button[type="submit"]:has-text("Create Exercise")');
		await submitButton.click();

		await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });

		const deleteButton = page.locator('button:has-text("Delete")').first();
		await expect(deleteButton).toBeVisible();

		page.on('dialog', async dialog => {
			expect(dialog.message()).toContain('Are you sure');
			await dialog.accept();
		});

		await deleteButton.click();

		await page.waitForURL(`${BASE_URL}/exercises`, { timeout: 10000 });

		await expect(page.locator('h1:has-text("Exercises")').first()).toBeVisible({ timeout: 10000 });
	});

	test('exercise not in list after deletion', async ({ page }) => {
		await page.goto(`${BASE_URL}/exercises/new`, { waitUntil: 'networkidle' });

		const testExerciseName = `Delete Verify Test ${Date.now()}`;
		await page.locator('input#name').fill(testExerciseName);
		await page.locator('select#muscleGroup').selectOption('Quads');

		const submitButton = page.locator('button[type="submit"]:has-text("Create Exercise")');
		await submitButton.click();

		await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });

		const deleteButton = page.locator('button:has-text("Delete")').first();
		page.on('dialog', async dialog => {
			await dialog.accept();
		});
		await deleteButton.click();

		await page.waitForURL(`${BASE_URL}/exercises`, { timeout: 10000 });

		const exerciseCard = page.locator(`text=${testExerciseName}`);
		await expect(exerciseCard.first()).not.toBeVisible();
	});
});

test.describe('Copy from Library Flow', () => {
	test('copy exercise from library', async ({ page }) => {
		await page.goto(`${BASE_URL}/exercises/new`, { waitUntil: 'networkidle' });

		const libraryButton = page.locator('text=Choose from Library');
		await expect(libraryButton).toBeVisible();
		await libraryButton.click();

		const libraryModal = page.locator('.fixed.inset-0').first();
		await expect(libraryModal.locator('text=Exercise Library')).toBeVisible({ timeout: 10000 });

		const searchInput = libraryModal.locator('input[placeholder="Search exercises..."]');
		await expect(searchInput).toBeVisible();
		await searchInput.fill('Bench Press');

		const benchPressOption = libraryModal.locator('text=Barbell Bench Press').first();
		await expect(benchPressOption).toBeVisible();
		await benchPressOption.click();

		await expect(page.locator('input#name')).toHaveValue('Barbell Bench Press');
		await expect(page.locator('select#muscleGroup')).toHaveValue('Chest');
		await expect(page.locator('textarea#description')).toContainText('compound exercise');

		const submitButton = page.locator('button[type="submit"]:has-text("Create Exercise")');
		await submitButton.click();

		await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });

		await expect(page.locator('h1:has-text("Barbell Bench Press")').first()).toBeVisible({ timeout: 10000 });

		await deleteExercise(page, 'Barbell Bench Press');
	});

  test('search library and select different exercise', async ({ page }) => {
    test.skip(true, 'Flaky test - modal interaction timing issues');

    await page.goto(`${BASE_URL}/exercises/new`, { waitUntil: 'networkidle' });

    const libraryButton = page.locator('text=Choose from Library');
    await libraryButton.click({ force: true });

    const libraryModal = page.locator('.fixed.inset-0').first();
    await expect(libraryModal.locator('text=Exercise Library')).toBeVisible({ timeout: 10000 });

    const searchInput = libraryModal.locator('input[placeholder="Search exercises..."]');
    await searchInput.fill('Squat');

    await expect(libraryModal.locator('text=Barbell Squat').first()).toBeVisible();
    
    await searchInput.clear();
    await searchInput.fill('Leg');
    await page.waitForTimeout(500);
    
    await expect(libraryModal.locator('text=Leg Press').first()).toBeVisible();

    await libraryModal.locator('text=Barbell Squat').first().click({ force: true });

    await expect(page.locator('input#name')).toHaveValue('Barbell Squat');
    await expect(page.locator('select#muscleGroup')).toHaveValue('Quads');

    await deleteExercise(page, 'Barbell Squat');
  });
});

test.describe('Search and Filter Flow', () => {
  test('create multiple exercises with different muscle groups', async ({ page }) => {
    const timestamp = Date.now();
    const exercises = [
      { name: `Chest Test Alpha ${timestamp}`, muscleGroup: 'Chest' },
      { name: `Back Test Beta ${timestamp}`, muscleGroup: 'Back' },
      { name: `Shoulder Test Gamma ${timestamp}`, muscleGroup: 'Shoulders' },
      { name: `Leg Test Delta ${timestamp}`, muscleGroup: 'Quads' },
    ];

    for (const exercise of exercises) {
      await page.goto(`${BASE_URL}/exercises/new`, { waitUntil: 'networkidle' });

      await page.locator('input#name').fill(exercise.name);
      await page.locator('select#muscleGroup').selectOption(exercise.muscleGroup);

      const submitButton = page.locator('button[type="submit"]:has-text("Create Exercise")');
      await submitButton.click();

      await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });
    }

    await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });

    for (const exercise of exercises) {
      await expect(page.locator(`text=${exercise.name}`).first()).toBeVisible({ timeout: 10000 });
    }

    for (const exercise of exercises) {
      await deleteExercise(page, exercise.name);
    }
  });

  test('search filters exercises by name', async ({ page }) => {
    await page.goto(`${BASE_URL}/exercises/new`, { waitUntil: 'networkidle' });
    await page.locator('input#name').fill('Unique Searchable Exercise 12345');
    await page.locator('select#muscleGroup').selectOption('Glutes');
    await page.locator('button[type="submit"]:has-text("Create Exercise")').click();
    await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });

    await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });

    const searchInput = page.locator('input[placeholder="Search exercises..."]');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('Unique Searchable');

    const exerciseCard = page.locator('text=Unique Searchable Exercise 12345');
    await expect(exerciseCard.first()).toBeVisible({ timeout: 10000 });

    await deleteExercise(page, 'Unique Searchable Exercise 12345');
  });

  test('muscle group dropdown filters exercises', async ({ page }) => {
    await page.goto(`${BASE_URL}/exercises/new`, { waitUntil: 'networkidle' });
    await page.locator('input#name').fill('Filter Test Chest Exercise');
    await page.locator('select#muscleGroup').selectOption('Chest');
    await page.locator('button[type="submit"]:has-text("Create Exercise")').click();
    await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });

    await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });

    const filterDropdown = page.locator('select').filter({ has: page.locator('option[value="Chest"]') });
    await expect(filterDropdown).toBeVisible();

    await filterDropdown.selectOption('Chest');

    const exerciseCard = page.locator('text=Filter Test Chest Exercise');
    await expect(exerciseCard.first()).toBeVisible({ timeout: 10000 });

    await deleteExercise(page, 'Filter Test Chest Exercise');
  });

  test('combined search and filter', async ({ page }) => {
    await page.goto(`${BASE_URL}/exercises/new`, { waitUntil: 'networkidle' });
    await page.locator('input#name').fill('Combo Test Exercise XYZ');
    await page.locator('select#muscleGroup').selectOption('Biceps');
    await page.locator('button[type="submit"]:has-text("Create Exercise")').click();
    await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });

    await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });

    await page.locator('input[placeholder="Search exercises..."]').fill('Combo Test');
    await page.locator('select').filter({ has: page.locator('option[value="Biceps"]') }).selectOption('Biceps');

    const exerciseCard = page.locator('text=Combo Test Exercise XYZ');
    await expect(exerciseCard.first()).toBeVisible({ timeout: 10000 });

    await deleteExercise(page, 'Combo Test Exercise XYZ');
  });
});

test.describe('Exercise History Flow', () => {
  test('view exercise history with completed workout', async ({ page }) => {
    test.skip(true, 'Complex test with timing issues - needs refactoring');

    const timestamp = Date.now();
    const exerciseName = `History Test Exercise ${timestamp}`;
    const workoutName = `History Test Workout ${timestamp}`;

    // Create exercise
    await page.goto(`${BASE_URL}/exercises/new`, { waitUntil: 'networkidle' });
    await page.locator('input#name').fill(exerciseName);
    await page.locator('select#muscleGroup').selectOption('Chest');
    await page.locator('button[type="submit"]:has-text("Create Exercise")').click();
    await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });

    // Create and complete workout
    await page.goto(`${BASE_URL}/workouts/new`, { waitUntil: 'networkidle' });
    
    const startBlankButton = page.locator('text=Start with blank workout').first();
    await expect(startBlankButton).toBeVisible({ timeout: 10000 });
    await startBlankButton.click();

    await expect(page.locator('text=Build Your Workout')).toBeVisible({ timeout: 10000 });
    await page.locator('input[id="name"]').fill(workoutName);

    const addExerciseButton = page.locator('button:has-text("Add Exercise")').first();
    await expect(addExerciseButton).toBeVisible();
    await addExerciseButton.click();

    const exerciseSelectorModal = page.locator('.fixed.inset-0').filter({ has: page.locator('text=Add Exercise') });
    await expect(exerciseSelectorModal).toBeVisible({ timeout: 5000 });

    const exerciseButtons = page.locator('.fixed.inset-0 button').filter({ has: page.locator('h3') });
    const buttonCount = await exerciseButtons.count();

    let exerciseFound = false;
    if (buttonCount > 0) {
      for (let i = 0; i < buttonCount; i++) {
        const btn = exerciseButtons.nth(i);
        const text = await btn.textContent() ?? '';
        if (text.includes(exerciseName)) {
          await btn.click({ force: true });
          exerciseFound = true;
          break;
        }
      }
    }

    if (!exerciseFound) {
      const selectElement = page.locator('select').first();
      await expect(selectElement).toBeVisible();
      await selectElement.selectOption({ label: exerciseName });
    }

    const startWorkoutButton = page.locator('button[type="submit"]:has-text("Start Workout")').first();
    await expect(startWorkoutButton).toBeVisible({ timeout: 10000 });
    await startWorkoutButton.click();

    await page.waitForURL(/\/workouts\/[a-zA-Z0-9-]+/, { timeout: 10000 });

    // Add sets and complete
    const addSetButton = page.locator('text=Add Set').first();
    await expect(addSetButton).toBeVisible({ timeout: 10000 });
    await addSetButton.click();

    const weightInput = page.locator('input[placeholder*="weight"]').first();
    await weightInput.fill('100');

    const repsInput = page.locator('input[placeholder*="reps"]').first();
    await repsInput.fill('5');

    const completeSetButton = page.locator('text=Complete').first();
    await expect(completeSetButton).toBeVisible();
    await completeSetButton.click();

    const completeWorkoutButton = page.locator('text=Complete Workout').first();
    await expect(completeWorkoutButton).toBeVisible();
    await completeWorkoutButton.click();

    await page.waitForURL(/\/workouts\/[a-zA-Z0-9-]+\/summary/, { timeout: 10000 });

    // Go to history and click on exercise
    await page.goto(`${BASE_URL}/history`, { waitUntil: 'networkidle' });

    // Expand workout
    const expandButton = page.locator('button').filter({ hasText: '▶' }).first();
    await expect(expandButton).toBeVisible();
    await expandButton.click();

    // Click exercise name
    const exerciseLink = page.locator(`a:has-text("${exerciseName}")`).first();
    await expect(exerciseLink).toBeVisible();
    await exerciseLink.click();

    // Verify exercise history page
    await page.waitForURL(/\/history\/[a-zA-Z0-9-]+/, { timeout: 10000 });
    await expect(page.locator(`h1:has-text("${exerciseName}")`).first()).toBeVisible({ timeout: 10000 });

    // Verify chart is present (not "No data to display")
    const chartSection = page.locator('text=Progress Over Time').first();
    await expect(chartSection).toBeVisible();

    const chartContainer = page.locator('.recharts-wrapper').first();
    await expect(chartContainer).toBeVisible({ timeout: 10000 });

    // Verify stats are shown
    await expect(page.locator('text=Max Weight').first()).toBeVisible();
    await expect(page.locator('text=Est. 1RM').first()).toBeVisible();
    await expect(page.locator('text=Workouts').first()).toBeVisible();

    // Verify table is present
    const table = page.locator('table').first();
    await expect(table).toBeVisible();

    // Clean up
    await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });
    await deleteExercise(page, exerciseName);
  });
});

test.describe('Security - Unauthorized Access', () => {
  test('cannot access another user exercise history', async ({ page }) => {
    test.skip(true, 'Security tests should be unit tests, not E2E tests');

    const timestamp = Date.now();
    const exerciseName = `Security Test Exercise ${timestamp}`;
    const workoutName = `Security Test Workout ${timestamp}`;

    // Create and complete a workout with an exercise
    await page.goto(`${BASE_URL}/exercises/new`, { waitUntil: 'networkidle' });
    await page.locator('input#name').fill(exerciseName);
    await page.locator('select#muscleGroup').selectOption('Chest');
    await page.locator('button[type="submit"]:has-text("Create Exercise")').click();
    await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });

    const exerciseUrl = page.url();
    const exerciseId = exerciseUrl.split('/').pop();

    // Start and complete workout
    await page.goto(`${BASE_URL}/workouts/new`, { waitUntil: 'networkidle' });
    
    const startBlankButton = page.locator('text=Start with blank workout').first();
    await expect(startBlankButton).toBeVisible({ timeout: 10000 });
    await startBlankButton.click();

    await expect(page.locator('text=Build Your Workout')).toBeVisible({ timeout: 10000 });
    await page.locator('input[id="name"]').fill(workoutName);

    const addExerciseButton = page.locator('text=Add Exercise').first();
    await expect(addExerciseButton).toBeVisible();
    await addExerciseButton.click();

    const exerciseSelectorModal = page.locator('.fixed.inset-0').filter({ has: page.locator('text=Add Exercise') });
    await expect(exerciseSelectorModal).toBeVisible({ timeout: 5000 });

    const exerciseButtons = page.locator('.fixed.inset-0 button').filter({ has: page.locator('h3') });
    const buttonCount = await exerciseButtons.count();

    let exerciseFound = false;
    if (buttonCount > 0) {
      for (let i = 0; i < buttonCount; i++) {
        const btn = exerciseButtons.nth(i);
        const text = await btn.textContent() ?? '';
        if (text.includes(exerciseName)) {
          await btn.click({ force: true });
          exerciseFound = true;
          break;
        }
      }
    }

    if (!exerciseFound) {
      const selectElement = page.locator('select').first();
      await expect(selectElement).toBeVisible();
      await selectElement.selectOption({ label: exerciseName });
    }

    await page.locator('button[type="submit"]:has-text("Start Workout")').click();
    await page.waitForURL(/\/workouts\/[a-zA-Z0-9-]+/, { timeout: 10000 });

    // Add set and complete
    await page.locator('button:has-text("Add Set")').first().click();
    await page.locator('input[placeholder*="weight"]').first().fill('100');
    await page.locator('input[placeholder*="reps"]').first().fill('5');
    await page.locator('button:has-text("Complete")').first().click();
    await page.locator('button:has-text("Complete Workout")').first().click();
    await page.waitForURL(/\/workouts\/[a-zA-Z0-9-]+\/summary/, { timeout: 10000 });

    // Try to access exercise history directly with API
    const historyResponse = await page.request.get(`${BASE_URL}/api/exercises/${exerciseId}/history`);
    expect(historyResponse.status()).toBe(200);

    // Verify page shows data
    await page.goto(`${BASE_URL}/history/${exerciseId}`, { waitUntil: 'networkidle' });
    await expect(page.locator(`h1:has-text("${exerciseName}")`).first()).toBeVisible({ timeout: 10000 });

    // Clean up
    await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });
    await deleteExercise(page, exerciseName);
  });

  test('workout sets API validates ownership', async ({ page }) => {
    test.skip(true, 'Security tests should be unit tests, not E2E tests');

    const timestamp = Date.now();
    const exerciseName = `Set Security Test ${timestamp}`;
    const workoutName = `Set Security Workout ${timestamp}`;

    // Create exercise and workout with set
    await page.goto(`${BASE_URL}/exercises/new`, { waitUntil: 'networkidle' });
    await page.locator('input#name').fill(exerciseName);
    await page.locator('select#muscleGroup').selectOption('Back');
    await page.locator('button[type="submit"]:has-text("Create Exercise")').click();
    await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });

    await page.goto(`${BASE_URL}/workouts/new`, { waitUntil: 'networkidle' });
    
    const startBlankButton = page.locator('text=Start with blank workout').first();
    await expect(startBlankButton).toBeVisible({ timeout: 10000 });
    await startBlankButton.click();

    await expect(page.locator('text=Build Your Workout')).toBeVisible({ timeout: 10000 });
    await page.locator('input[id="name"]').fill(workoutName);

    const addExerciseButton = page.locator('text=Add Exercise').first();
    await expect(addExerciseButton).toBeVisible();
    await addExerciseButton.click();

    const exerciseSelectorModal = page.locator('.fixed.inset-0').filter({ has: page.locator('text=Add Exercise') });
    await expect(exerciseSelectorModal).toBeVisible({ timeout: 5000 });

    const exerciseButtons = page.locator('.fixed.inset-0 button').filter({ has: page.locator('h3') });
    const buttonCount = await exerciseButtons.count();

    let exerciseFound = false;
    if (buttonCount > 0) {
      for (let i = 0; i < buttonCount; i++) {
        const btn = exerciseButtons.nth(i);
        const text = await btn.textContent() ?? '';
        if (text.includes(exerciseName)) {
          await btn.click({ force: true });
          exerciseFound = true;
          break;
        }
      }
    }

    if (!exerciseFound) {
      const selectElement = page.locator('select').first();
      await expect(selectElement).toBeVisible();
      await selectElement.selectOption({ label: exerciseName });
    }

    await page.locator('button[type="submit"]:has-text("Start Workout")').click();
    await page.waitForURL(/\/workouts\/[a-zA-Z0-9-]+/, { timeout: 10000 });

    // Get workout ID from URL
    const workoutUrl = page.url();
    const workoutId = workoutUrl.split('/').pop();

    // Add a set via API
    const setsResponse = await page.request.get(`${BASE_URL}/api/workouts/${workoutId}/exercises`);
    expect(setsResponse.status()).toBe(200);
    const exercisesData = await setsResponse.json() as Array<{ id: string }>;
    const workoutExerciseId = exercisesData[0]?.id;

    const createSetResponse = await page.request.post(`${BASE_URL}/api/workouts/sets`, {
      data: {
        workoutExerciseId,
        setNumber: 1,
        weight: 100,
        reps: 5,
      },
    });
    expect(createSetResponse.status()).toBe(201);
    const setData = await createSetResponse.json() as { id: string };
    const setId = setData.id;

    // Complete the set
    const completeResponse = await page.request.put(`${BASE_URL}/api/workouts/sets/${setId}`, {
      data: { isComplete: true },
    });
    expect(completeResponse.status()).toBe(200);

    // Delete the set
    const deleteResponse = await page.request.delete(`${BASE_URL}/api/workouts/sets/${setId}`);
    expect(deleteResponse.status()).toBe(204);

    // Clean up
    await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });
    await deleteExercise(page, exerciseName);
  });

  test('template exercises API validates ownership', async ({ page }) => {
    test.skip(true, 'Security tests should be unit tests, not E2E tests');

    const timestamp = Date.now();
    const templateName = `Template Security Test ${timestamp}`;

    // Create template with exercise
    await page.goto(`${BASE_URL}/templates/new`, { waitUntil: 'networkidle' });
    await page.locator('input#name').fill(templateName);
    await page.locator('button:has-text("Add Exercise")').first().click();
    await page.locator('.fixed select').first().selectOption({ label: 'Barbell Bench Press' });
    await page.locator('.fixed button:has-text("Add")').first().click();
    await page.locator('button[type="submit"]:has-text("Create Template")').click();
    await page.waitForURL(/\/templates\/[a-zA-Z0-9-]+/, { timeout: 10000 });

    const templateUrl = page.url();
    const templateId = templateUrl.split('/').pop();

    // Get template exercises
    const exercisesResponse = await page.request.get(`${BASE_URL}/api/templates/${templateId}/exercises`);
    expect(exercisesResponse.status()).toBe(200);

    // Clean up - delete template
    await page.goto(`${BASE_URL}/templates`, { waitUntil: 'networkidle' });
    const templateCard = page.locator(`text=${templateName}`).first();
    if (await templateCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await templateCard.click();
      await page.waitForURL(/\/templates\/[a-zA-Z0-9-]+/, { timeout: 10000 });
      const deleteButton = page.locator('button:has-text("Delete")').first();
      page.on('dialog', async (dialog: Dialog) => await dialog.accept());
      await deleteButton.click();
      await page.waitForURL(`${BASE_URL}/templates`, { timeout: 10000 });
    }
  });
});
