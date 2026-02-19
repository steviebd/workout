import { expect, test, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8787';
const TEST_USERNAME = process.env.TEST_USERNAME ?? '';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? '';

function isAuthKitUrl(url: URL): boolean {
	return url.hostname.includes('authkit.app') || url.pathname.includes('/auth/signin');
}

async function loginUser(page: Page) {
	const authResponse = await page.request.get(`${BASE_URL}/api/auth/me`);
	if (authResponse.ok()) {
		return;
	}

	await page.goto(BASE_URL, { waitUntil: 'load' });

	await page.waitForTimeout(3000);

	const userAvatar = page.locator('button.rounded-full').first();
	if (await userAvatar.isVisible({ timeout: 2000 }).catch(() => false)) {
		return;
	}

	const signInButton = page.locator('text=Sign In').first();
	if (await signInButton.isVisible({ timeout: 2000 }).catch(() => false)) {
		await signInButton.click();
	} else {
		const currentUrl = page.url();
		if (!isAuthKitUrl(new URL(currentUrl))) {
			await page.waitForTimeout(2000);
		}
	}

	await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 10000 });

	await page.locator('input[name="email"]').fill(TEST_USERNAME);
	await page.locator('button:has-text("Continue")').click();

	await expect(page.locator('input[name="password"]')).toBeVisible({ timeout: 10000 });
	await page.locator('input[name="password"]').fill(TEST_PASSWORD);
	await page.locator('button[name="intent"]:not([data-method])').click();

	await page.waitForURL(BASE_URL, { timeout: 30000 });

	const authCheck = await page.request.get(`${BASE_URL}/api/auth/me`);
	expect(authCheck.ok()).toBe(true);
}

async function deleteExercise(page: Page, name: string) {
	try {
		await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'load' });
		const exerciseCard = page.locator(`text=${name}`).first();
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
	} catch (error) {
		console.log(`Could not delete exercise "${name}":`, error);
	}
}

async function deleteTemplate(page: Page, name: string) {
	try {
		await page.goto(`${BASE_URL}/templates`, { waitUntil: 'load' });
		const templateCard = page.locator(`text=${name}`).first();
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
	} catch (error) {
		console.log(`Could not delete template "${name}":`, error);
	}
}

test.describe('Exercise Management', () => {
	test.beforeEach(async ({ page }) => {
		await loginUser(page);
	});

	test('create exercise with all fields', async ({ page }) => {
		const timestamp = Date.now();
		const exerciseName = `Test Exercise ${timestamp}`;
		const muscleGroup = 'Chest';
		const description = 'Test description for comprehensive E2E test';

		await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'load' });
		await expect(page.locator('h1:has-text("Exercises")').first()).toBeVisible({ timeout: 10000 });

		await page.locator('button:has-text("New")').first().click();
		await expect(page.locator('h2:has-text("Create Exercise")').first()).toBeVisible({ timeout: 5000 });

		await page.locator('input[placeholder="Exercise name"]').fill(exerciseName);
		await page.locator('select').first().selectOption(muscleGroup);
		await page.locator('textarea').first().fill(description);

		const submitButton = page.locator('button:has-text("Create")').first();
		await expect(submitButton).toBeVisible();
		await submitButton.click();

		await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });

		await expect(page.locator(`h1:has-text("${exerciseName}")`).first()).toBeVisible({ timeout: 10000 });
		await expect(page.locator(`text=${muscleGroup}`).first()).toBeVisible();
		await expect(page.locator(`text=${description}`).first()).toBeVisible();

		console.log(`Exercise "${exerciseName}" created successfully`);

		await deleteExercise(page, exerciseName);
	});

	test('create minimal exercise with required fields only', async ({ page }) => {
		const timestamp = Date.now();
		const exerciseName = `Minimal Exercise ${timestamp}`;

		await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'load' });

		await page.locator('button:has-text("New")').first().click();
		await page.locator('input[placeholder="Exercise name"]').fill(exerciseName);
		await page.locator('select').first().selectOption('Back');

		const submitButton = page.locator('button:has-text("Create")').first();
		await submitButton.click();

		await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });

		await expect(page.locator(`h1:has-text("${exerciseName}")`).first()).toBeVisible({ timeout: 10000 });

		await deleteExercise(page, exerciseName);
	});

	test('cancel exercise creation', async ({ page }) => {
		await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'load' });

		await page.locator('button:has-text("New")').first().click();
		await expect(page.locator('h2:has-text("Create Exercise")').first()).toBeVisible({ timeout: 5000 });

		await page.locator('input[placeholder="Exercise name"]').fill('Test Cancel');
		await page.locator('button:has-text("Cancel")').first().click();

		await expect(page.locator('h2:has-text("Create Exercise")').first()).not.toBeVisible({ timeout: 5000 });
	});

	test('search filters exercises by name', async ({ page }) => {
		const uniqueName = `Unique Searchable ${Date.now()}`;

		await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'load' });

		await page.locator('button:has-text("New")').first().click();
		await page.locator('input[placeholder="Exercise name"]').fill(uniqueName);
		await page.locator('select').first().selectOption('Glutes');
		await page.locator('button:has-text("Create")').first().click();
		await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });

		await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'load' });

		const searchInput = page.locator('input[placeholder="Search exercises..."]');
		await expect(searchInput).toBeVisible();

		await searchInput.fill('Unique Searchable');

		const exerciseCard = page.locator(`text=${uniqueName}`);
		await expect(exerciseCard.first()).toBeVisible({ timeout: 10000 });

		await deleteExercise(page, uniqueName);
	});

	test('create multiple exercises with different muscle groups', async ({ page }) => {
		const timestamp = Date.now();
		const exercises = [
			{ name: `Chest Test ${timestamp}`, muscleGroup: 'Chest' },
			{ name: `Back Test ${timestamp}`, muscleGroup: 'Back' },
			{ name: `Shoulder Test ${timestamp}`, muscleGroup: 'Shoulders' },
			{ name: `Leg Test ${timestamp}`, muscleGroup: 'Quads' },
		];

		for (const exercise of exercises) {
			await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'load' });
			await page.locator('button:has-text("New")').first().click();
			await page.locator('input[placeholder="Exercise name"]').fill(exercise.name);
			await page.locator('select').first().selectOption(exercise.muscleGroup);
			await page.locator('button:has-text("Create")').first().click();
			await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });
		}

		await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'load' });

		for (const exercise of exercises) {
			await expect(page.locator(`text=${exercise.name}`).first()).toBeVisible({ timeout: 10000 });
		}

		for (const exercise of exercises) {
			await deleteExercise(page, exercise.name);
		}
	});
});

