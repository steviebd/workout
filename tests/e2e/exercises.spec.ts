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

async function login(page: any) {
	await page.goto(BASE_URL, { waitUntil: 'networkidle' });

	const signInButton = page.locator('text=Sign In').first();
	await expect(signInButton).toBeVisible();
	await signInButton.click();

	await expect(page).toHaveURL(isAuthKitUrl, { timeout: 10000 });

	await page.locator(AUTH_EMAIL_SELECTOR).fill(TEST_USERNAME);
	await page.locator(AUTH_CONTINUE_SELECTOR).click();

	await expect(page.locator(AUTH_PASSWORD_SELECTOR)).toBeVisible({ timeout: 10000 });
	await page.locator(AUTH_PASSWORD_SELECTOR).fill(TEST_PASSWORD);
	await page.locator(AUTH_SUBMIT_SELECTOR).click();

	await page.waitForURL(`${BASE_URL}/`, { timeout: 30000 });

	await expect(page.locator('text=Sign Out').first()).toBeVisible({ timeout: 10000 });
}

test.describe('Exercise List Flow', () => {
	test.beforeEach(async ({ context }) => {
		await context.clearCookies();
	});

	test('login and navigate to exercises list', async ({ page }) => {
		await login(page);

		await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });
		await expect(page).not.toHaveURL(isAuthKitUrl);

		await expect(page.locator('h1:has-text("Exercises")').first()).toBeVisible({ timeout: 10000 });
	});

	test('verify empty state on exercises list', async ({ page }) => {
		await login(page);

		await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });
		await expect(page).not.toHaveURL(isAuthKitUrl);

		const emptyState = page.locator('text=No exercises found');
		await expect(emptyState).toBeVisible({ timeout: 10000 });
	});

	test('click new exercise button from empty state', async ({ page }) => {
		await login(page);

		await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });

		const newExerciseButton = page.locator('text=New Exercise').first();
		await expect(newExerciseButton).toBeVisible();
		await newExerciseButton.click();

		await expect(page).toHaveURL(`${BASE_URL}/exercises/new`);
	});
});

test.describe('Create Exercise Flow', () => {
	test.beforeEach(async ({ context }) => {
		await context.clearCookies();
	});

	test('create new exercise with all fields', async ({ page }) => {
		await login(page);

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
	});

	test('create exercise with required fields only', async ({ page }) => {
		await login(page);

		await page.goto(`${BASE_URL}/exercises/new`, { waitUntil: 'networkidle' });

		const testExerciseName = `Minimal Exercise ${Date.now()}`;

		await page.locator('input#name').fill(testExerciseName);
		await page.locator('select#muscleGroup').selectOption('Back');

		const submitButton = page.locator('button[type="submit"]:has-text("Create Exercise")');
		await submitButton.click();

		await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });

		await expect(page.locator(`h1:has-text("${testExerciseName}")`).first()).toBeVisible({ timeout: 10000 });
	});
});

test.describe('View Exercise Detail', () => {
	test.beforeEach(async ({ context }) => {
		await context.clearCookies();
	});

	test('view exercise detail and verify all fields', async ({ page }) => {
		await login(page);

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
	});

	test('navigate to edit page from detail page', async ({ page }) => {
		await login(page);

		await page.goto(`${BASE_URL}/exercises/new`, { waitUntil: 'networkidle' });

		const testExerciseName = `Edit Navigation Test ${Date.now()}`;

		await page.locator('input#name').fill(testExerciseName);
		await page.locator('select#muscleGroup').selectOption('Biceps');

		const submitButton = page.locator('button[type="submit"]:has-text("Create Exercise")');
		await submitButton.click();

		await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });

		const editButton = page.locator('text=Edit').first();
		await expect(editButton).toBeVisible();
		await editButton.click();

		await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+\/edit/, { timeout: 10000 });

		await expect(page.locator('h1:has-text("Edit Exercise")').first()).toBeVisible({ timeout: 10000 });
	});
});

