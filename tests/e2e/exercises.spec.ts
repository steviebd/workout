import { expect, test, Page } from '@playwright/test';

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
	test.beforeEach(async ({ page }) => {
		const response = await page.request.get(`${BASE_URL}/api/auth/me`);
		if (!response.ok()) {
			test.skip(true, 'User is not authenticated');
			return;
		}

		const userAvatar = page.locator('button.rounded-full').first();
		await expect(userAvatar).toBeVisible({ timeout: 10000 }).catch(() => {});
	});

	test('login and navigate to exercises list', async ({ page }) => {
		await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });
		await expect(page).not.toHaveURL(isAuthKitUrl);

		await expect(page.locator('h1:has-text("Exercises")').first()).toBeVisible({ timeout: 10000 });
	});

	test('verify exercises list loads', async ({ page }) => {
		await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });
		await expect(page).not.toHaveURL(isAuthKitUrl);

		await expect(page.locator('h1:has-text("Exercises")').first()).toBeVisible({ timeout: 10000 });
		
		const newExerciseButton = page.locator('button:has-text("New")').first();
		await expect(newExerciseButton).toBeVisible();
	});

	test('click new exercise button shows inline form', async ({ page }) => {
		await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });

		const newExerciseButton = page.locator('button:has-text("New")').first();
		await expect(newExerciseButton).toBeVisible();
		await newExerciseButton.click();

		await expect(page.locator('h2:has-text("Create Exercise")').first()).toBeVisible({ timeout: 5000 });
		await expect(page.locator('input[placeholder="Exercise name"]').first()).toBeVisible();
	});
});

test.describe('Create Exercise Flow', () => {
	test.skip('create new exercise with all fields - consolidated in exercise-template-flow.spec.ts', async ({ page }) => {
		await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });

		const testExerciseName = `Test Exercise ${Date.now()}`;
		const testMuscleGroup = 'Chest';
		const testDescription = 'Test description for the exercise';

		await page.locator('button:has-text("New")').first().click();
		await expect(page.locator('h2:has-text("Create Exercise")').first()).toBeVisible({ timeout: 5000 });

		await page.locator('input[placeholder="Exercise name"]').fill(testExerciseName);
		await page.locator('select').first().selectOption(testMuscleGroup);
		await page.locator('textarea').first().fill(testDescription);

		const submitButton = page.locator('button:has-text("Create")').first();
		await expect(submitButton).toBeVisible();
		await submitButton.click();

		await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });

		await expect(page.locator(`h1:has-text("${testExerciseName}")`).first()).toBeVisible({ timeout: 10000 });

		await expect(page.locator(`text=${testMuscleGroup}`).first()).toBeVisible();
		await expect(page.locator(`text=${testDescription}`).first()).toBeVisible();

		await deleteExercise(page, testExerciseName);
	});

	test.skip('create exercise with required fields only - consolidated in exercise-template-flow.spec.ts', async ({ page }) => {
		await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });

		const testExerciseName = `Minimal Exercise ${Date.now()}`;

		await page.locator('button:has-text("New")').first().click();
		await page.locator('input[placeholder="Exercise name"]').fill(testExerciseName);
		await page.locator('select').first().selectOption('Back');

		const submitButton = page.locator('button:has-text("Create")').first();
		await submitButton.click();

		await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });

		await expect(page.locator(`h1:has-text("${testExerciseName}")`).first()).toBeVisible({ timeout: 10000 });

		await deleteExercise(page, testExerciseName);
	});

	test('cancel exercise creation', async ({ page }) => {
		await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });

		await page.locator('button:has-text("New")').first().click();
		await expect(page.locator('h2:has-text("Create Exercise")').first()).toBeVisible({ timeout: 5000 });

		await page.locator('input[placeholder="Exercise name"]').fill('Test Cancel');
		await page.locator('button:has-text("Cancel")').first().click();

		await expect(page.locator('h2:has-text("Create Exercise")').first()).not.toBeVisible({ timeout: 5000 });
	});
});