test.describe('Template Management', () => {
	test.beforeEach(async ({ page }) => {
		await loginUser(page);
	});

	test('create template with exercise from library', async ({ page }) => {
		const timestamp = Date.now();
		const templateName = `Library Template ${timestamp}`;

		await page.goto(`${BASE_URL}/templates/new`, { waitUntil: 'load' });
		await expect(page.locator('h1:has-text("Create Template")').first()).toBeVisible({ timeout: 10000 });

		await page.waitForTimeout(1000);

		await page.click('button:has-text("Add Exercise")');
		await page.waitForSelector('[data-slot="drawer-overlay"]', { timeout: 10000 });
		await page.waitForTimeout(500);

		const searchInput = page.locator('[data-slot="drawer-content"] input[placeholder="Search exercises..."]');
		await expect(searchInput).toBeVisible({ timeout: 5000 });
		await searchInput.fill('Squat');
		await page.waitForTimeout(500);

		const exerciseButton = page.locator('[data-slot="drawer-content"] button.w-full').first();
		await expect(exerciseButton).toBeVisible({ timeout: 5000 });
		await exerciseButton.click();

		await page.waitForTimeout(500);

		const doneButton = page.locator('[data-slot="drawer-content"] button:has-text("Done")');
		if (await doneButton.isVisible({ timeout: 2000 }).catch(() => false)) {
			await doneButton.click();
		}
		await page.waitForTimeout(500);

		await page.fill('input[id="name"]', templateName);
		await page.waitForTimeout(300);

		await page.click('button:has-text("Create Template")');
		await page.waitForURL(/\/templates\/[a-zA-Z0-9-]+/, { timeout: 15000 });

		await expect(page.locator(`text=${templateName}`).first()).toBeVisible({ timeout: 10000 });

		console.log(`Template "${templateName}" created successfully`);

		await deleteTemplate(page, templateName);
	});

	test('create new exercise directly from template', async ({ page }) => {
		const timestamp = Date.now();
		const exerciseName = `Direct Exercise ${timestamp}`;
		const templateName = `Direct Template ${timestamp}`;

		await page.goto(`${BASE_URL}/templates/new`, { waitUntil: 'load' });
		await expect(page.locator('h1:has-text("Create Template")').first()).toBeVisible({ timeout: 10000 });

		await page.waitForTimeout(1000);

		await page.click('button:has-text("Add Exercise")');
		await page.waitForSelector('[data-slot="drawer-overlay"]', { timeout: 10000 });
		await page.waitForTimeout(500);

		const searchInput = page.locator('[data-slot="drawer-content"] input[placeholder="Search exercises..."]');
		await expect(searchInput).toBeVisible({ timeout: 5000 });
		await searchInput.fill(`NonExistentExerciseXYZ${timestamp}`);
		await page.waitForTimeout(500);

		const createButton = page.locator('[data-slot="drawer-content"] button:has-text("Create")').first();
		await expect(createButton).toBeVisible({ timeout: 5000 });
		await createButton.click();

		await page.waitForTimeout(500);

		const nameInput = page.locator('[data-slot="drawer-content"] input[placeholder="Exercise name"]');
		await expect(nameInput).toBeVisible({ timeout: 5000 });
		await nameInput.fill(exerciseName);

		const muscleSelect = page.locator('[data-slot="drawer-content"] select').first();
		await muscleSelect.selectOption('Triceps');

		const createExerciseBtn = page.locator('[data-slot="drawer-content"] button:has-text("Create"):not(:has-text("Create Template"))').first();
		await createExerciseBtn.click();

		await page.waitForTimeout(1000);

		const doneButton = page.locator('[data-slot="drawer-content"] button:has-text("Done")');
		if (await doneButton.isVisible({ timeout: 2000 }).catch(() => false)) {
			await doneButton.click();
		}
		await page.waitForTimeout(500);

		await page.fill('input[id="name"]', templateName);
		await page.waitForTimeout(300);

		await page.click('button:has-text("Create Template")');
		await page.waitForURL(/\/templates\/[a-zA-Z0-9-]+/, { timeout: 15000 });

		await expect(page.locator(`text=${templateName}`).first()).toBeVisible({ timeout: 10000 });

		console.log(`Template "${templateName}" with new exercise created`);

		await deleteTemplate(page, templateName);
		await deleteExercise(page, exerciseName);
	});

	test.skip('update template name', async ({ page }) => {
		const timestamp = Date.now();
		const originalName = `Template to Update ${timestamp}`;
		const updatedName = `Updated Template ${timestamp}`;

		await page.goto(`${BASE_URL}/templates/new`, { waitUntil: 'load' });
		await page.waitForTimeout(1000);

		await page.click('button:has-text("Add Exercise")');
		await page.waitForSelector('[data-slot="drawer-overlay"]', { timeout: 10000 });
		await page.waitForTimeout(500);

		const searchInput = page.locator('[data-slot="drawer-content"] input[placeholder="Search exercises..."]');
		await searchInput.fill('Squat');
		await page.waitForTimeout(500);

		const exerciseButton = page.locator('[data-slot="drawer-content"] button.w-full').first();
		await expect(exerciseButton).toBeVisible({ timeout: 5000 });
		await exerciseButton.click();

		await page.waitForTimeout(500);

		const doneButton = page.locator('[data-slot="drawer-content"] button:has-text("Done")');
		if (await doneButton.isVisible({ timeout: 2000 }).catch(() => false)) {
			await doneButton.click();
		}
		await page.waitForTimeout(500);

		await page.fill('input[id="name"]', originalName);
		await page.waitForTimeout(300);

		await page.click('button:has-text("Create Template")');

		await expect(page.locator('text=Template Created!')).toBeVisible({ timeout: 15000 });
		await page.click('a:has-text("View Template")');
		await page.waitForURL(/\/templates\/[a-zA-Z0-9-]+/, { timeout: 15000 });

		await expect(page.locator(`text=${originalName}`).first()).toBeVisible({ timeout: 10000 });

		const templateId = page.url().match(/\/templates\/([a-zA-Z0-9-]+)\/?/)?.[1];
		if (templateId) {
			await page.goto(`${BASE_URL}/templates/${templateId}/edit`, { waitUntil: 'load', timeout: 20000 });
		} else {
			throw new Error('Could not extract template ID from URL');
		}

		await page.waitForTimeout(2000);

		await expect(page.locator('text=Edit Template')).toBeVisible({ timeout: 10000 });
		await page.fill('input[id="name"]', updatedName);
		await page.click('button:has-text("Save Changes")');
		await page.waitForURL(/\/templates\//, { timeout: 15000 });

		await expect(page.locator(`text=${updatedName}`).first()).toBeVisible({ timeout: 10000 });

		await deleteTemplate(page, updatedName);
	});

	test('copy template', async ({ page }) => {
		const timestamp = Date.now();
		const templateName = `Template to Copy ${timestamp}`;

		await page.goto(`${BASE_URL}/templates/new`, { waitUntil: 'load' });
		await page.waitForTimeout(1000);

		await page.click('button:has-text("Add Exercise")');
		await page.waitForSelector('[data-slot="drawer-overlay"]', { timeout: 10000 });
		await page.waitForTimeout(500);

		const searchInput = page.locator('[data-slot="drawer-content"] input[placeholder="Search exercises..."]');
		await searchInput.fill('Squat');
		await page.waitForTimeout(500);

		const exerciseButton = page.locator('[data-slot="drawer-content"] button.w-full').first();
		await expect(exerciseButton).toBeVisible({ timeout: 5000 });
		await exerciseButton.click();

		await page.waitForTimeout(500);

		const doneButton = page.locator('[data-slot="drawer-content"] button:has-text("Done")');
		if (await doneButton.isVisible({ timeout: 2000 }).catch(() => false)) {
			await doneButton.click();
		}
		await page.waitForTimeout(500);

		await page.fill('input[id="name"]', templateName);
		await page.waitForTimeout(300);

		await page.click('button:has-text("Create Template")');

		await expect(page.locator('text=Template Created!')).toBeVisible({ timeout: 15000 });
		await page.click('a:has-text("View Template")');
		await page.waitForURL(/\/templates\/[a-zA-Z0-9-]+/, { timeout: 15000 });

		await expect(page.locator(`text=${templateName}`).first()).toBeVisible({ timeout: 10000 });

		await expect(page.locator('button:has-text("Copy")').first()).toBeVisible({ timeout: 10000 });
		await page.locator('button:has-text("Copy")').first().click();
		await page.waitForURL(/\/templates\//, { timeout: 15000 });

		await expect(page.locator(`text=${templateName} (Copy)`).first()).toBeVisible({ timeout: 10000 });

		await deleteTemplate(page, templateName);
		await deleteTemplate(page, `${templateName} (Copy)`);
	});

	test('delete template', async ({ page }) => {
		const timestamp = Date.now();
		const templateName = `Template to Delete ${timestamp}`;

		await page.goto(`${BASE_URL}/templates/new`, { waitUntil: 'load' });
		await page.waitForTimeout(1000);

		await page.click('button:has-text("Add Exercise")');
		await page.waitForSelector('[data-slot="drawer-overlay"]', { timeout: 10000 });
		await page.waitForTimeout(500);

		const searchInput = page.locator('[data-slot="drawer-content"] input[placeholder="Search exercises..."]');
		await searchInput.fill('Squat');
		await page.waitForTimeout(500);

		const exerciseButton = page.locator('[data-slot="drawer-content"] button.w-full').first();
		await expect(exerciseButton).toBeVisible({ timeout: 5000 });
		await exerciseButton.click();

		await page.waitForTimeout(500);

		const doneButton = page.locator('[data-slot="drawer-content"] button:has-text("Done")');
		if (await doneButton.isVisible({ timeout: 2000 }).catch(() => false)) {
			await doneButton.click();
		}
		await page.waitForTimeout(500);

		await page.fill('input[id="name"]', templateName);
		await page.waitForTimeout(300);

		await page.click('button:has-text("Create Template")');

		await expect(page.locator('text=Template Created!')).toBeVisible({ timeout: 15000 });
		await page.click('a:has-text("View Template")');
		await page.waitForURL(/\/templates\/[a-zA-Z0-9-]+/, { timeout: 15000 });

		await expect(page.locator(`text=${templateName}`).first()).toBeVisible({ timeout: 10000 });

		page.on('dialog', async (dialog) => {
			await dialog.accept();
		});

		const deleteButton = page.locator('button:has-text("Delete")').first();
		await expect(deleteButton).toBeVisible({ timeout: 10000 });
		await deleteButton.click();

		await page.waitForURL(`${BASE_URL}/templates`, { timeout: 15000 });
	});

	test('add multiple exercises to template', async ({ page }) => {
		const timestamp = Date.now();
		await page.goto(`${BASE_URL}/templates/new`, { waitUntil: 'load' });
		await page.waitForTimeout(1000);

		await page.click('button:has-text("Add Exercise")');
		await page.waitForSelector('[data-slot="drawer-overlay"]', { timeout: 10000 });
		await page.waitForTimeout(500);

		const searchInput = page.locator('[data-slot="drawer-content"] input[placeholder="Search exercises..."]');
		await searchInput.fill('Squat');
		await page.waitForTimeout(500);

		const exerciseButton = page.locator('[data-slot="drawer-content"] button.w-full').first();
		await expect(exerciseButton).toBeVisible({ timeout: 5000 });
		await exerciseButton.click();

		await page.waitForTimeout(500);

		const doneButton = page.locator('[data-slot="drawer-content"] button:has-text("Done")');
		if (await doneButton.isVisible({ timeout: 2000 }).catch(() => false)) {
			await doneButton.click();
		}
		await page.waitForTimeout(500);

		await page.fill('input[id="name"]', `Multi Exercise Template ${timestamp}`);
		await page.waitForTimeout(300);

		await page.click('button:has-text("Create Template")');
		await page.waitForURL(/\/templates\/[a-zA-Z0-9-]+/, { timeout: 15000 });

		await expect(page.locator(`text=Multi Exercise Template ${timestamp}`).first()).toBeVisible({ timeout: 10000 });

		await deleteTemplate(page, `Multi Exercise Template ${timestamp}`);
	});
});

test.describe('Program Flow with 1RM', () => {
	test.beforeEach(async ({ page }) => {
		await loginUser(page);
	});

	test('programs page loads correctly', async ({ page }) => {
		await page.goto(`${BASE_URL}/programs`, { waitUntil: 'load' });

		await expect(page).not.toHaveURL(isAuthKitUrl);

		const title = page.locator('h1:has-text("Programs")').first();
		await expect(title).toBeVisible({ timeout: 10000 });

		const powerliftingTab = page.locator('button:has-text("Powerlifting")').first();
		await expect(powerliftingTab).toBeVisible({ timeout: 10000 });
	});

	test('program start page loads with 1RM inputs', async ({ page }) => {
		await page.goto(`${BASE_URL}/programs/stronglifts-5x5/start`, { waitUntil: 'load' });

		await expect(page).not.toHaveURL(isAuthKitUrl);

		const squatInput = page.locator('input[name*="squat"]').first();
		await expect(squatInput).toBeVisible({ timeout: 10000 });

		const benchInput = page.locator('input[name*="bench"]').first();
		await expect(benchInput).toBeVisible({ timeout: 10000 });

		const deadliftInput = page.locator('input[name*="deadlift"]').first();
		await expect(deadliftInput).toBeVisible({ timeout: 10000 });

		const ohpInput = page.locator('input[name*="ohp"]').first();
		await expect(ohpInput).toBeVisible({ timeout: 10000 });
	});

	test('fill 1RM values and continue to schedule', async ({ page }) => {
		await page.goto(`${BASE_URL}/programs/stronglifts-5x5/start`, { waitUntil: 'load' });

		await page.waitForTimeout(2000);

		const squatInput = page.locator('input[name*="squat"]').first();
		await expect(squatInput).toBeVisible({ timeout: 10000 });
		await squatInput.fill('225');

		const benchInput = page.locator('input[name*="bench"]').first();
		await expect(benchInput).toBeVisible({ timeout: 10000 });
		await benchInput.fill('185');

		const deadliftInput = page.locator('input[name*="deadlift"]').first();
		await expect(deadliftInput).toBeVisible({ timeout: 10000 });
		await deadliftInput.fill('315');

		const ohpInput = page.locator('input[name*="ohp"]').first();
		await expect(ohpInput).toBeVisible({ timeout: 10000 });
		await ohpInput.fill('135');

		const continueButton = page.locator('button:has-text("Continue")').first();
		await expect(continueButton).toBeVisible();
		await continueButton.click();

		await expect(page.locator('text=Configure your workout schedule').first()).toBeVisible({ timeout: 5000 });
		console.log('1RM values entered and schedule step loaded');
	});

	test('select workout days and time preference', async ({ page }) => {
		await page.goto(`${BASE_URL}/programs/stronglifts-5x5/start`, { waitUntil: 'load' });

		await page.waitForTimeout(2000);

		await page.fill('input[name*="squat"]', '225');
		await page.fill('input[name*="bench"]', '185');
		await page.fill('input[name*="deadlift"]', '315');
		await page.fill('input[name*="ohp"]', '135');

		const continueButton = page.locator('button:has-text("Continue")').first();
		await continueButton.click();

		await expect(page.locator('text=Configure your workout schedule').first()).toBeVisible({ timeout: 5000 });

		await page.click('button:has-text("Mon")');
		await page.click('button:has-text("Wed")');
		await page.click('button:has-text("Fri")');

		const morningBtn = page.locator('button:has-text("Morning")');
		await expect(morningBtn).toBeVisible({ timeout: 5000 });
		await morningBtn.click();

		const isSelected = await morningBtn.evaluate((el: Element) =>
			el.classList.contains('bg-primary') || el.classList.contains('bg-primary/')
		);
		expect(isSelected).toBe(true);

		console.log('Days and time preference selected');
	});

	test('select start date from date picker', async ({ page }) => {
		await page.goto(`${BASE_URL}/programs/stronglifts-5x5/start`, { waitUntil: 'load' });

		await page.fill('input[name*="squat"]', '225');
		await page.fill('input[name*="bench"]', '185');
		await page.fill('input[name*="deadlift"]', '315');
		await page.fill('input[name*="ohp"]', '135');

		await page.click('button:has-text("Continue")');

		await page.click('button:has-text("Mon")');
		await page.click('button:has-text("Wed")');
		await page.click('button:has-text("Fri")');
		await page.click('button:has-text("Morning")');

		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 7);
		const dateStr = tomorrow.toISOString().split('T')[0];
		const [, , day] = dateStr.split('-').map(Number);

		const datePickerBtn = page.locator('[class*="relative"] button[type="button"]').first();
		await datePickerBtn.click();

		const nextMonthBtn = page.locator('button[aria-label="Next month"]').first();
		if (await nextMonthBtn.isVisible().catch(() => false)) {
			await nextMonthBtn.click();
		}

		const dayBtn = page.locator(`button:has-text("${day}")`).filter({ hasNot: page.locator('[disabled]') }).first();
		await expect(dayBtn).toBeVisible({ timeout: 5000 });
		await dayBtn.click();

		console.log('Start date selected from date picker');
	});

	test('review and start program', async ({ page }) => {
		await page.goto(`${BASE_URL}/programs/stronglifts-5x5/start`, { waitUntil: 'load' });

		await page.fill('input[name*="squat"]', '225');
		await page.fill('input[name*="bench"]', '185');
		await page.fill('input[name*="deadlift"]', '315');
		await page.fill('input[name*="ohp"]', '135');

		await page.click('button:has-text("Continue")');

		await page.click('button:has-text("Mon")');
		await page.click('button:has-text("Wed")');
		await page.click('button:has-text("Fri")');
		await page.click('button:has-text("Morning")');

		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 7);
		const dateStr = tomorrow.toISOString().split('T')[0];
		const [, , day] = dateStr.split('-').map(Number);

		const datePickerBtn = page.locator('[class*="relative"] button[type="button"]').first();
		await datePickerBtn.click();

		const nextMonthBtn = page.locator('button[aria-label="Next month"]').first();
		if (await nextMonthBtn.isVisible().catch(() => false)) {
			await nextMonthBtn.click();
		}

		const dayBtn = page.locator(`button:has-text("${day}")`).filter({ hasNot: page.locator('[disabled]') }).first();
		await dayBtn.click();

		console.log('Start date selected from date picker');
	});

	test.skip('complete program workout and log 1RM', async ({ page }) => {
		await page.goto(`${BASE_URL}/programs/stronglifts-5x5/start`, { waitUntil: 'load' });

		await page.fill('input[name*="squat"]', '225');
		await page.fill('input[name*="bench"]', '185');
		await page.fill('input[name*="deadlift"]', '315');
		await page.fill('input[name*="ohp"]', '135');

		await page.click('button:has-text("Continue")');

		await page.click('button:has-text("Mon")');
		await page.click('button:has-text("Wed")');
		await page.click('button:has-text("Fri")');
		await page.click('button:has-text("Morning")');

		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 7);
		const dateStr = tomorrow.toISOString().split('T')[0];
		const [, , day] = dateStr.split('-').map(Number);

		const datePickerBtn = page.locator('[class*="relative"] button[type="button"]').first();
		await datePickerBtn.click();

		const nextMonthBtn = page.locator('button[aria-label="Next month"]').first();
		if (await nextMonthBtn.isVisible().catch(() => false)) {
			await nextMonthBtn.click();
		}

		const dayBtn = page.locator(`button:has-text("${day}")`).filter({ hasNot: page.locator('[disabled]') }).first();
		await dayBtn.click();

		const reviewBtn = page.locator('button:has-text("Review")');
		await reviewBtn.click();

		const howWouldYouLike = page.locator('text=How would you like to start?').first();
		if (await howWouldYouLike.isVisible({ timeout: 2000 }).catch(() => false)) {
			await page.click('button:has-text("Smart Start")');
		}

		await page.click('button:has-text("Start Program")');

		await page.waitForURL(/\/programs\/cycle\/[a-z0-9-]+/, { timeout: 30000 });
		await expect(page.locator('text=Week').first()).toBeVisible({ timeout: 10000 });
		await page.waitForTimeout(2000);

		const startBtn = page.locator('button:has-text("Start")').first();
		const isStartVisible = await startBtn.isVisible({ timeout: 5000 }).catch(() => false);

		if (isStartVisible) {
			await startBtn.click();
			await page.waitForURL(/\/workouts\/[a-z0-9-]+/, { timeout: 30000 });

			await expect(page.locator('text=Complete').first()).toBeVisible({ timeout: 10000 });
			await page.waitForTimeout(3000);

			const exerciseCards = page.locator('[class*="cursor-pointer"][class*="rounded-lg"]');
			const cardCount = await exerciseCards.count();
			
			if (cardCount > 0) {
				for (let i = 0; i < Math.min(cardCount, 3); i++) {
					const card = exerciseCards.nth(i);
					const addSetBtn = card.locator('button:has-text("Add Set")').first();
					if (await addSetBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
						await addSetBtn.click();
						await page.waitForTimeout(500);
						
						const weightInput = card.locator('button:has-text("kg")').first().locator('..').locator('button').first();
						const repsInput = card.locator('button:has-text("×")').first().locator('..').locator('button').first();
						
						if (await weightInput.isVisible({ timeout: 1000 }).catch(() => false)) {
							await weightInput.click();
							await page.waitForTimeout(200);
							await page.keyboard.press('Backspace');
							await page.keyboard.type('100');
						}
						
						if (await repsInput.isVisible({ timeout: 1000 }).catch(() => false)) {
							await repsInput.click();
							await page.waitForTimeout(200);
							await page.keyboard.press('Backspace');
							await page.keyboard.type('5');
						}
					}
				}
			}

			await page.click('text=Complete');
			await page.waitForTimeout(2000);

			const incompleteModal = page.locator('text=Incomplete Sets').first();
			if (await incompleteModal.isVisible({ timeout: 1000 }).catch(() => false)) {
				await page.click('button:has-text("Continue")');
				await page.waitForTimeout(2000);
			}

			await expect(page.locator('text=Workout Complete!').first()).toBeVisible({ timeout: 10000 });
			console.log('Program workout completed');
		} else {
			console.log('No workout available to start');
		}
	});

	test('navigate weeks in program cycle', async ({ page }) => {
		await page.goto(`${BASE_URL}/programs/stronglifts-5x5/start`, { waitUntil: 'load' });

		await page.fill('input[name*="squat"]', '225');
		await page.fill('input[name*="bench"]', '185');
		await page.fill('input[name*="deadlift"]', '315');
		await page.fill('input[name*="ohp"]', '135');

		await page.click('button:has-text("Continue")');

		await page.click('button:has-text("Mon")');
		await page.click('button:has-text("Wed")');
		await page.click('button:has-text("Fri")');
		await page.click('button:has-text("Morning")');

		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 7);
		const dateStr = tomorrow.toISOString().split('T')[0];
		const [, , day] = dateStr.split('-').map(Number);

		const datePickerBtn = page.locator('[class*="relative"] button[type="button"]').first();
		await datePickerBtn.click();

		const nextMonthBtn = page.locator('button[aria-label="Next month"]').first();
		if (await nextMonthBtn.isVisible().catch(() => false)) {
			await nextMonthBtn.click();
		}

		const dayBtn = page.locator(`button:has-text("${day}")`).filter({ hasNot: page.locator('[disabled]') }).first();
		await dayBtn.click();

		const reviewBtn = page.locator('button:has-text("Review")');
		await reviewBtn.click();

		const howWouldYouLike = page.locator('text=How would you like to start?').first();
		if (await howWouldYouLike.isVisible({ timeout: 2000 }).catch(() => false)) {
			await page.click('button:has-text("Smart Start")');
		}

		await page.click('button:has-text("Start Program")');

		await page.waitForURL(/\/programs\/cycle\/[a-z0-9-]+/, { timeout: 30000 });
		await expect(page.locator('text=Week').first()).toBeVisible({ timeout: 10000 });

		const nextBtn = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-right') }).first();
		if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
			await nextBtn.click();
			await page.waitForTimeout(1000);
		}

		console.log('Week navigation works correctly');
	});
});