test.describe('Edit Exercise Flow', () => {
	test.beforeEach(async ({ context }) => {
		await context.clearCookies();
	});

	test('edit exercise and verify updated fields', async ({ page }) => {
		await login(page);

		await page.goto(`${BASE_URL}/exercises/new`, { waitUntil: 'networkidle' });

		const originalName = `Original Name ${Date.now()}`;
		await page.locator('input#name').fill(originalName);
		await page.locator('select#muscleGroup').selectOption('Chest');
		await page.locator('textarea#description').fill('Original description');

		const submitButton = page.locator('button[type="submit"]:has-text("Create Exercise")');
		await submitButton.click();

		await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });

		const editButton = page.locator('text=Edit').first();
		await editButton.click();

		await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+\/edit/, { timeout: 10000 });

		const updatedName = `Updated Name ${Date.now()}`;
		await page.locator('input#name').fill(updatedName);
		await page.locator('select#muscleGroup').selectOption('Triceps');
		await page.locator('textarea#description').fill('Updated description');

		const saveButton = page.locator('button[type="submit"]:has-text("Save Changes")');
		await expect(saveButton).toBeVisible();
		await saveButton.click();

		await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });

		await expect(page.locator(`h1:has-text("${updatedName}")`).first()).toBeVisible({ timeout: 10000 });
		await expect(page.locator(`text=Triceps`).first()).toBeVisible();
		await expect(page.locator(`text=Updated description`).first()).toBeVisible();
	});
});

test.describe('Delete Exercise Flow', () => {
	test.beforeEach(async ({ context }) => {
		await context.clearCookies();
	});

	test('delete exercise and verify redirected to list', async ({ page }) => {
		await login(page);

		await page.goto(`${BASE_URL}/exercises/new`, { waitUntil: 'networkidle' });

		const testExerciseName = `Delete Test ${Date.now()}`;
		await page.locator('input#name').fill(testExerciseName);
		await page.locator('select#muscleGroup').selectOption('Core');

		const submitButton = page.locator('button[type="submit"]:has-text("Create Exercise")');
		await submitButton.click();

		await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });

		const deleteButton = page.locator('text=Delete').first();
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
		await login(page);

		await page.goto(`${BASE_URL}/exercises/new`, { waitUntil: 'networkidle' });

		const testExerciseName = `Delete Verify Test ${Date.now()}`;
		await page.locator('input#name').fill(testExerciseName);
		await page.locator('select#muscleGroup').selectOption('Quads');

		const submitButton = page.locator('button[type="submit"]:has-text("Create Exercise")');
		await submitButton.click();

		await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });

		const deleteButton = page.locator('text=Delete').first();
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
	test.beforeEach(async ({ context }) => {
		await context.clearCookies();
	});

	test('copy exercise from library', async ({ page }) => {
		await login(page);

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
	});

	test('search library and select different exercise', async ({ page }) => {
		await login(page);

		await page.goto(`${BASE_URL}/exercises/new`, { waitUntil: 'networkidle' });

		const libraryButton = page.locator('text=Choose from Library');
		await libraryButton.click();

		const libraryModal = page.locator('.fixed.inset-0').first();
		await expect(libraryModal.locator('text=Exercise Library')).toBeVisible({ timeout: 10000 });

		const searchInput = libraryModal.locator('input[placeholder="Search exercises..."]');
		await searchInput.fill('Squat');

		await expect(libraryModal.locator('text=Barbell Squat').first()).toBeVisible();
		await expect(libraryModal.locator('text=Leg Press').first()).toBeVisible();

		await libraryModal.locator('text=Barbell Squat').first().click();

		await expect(page.locator('input#name')).toHaveValue('Barbell Squat');
		await expect(page.locator('select#muscleGroup')).toHaveValue('Quads');
	});
});

test.describe('Search and Filter Flow', () => {
	test.beforeEach(async ({ context }) => {
		await context.clearCookies();
	});

	test('create multiple exercises with different muscle groups', async ({ page }) => {
		await login(page);

		const exercises = [
			{ name: 'Chest Test Alpha', muscleGroup: 'Chest' },
			{ name: 'Back Test Beta', muscleGroup: 'Back' },
			{ name: 'Shoulder Test Gamma', muscleGroup: 'Shoulders' },
			{ name: 'Leg Test Delta', muscleGroup: 'Quads' },
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
	});

	test('search filters exercises by name', async ({ page }) => {
		await login(page);

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
	});

	test('muscle group dropdown filters exercises', async ({ page }) => {
		await login(page);

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
	});

	test('combined search and filter', async ({ page }) => {
		await login(page);

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
	});
});