test.describe('View Exercise Detail', () => {
	test('view exercise detail and verify all fields', async ({ page }) => {
		await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });

		const testExerciseName = `Detail Test ${Date.now()}`;
		const testMuscleGroup = 'Shoulders';
		const testDescription = 'Detailed description for testing';

		await page.locator('button:has-text("New")').first().click();
		await page.locator('input[placeholder="Exercise name"]').fill(testExerciseName);
		await page.locator('select').first().selectOption(testMuscleGroup);
		await page.locator('textarea').first().fill(testDescription);

		const submitButton = page.locator('button:has-text("Create")').first();
		await submitButton.click();

		await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });

		await expect(page.locator(`h1:has-text("${testExerciseName}")`).first()).toBeVisible({ timeout: 10000 });
		await expect(page.locator(`text=${testMuscleGroup}`).first()).toBeVisible();
		await expect(page.locator(`text=${testDescription}`).first()).toBeVisible();

		const createdText = page.locator('text=Created');
		await expect(createdText.first()).toBeVisible();

		await deleteExercise(page, testExerciseName);
	});
});

test.describe('Search and Filter Flow', () => {
  test.skip('create multiple exercises with different muscle groups - consolidated in exercise-template-flow.spec.ts', async ({ page }) => {
    const timestamp = Date.now();
    const exercises = [
      { name: `Chest Test Alpha ${timestamp}`, muscleGroup: 'Chest' },
      { name: `Back Test Beta ${timestamp}`, muscleGroup: 'Back' },
      { name: `Shoulder Test Gamma ${timestamp}`, muscleGroup: 'Shoulders' },
      { name: `Leg Test Delta ${timestamp}`, muscleGroup: 'Quads' },
    ];

    for (const exercise of exercises) {
      await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });
      await page.locator('button:has-text("New")').first().click();
      await page.locator('input[placeholder="Exercise name"]').fill(exercise.name);
      await page.locator('select').first().selectOption(exercise.muscleGroup);
      await page.locator('button:has-text("Create")').first().click();
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
    await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });
    const uniqueName = `Unique Searchable Exercise ${Date.now()}`;
    await page.locator('button:has-text("New")').first().click();
    await page.locator('input[placeholder="Exercise name"]').fill(uniqueName);
    await page.locator('select').first().selectOption('Glutes');
    await page.locator('button:has-text("Create")').first().click();
    await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });

    await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });

    const searchInput = page.locator('input[placeholder="Search exercises..."]');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('Unique Searchable');

    const exerciseCard = page.locator(`text=${uniqueName}`);
    await expect(exerciseCard.first()).toBeVisible({ timeout: 10000 });

    await deleteExercise(page, uniqueName);
  });
});

test.describe('Template Integration Flow', () => {
  test.skip('create exercise from template flow - consolidated in exercise-template-flow.spec.ts', async ({ page }) => {
    await page.goto(`${BASE_URL}/templates/new`, { waitUntil: 'networkidle' });
    await expect(page.locator('h1:has-text("Create Template")').first()).toBeVisible({ timeout: 10000 });

    const testExerciseName = `Template Exercise ${Date.now()}`;
    const testMuscleGroup = 'Biceps';

    await page.fill('input[id="name"]', 'Test Template');
    await page.click('button:has-text("Add Exercise")');
    await page.waitForSelector('.fixed.inset-0', { timeout: 10000 });

    const searchInput = page.locator('.fixed input[placeholder="Search exercises..."]');
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    await searchInput.fill('NonExistentExerciseXYZ123');

    const createButton = page.locator('.fixed button:has-text("Create")').first();
    await expect(createButton).toBeVisible({ timeout: 5000 });
    await createButton.click();

    const inlineForm = page.locator('.fixed').filter({ has: page.locator('text=Create New Exercise') });
    await expect(inlineForm.locator('input[placeholder="Exercise name"]')).toBeVisible({ timeout: 5000 });
    await inlineForm.locator('input[placeholder="Exercise name"]').fill(testExerciseName);
    await inlineForm.locator('select').first().selectOption(testMuscleGroup);
    await inlineForm.locator('button:has-text("Create")').first().click();

    await page.waitForSelector('.bg-secondary:has-text("Template Exercise")', { timeout: 10000 });

    await page.locator('.fixed button:has-text("Done")').click();
    await page.waitForSelector('.fixed.inset-0', { state: 'hidden', timeout: 5000 });

    await page.click('button:has-text("Create Template")');
    await page.waitForURL(/\/templates\/[a-zA-Z0-9-]+/, { timeout: 10000 });

    await expect(page.locator(`text=${testExerciseName}`).first()).toBeVisible({ timeout: 10000 });

    await deleteExercise(page, testExerciseName);
  });
});