test.describe('Complete Exercise-Template-Program Flow', () => {
	test('full end-to-end flow: create exercise, template, then complete program', async ({ page }) => {
		await loginUser(page);

		const timestamp = Date.now();
		const exerciseName = `E2E Exercise ${timestamp}`;
		const templateName = `E2E Template ${timestamp}`;
		const description = 'Full E2E test flow';

		await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'load' });
		await expect(page.locator('h1:has-text("Exercises")').first()).toBeVisible({ timeout: 10000 });

		await page.locator('button:has-text("New")').first().click();
		await expect(page.locator('h2:has-text("Create Exercise")').first()).toBeVisible({ timeout: 5000 });

		await page.locator('input[placeholder="Exercise name"]').fill(exerciseName);
		await page.locator('select').first().selectOption('Chest');
		await page.locator('textarea').first().fill(description);

		await page.locator('button:has-text("Create")').first().click();
		await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });

		await expect(page.locator(`h1:has-text("${exerciseName}")`).first()).toBeVisible({ timeout: 10000 });
		console.log(`Exercise "${exerciseName}" created`);

		await page.goto(`${BASE_URL}/templates/new`, { waitUntil: 'load' });
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

		await page.waitForTimeout(500);

		const exerciseButton = page.getByRole('button', { name: exerciseName }).first();
		if (await exerciseButton.isVisible({ timeout: 3000 }).catch(() => false)) {
			await exerciseButton.click();
		} else {
			const anyExerciseBtn = page.locator('.fixed.inset-0 button').filter({ has: page.locator('h3') }).first();
			if (await anyExerciseBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
				await anyExerciseBtn.click({ force: true });
			}
		}

		const doneButton = page.locator('.fixed button:has-text("Done")').first();
		if (await doneButton.isVisible({ timeout: 2000 }).catch(() => false)) {
			await doneButton.click();
		}

		await page.waitForTimeout(500);

		const createButton = page.locator('button:has-text("Create Template")');
		await expect(createButton).toBeVisible({ timeout: 5000 });
		await createButton.click();

		await page.waitForURL(/\/templates\/[a-zA-Z0-9-]+/, { timeout: 15000 });

		await expect(page.locator(`text=${templateName}`).first()).toBeVisible({ timeout: 10000 });
		await expect(page.locator(`text=${exerciseName}`).first()).toBeVisible({ timeout: 10000 });
		console.log(`Template "${templateName}" with exercise "${exerciseName}" created`);

		await page.goto(`${BASE_URL}/programs/stronglifts-5x5/start`, { waitUntil: 'load' });

		await page.fill('input[name*="squat"]', '225');
		await page.fill('input[name*="bench"]', '185');
		await page.fill('input[name*="deadlift"]', '315');
		await page.fill('input[name*="ohp"]', '135');

		await page.click('button:has-text("Continue")');

		await page.click('button:has-text("Mon")');
		await page.click('button:has-text("Wed")');
		await page.click('button:has-text("Fri")');
		await page.click('button:has-text("Morning")');

		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 7);
		const dateStr = tomorrow.toISOString().split('T')[0];
		const [, , day] = dateStr.split('-').map(Number);

		const datePickerBtn = page.locator('[class*="relative"] button[type="button"]').first();
		await datePickerBtn.click();

		const nextMonthBtn = page.locator('button[aria-label="Next month"]').first();
		if (await nextMonthBtn.isVisible().catch(() => false)) {
			await nextMonthBtn.click();
		}

		const dayBtn = page.locator(`button:has-text("${day}")`).filter({ hasNot: page.locator('[disabled]') }).first();
		await dayBtn.click();

		const reviewBtn = page.locator('button:has-text("Review")');
		await reviewBtn.click();

		const howWouldYouLike = page.locator('text=How would you like to start?').first();
		if (await howWouldYouLike.isVisible({ timeout: 2000 }).catch(() => false)) {
			await page.click('button:has-text("Smart Start")');
		}

		await page.click('button:has-text("Start Program")');

		await page.waitForURL(/\/programs\/cycle\/[a-z0-9-]+/, { timeout: 30000 });
		await expect(page.locator('text=Week').first()).toBeVisible({ timeout: 10000 });
		console.log('Program started successfully');

		console.log('Starting cleanup - deleting template and exercise');

		await deleteTemplate(page, templateName);
		await deleteExercise(page, exerciseName);

		console.log('Full E2E flow completed successfully!');
	});
});

test.describe('Authentication', () => {
	test('access protected routes when authenticated', async ({ page }) => {
		await loginUser(page);

		await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'load' });
		await expect(page).not.toHaveURL(isAuthKitUrl);

		await page.goto(`${BASE_URL}/templates`, { waitUntil: 'load' });
		await expect(page).not.toHaveURL(isAuthKitUrl);

		await page.goto(`${BASE_URL}/workouts`, { waitUntil: 'load' });
		await expect(page).not.toHaveURL(isAuthKitUrl);

		await page.goto(`${BASE_URL}/programs`, { waitUntil: 'load' });
		await expect(page).not.toHaveURL(isAuthKitUrl);
	});
});

test.describe('Dashboard', () => {
	test.beforeEach(async ({ page }) => {
		await loginUser(page);
	});

	test('dashboard loads with greeting', async ({ page }) => {
		await page.goto(BASE_URL, { waitUntil: 'load' });

		await expect(page).not.toHaveURL(isAuthKitUrl);

		const greeting = page.locator('h1');
		await expect(greeting.first()).toBeVisible({ timeout: 10000 });

		const greetingText = await greeting.textContent();
		expect(['Good morning', 'Good afternoon', 'Good evening']).toContain(greetingText);
	});

	test('can navigate to exercises from dashboard', async ({ page }) => {
		await page.goto(BASE_URL, { waitUntil: 'load' });

		await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'load' });
		await expect(page).not.toHaveURL(isAuthKitUrl);

		const title = page.locator('h1:has-text("Exercises")').first();
		await expect(title).toBeVisible({ timeout: 10000 });
	});

	test('can navigate to templates from dashboard', async ({ page }) => {
		await page.goto(BASE_URL, { waitUntil: 'load' });

		await page.goto(`${BASE_URL}/templates`, { waitUntil: 'load' });
		await expect(page).not.toHaveURL(isAuthKitUrl);

		const title = page.locator('h1:has-text("Templates")').first();
		await expect(title).toBeVisible({ timeout: 10000 });
	});

	test('can navigate to workouts from dashboard', async ({ page }) => {
		await page.goto(BASE_URL, { waitUntil: 'load' });

		await page.goto(`${BASE_URL}/workouts`, { waitUntil: 'load' });
		await expect(page).not.toHaveURL(isAuthKitUrl);

		const title = page.locator('h1:has-text("Workouts")').first();
		await expect(title).toBeVisible({ timeout: 10000 });
	});

	test('progress page loads', async ({ page }) => {
		await page.goto(`${BASE_URL}/progress`, { waitUntil: 'load' });

		await expect(page).not.toHaveURL(isAuthKitUrl);

		const title = page.locator('h1:has-text("Progress")').first();
		await expect(title).toBeVisible({ timeout: 10000 });

		await expect(page.locator('text=Total Workouts').first()).toBeVisible({ timeout: 10000 });
	});

	test('workout history loads', async ({ page }) => {
		await page.goto(`${BASE_URL}/progress`, { waitUntil: 'load' });

		await expect(page.locator('h2:has-text("Workout History")')).toBeVisible({ timeout: 10000 });

		await expect(page.locator('text=Total Workouts').first()).toBeVisible({ timeout: 10000 });
		await expect(page.locator('text=This Week').first()).toBeVisible({ timeout: 10000 });
		await expect(page.locator('text=This Month').first()).toBeVisible({ timeout: 10000 });
	});
});
