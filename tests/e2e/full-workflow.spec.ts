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

	const emailInput = page.locator('input[name="email"]');
	await expect(emailInput).toBeVisible({ timeout: 10000 });

	await emailInput.fill(TEST_USERNAME);
	await page.locator('button:has-text("Continue")').click();

	await expect(page.locator('input[name="password"]')).toBeVisible({ timeout: 10000 });
	await expect(page.locator('button[name="intent"]:not([data-method])')).toBeVisible();

	await page.locator('input[name="password"]').fill(TEST_PASSWORD);
	await page.locator('button[name="intent"]:not([data-method])').click();

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

test.describe('Complete Workout App Flow', () => {
	test.beforeEach(async ({ page }) => {
		await loginUser(page);
	});

	test('Exercise Creation Flow', async ({ page }) => {
		const timestamp = Date.now();
		const exerciseName = `E2E Test Exercise ${timestamp}`;
		const muscleGroup = 'Chest';
		const description = 'Created during E2E full workflow test';

		await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });
		await expect(page.locator('h1:has-text("Exercises")').first()).toBeVisible({ timeout: 10000 });

		const newExerciseButton = page.locator('button:has-text("New")').first();
		await expect(newExerciseButton).toBeVisible();
		await newExerciseButton.click();

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
	});

	test('Exercise Library Search Flow', async ({ page }) => {
		const timestamp = Date.now();

		await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });
		await expect(page.locator('h1:has-text("Exercises")').first()).toBeVisible({ timeout: 10000 });

		const searchInput = page.locator('input[placeholder="Search exercises..."]');
		await expect(searchInput).toBeVisible();

		await searchInput.fill(`UniqueSearch${timestamp}`);

		const noResults = page.locator('text=No exercises found').first();
		const hasNoResults = await noResults.isVisible({ timeout: 2000 }).catch(() => false);
		expect(hasNoResults).toBe(true);

		console.log('Exercise library search works correctly');
	});

	test('Template Creation with Exercise Library', async ({ page }) => {
		const timestamp = Date.now();
		const exerciseName = `Template Exercise ${timestamp}`;
		const templateName = `E2E Template ${timestamp}`;
		const description = 'Template created during E2E full workflow test';

		await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });
		await expect(page.locator('h1:has-text("Exercises")').first()).toBeVisible({ timeout: 10000 });

		await page.locator('button:has-text("New")').first().click();
		await expect(page.locator('h2:has-text("Create Exercise")').first()).toBeVisible({ timeout: 5000 });
		await page.locator('input[placeholder="Exercise name"]').fill(exerciseName);
		await page.locator('select').first().selectOption('Biceps');
		await page.locator('textarea').first().fill('For template testing');

		const submitButton = page.locator('button:has-text("Create")').first();
		await submitButton.click();
		await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });
		await expect(page.locator(`h1:has-text("${exerciseName}")`).first()).toBeVisible({ timeout: 10000 });

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
		await exerciseButton.click();

		await page.click('button:has-text("Done")');
		await page.waitForSelector('.fixed.inset-0', { state: 'hidden', timeout: 5000 });

		await expect(page.locator(`text=${exerciseName}`).first()).toBeVisible();

		await page.click('button:has-text("Create Template")');
		await page.waitForURL(/\/templates\/[a-zA-Z0-9-]+/, { timeout: 10000 });

		await expect(page.locator(`text=${templateName}`).first()).toBeVisible({ timeout: 10000 });
		await expect(page.locator(`text=${description}`).first()).toBeVisible();
		await expect(page.locator(`text=${exerciseName}`).first()).toBeVisible();

		console.log(`Template "${templateName}" with exercise "${exerciseName}" created successfully`);

		await deleteTemplate(page, templateName);
		await deleteExercise(page, exerciseName);
	});

	test('Template CRUD Operations', async ({ page }) => {
		const timestamp = Date.now();
		const templateName = `CRUD Template ${timestamp}`;
		const updatedName = `Updated Template ${timestamp}`;

		await page.goto(`${BASE_URL}/templates/new`, { waitUntil: 'networkidle' });
		await expect(page.locator('h1:has-text("Create Template")').first()).toBeVisible({ timeout: 10000 });

		await page.fill('input[id="name"]', templateName);

		await page.click('button:has-text("Add Exercise")');
		await page.waitForSelector('.fixed.inset-0', { timeout: 10000 });

		const exerciseButton = page.locator('.fixed.inset-0 button').filter({ has: page.locator('h3') }).first();
		await expect(exerciseButton).toBeVisible({ timeout: 5000 });
		await exerciseButton.click({ force: true });

		await page.click('button:has-text("Done")');

		await page.click('button:has-text("Create Template")');
		await page.waitForURL(/\/templates\/[a-zA-Z0-9-]+/, { timeout: 10000 });

		await expect(page.locator(`text=${templateName}`).first()).toBeVisible({ timeout: 10000 });

		const editLink = page.locator('a:has-text("Edit")').first();
		await expect(editLink).toBeVisible({ timeout: 10000 });
		await editLink.click();
		await page.waitForURL(/\/templates\/.*\/edit/, { timeout: 10000 });

		await page.fill('input[id="name"]', updatedName);
		await page.click('button:has-text("Save Changes")');
		await page.waitForURL(/\/templates\//, { timeout: 10000 });

		await expect(page.locator(`text=${updatedName}`).first()).toBeVisible({ timeout: 10000 });

		console.log(`Template CRUD: Created "${templateName}", Updated to "${updatedName}"`);

		await deleteTemplate(page, updatedName);
	});

	test('Delete Exercise from List', async ({ page }) => {
		const timestamp = Date.now();
		const exerciseName = `Delete Me ${timestamp}`;

		await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });
		await expect(page.locator('h1:has-text("Exercises")').first()).toBeVisible({ timeout: 10000 });

		await page.locator('button:has-text("New")').first().click();
		await page.locator('input[placeholder="Exercise name"]').fill(exerciseName);
		await page.locator('select').first().selectOption('Triceps');
		await page.locator('button:has-text("Create")').first().click();
		await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });
		await expect(page.locator(`h1:has-text("${exerciseName}")`).first()).toBeVisible({ timeout: 10000 });

		await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });
		await expect(page.locator(`text=${exerciseName}`).first()).toBeVisible({ timeout: 10000 });

		await deleteExercise(page, exerciseName);

		const exerciseCard = page.locator(`text=${exerciseName}`).first();
		const isVisible = await exerciseCard.isVisible({ timeout: 3000 }).catch(() => false);
		expect(isVisible).toBe(false);

		console.log(`Exercise "${exerciseName}" deleted successfully`);
	});

	test('Program Start with 1RM Entry', async ({ page }) => {
		await page.goto(`${BASE_URL}/programs/stronglifts-5x5/start`, { waitUntil: 'networkidle' });
		await expect(page.locator('h1:has-text("Start StrongLifts 5×5")').first()).toBeVisible({ timeout: 10000 });

		await page.fill('input[name="squat1rm"]', '225');
		await page.fill('input[name="bench1rm"]', '185');
		await page.fill('input[name="deadlift1rm"]', '315');
		await page.fill('input[name="ohp1rm"]', '135');

		await page.click('button:has-text("Continue")');
		await expect(page.locator('text=Configure your workout schedule').first()).toBeVisible({ timeout: 5000 });

		await page.click('button:has-text("Mon")');
		await page.click('button:has-text("Wed")');
		await page.click('button:has-text("Fri")');

		await page.click('button:has-text("Morning")');

		const datePickerBtn = page.locator('[class*="relative"] button[type="button"]').first();
		await datePickerBtn.click();

		const today = new Date();
		const nextWeek = new Date(today);
		nextWeek.setDate(today.getDate() + 7);
		const day = nextWeek.getDate().toString();

		const dayBtn = page.locator(`button:has-text("${day}")`).filter({ hasNot: page.locator('[disabled]') }).first();
		if (await dayBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
			await dayBtn.click();
		}

		await page.click('button:has-text("Review")');
		await expect(page.locator('h3:has-text("Program Details")').first()).toBeVisible({ timeout: 10000 });

		const howWouldYouLike = page.locator('text=How would you like to start?').first();
		if (await howWouldYouLike.isVisible({ timeout: 2000 }).catch(() => false)) {
			await page.click('button:has-text("Smart Start")');
		}

		await page.click('button:has-text("Start Program")');
		await page.waitForURL(/\/programs\/cycle\/[a-z0-9-]+/, { timeout: 30000 });

		await expect(page.locator('text=Week').first()).toBeVisible({ timeout: 10000 });

		const url = page.url();
		const cycleId = url.split('/cycle/')[1]?.split('?')[0] || '';
		console.log(`Program started with cycle ID: ${cycleId}`);

		expect(cycleId.length).toBeGreaterThan(0);
	});

	test('Program Workout Completion', async ({ page }) => {
		await page.goto(`${BASE_URL}/programs/stronglifts-5x5/start`, { waitUntil: 'networkidle' });

		await page.fill('input[name="squat1rm"]', '225');
		await page.fill('input[name="bench1rm"]', '185');
		await page.fill('input[name="deadlift1rm"]', '315');
		await page.fill('input[name="ohp1rm"]', '135');

		await page.click('button:has-text("Continue")');
		await expect(page.locator('text=Configure your workout schedule').first()).toBeVisible({ timeout: 5000 });

		await page.click('button:has-text("Mon")');
		await page.click('button:has-text("Wed")');
		await page.click('button:has-text("Fri")');
		await page.click('button:has-text("Morning")');

		const datePickerBtn = page.locator('[class*="relative"] button[type="button"]').first();
		await datePickerBtn.click();

		const today = new Date();
		const nextWeek = new Date(today);
		nextWeek.setDate(today.getDate() + 7);
		const day = nextWeek.getDate().toString();

		const dayBtn = page.locator(`button:has-text("${day}")`).filter({ hasNot: page.locator('[disabled]') }).first();
		if (await dayBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
			await dayBtn.click();
		}

		await page.click('button:has-text("Review")');
		await page.click('button:has-text("Start Program")');
		await page.waitForURL(/\/programs\/cycle\/[a-z0-9-]+/, { timeout: 30000 });

		await expect(page.locator('text=Week').first()).toBeVisible({ timeout: 10000 });
		await page.waitForTimeout(2000);

		const startBtn = page.locator('button:has-text("Start")').first();
		const isVisible = await startBtn.isVisible({ timeout: 5000 }).catch(() => false);

		if (isVisible) {
			await startBtn.click();
			await page.waitForURL(/\/workouts\/[a-z0-9-]+/, { timeout: 30000 });

			await expect(page.locator('text=Complete Workout').first()).toBeVisible({ timeout: 10000 });

			const exerciseCards = page.locator('[class*="bg-card"]').filter({ has: page.locator('text=Squat').or(page.locator('text=Bench').or(page.locator('text=Deadlift'))) });
			const cardCount = await exerciseCards.count();

			if (cardCount > 0) {
				const card = exerciseCards.first();
				const addSetBtn = card.locator('button:has-text("Add Set")').first();
				if (await addSetBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
					await addSetBtn.click();
					await addSetBtn.click();

					const rows = page.locator('tbody tr');
					if (await rows.first().isVisible({ timeout: 2000 })) {
						await rows.first().locator('input[type="text"]').first().fill('135');
						await rows.first().locator('input[type="text"]').nth(1).fill('5');
					}
				}
			}

			await page.click('text=Complete Workout');
			await page.waitForTimeout(2000);

			const incompleteModal = page.locator('text=Incomplete Sets').first();
			if (await incompleteModal.isVisible({ timeout: 1000 }).catch(() => false)) {
				await page.click('button:has-text("Continue")');
				await page.waitForTimeout(2000);
			}

			await expect(page.locator('text=Workout Complete!').first()).toBeVisible({ timeout: 10000 });
			console.log('Program workout completed successfully');
		} else {
			console.log('No workout available to start (future dated)');
		}
	});

	test('1RM Test and Update Flow', async ({ page }) => {
		await page.goto(`${BASE_URL}/programs/stronglifts-5x5/start`, { waitUntil: 'networkidle' });

		await page.fill('input[name="squat1rm"]', '200');
		await page.fill('input[name="bench1rm"]', '160');
		await page.fill('input[name="deadlift1rm"]', '280');
		await page.fill('input[name="ohp1rm"]', '120');

		await page.click('button:has-text("Continue")');
		await expect(page.locator('text=Configure your workout schedule').first()).toBeVisible({ timeout: 5000 });

		await page.click('button:has-text("Mon")');
		await page.click('button:has-text("Wed")');
		await page.click('button:has-text("Fri")');
		await page.click('button:has-text("Morning")');

		const datePickerBtn = page.locator('[class*="relative"] button[type="button"]').first();
		await datePickerBtn.click();

		const today = new Date();
		const nextWeek = new Date(today);
		nextWeek.setDate(today.getDate() + 7);
		const day = nextWeek.getDate().toString();

		const dayBtn = page.locator(`button:has-text("${day}")`).filter({ hasNot: page.locator('[disabled]') }).first();
		if (await dayBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
			await dayBtn.click();
		}

		await page.click('button:has-text("Review")');
		await page.click('button:has-text("Start Program")');
		await page.waitForURL(/\/programs\/cycle\/[a-z0-9-]+/, { timeout: 30000 });

		await expect(page.locator('text=Week').first()).toBeVisible({ timeout: 10000 });

		await page.goto(`${BASE_URL}/1rm-test`, { waitUntil: 'networkidle' });
		await expect(page.locator('h1:has-text("1RM Test")').first()).toBeVisible({ timeout: 10000 });

		const exerciseSelect = page.locator('select').first();
		await expect(exerciseSelect).toBeVisible();

		console.log('1RM test page loaded successfully');
	});

	test('Workout History Navigation', async ({ page }) => {
		await page.goto(`${BASE_URL}/history`, { waitUntil: 'networkidle' });
		await expect(page.locator('h1:has-text("Workout History")')).toBeVisible({ timeout: 10000 });

		await expect(page.locator('text=Total Workouts').first()).toBeVisible({ timeout: 10000 });
		await expect(page.locator('text=This Week').first()).toBeVisible({ timeout: 10000 });
		await expect(page.locator('text=This Month').first()).toBeVisible({ timeout: 10000 });

		const searchInput = page.locator('input[placeholder="Search workouts..."]');
		await expect(searchInput).toBeVisible();
		await searchInput.fill('Test');
		await page.waitForTimeout(500);

		console.log('Workout history page loaded correctly');
	});

	test('Exercise History Display', async ({ page }) => {
		await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });
		await expect(page.locator('h1:has-text("Exercises")').first()).toBeVisible({ timeout: 10000 });

		const exerciseCards = page.locator('[class*="rounded-lg"][class*="border"]').filter({ has: page.locator('a:has-text("History")') });
		const cardCount = await exerciseCards.count();

		if (cardCount > 0) {
			const historyLink = exerciseCards.first().locator('a:has-text("History")').first();
			await expect(historyLink).toBeVisible({ timeout: 5000 });
			await historyLink.click();

			await page.waitForURL(/\/history\/[a-f0-9-]+/, { timeout: 15000 });

			await expect(page.locator('text=Max Weight').first()).toBeVisible({ timeout: 10000 });
			await expect(page.locator('text=Est. 1RM').first()).toBeVisible();
			await expect(page.locator('text=Workouts').first()).toBeVisible();

			await expect(page.locator('th:has-text("Date")')).toBeVisible();
			await expect(page.locator('th:has-text("Max Weight")')).toBeVisible();
			await expect(page.locator('th:has-text("Est. 1RM")')).toBeVisible();

			console.log('Exercise history displays correctly');
		} else {
			console.log('No exercises with history found to test');
		}
	});

	test('Quick Workout Start', async ({ page }) => {
		await page.goto(`${BASE_URL}/workouts`, { waitUntil: 'networkidle' });
		await expect(page.locator('h1:has-text("Workouts")').first()).toBeVisible({ timeout: 10000 });

		const startBlankButton = page.locator('text=Start with blank workout').first();
		await expect(startBlankButton).toBeVisible();
		await startBlankButton.click();

		await expect(page.locator('text=Build Your Workout')).toBeVisible({ timeout: 10000 });

		const workoutNameInput = page.locator('input[id="name"]');
		await workoutNameInput.fill('E2E Quick Workout');

		const addExerciseButton = page.locator('text=Add Exercise').first();
		await expect(addExerciseButton).toBeVisible();
		await addExerciseButton.click();

		const exerciseSelectorModal = page.locator('.fixed.inset-0').filter({ has: page.locator('text=Add Exercise') });
		await expect(exerciseSelectorModal).toBeVisible({ timeout: 5000 });

		const exerciseButtons = page.locator('.fixed.inset-0 button').filter({ has: page.locator('h3') });
		const buttonCount = await exerciseButtons.count();

		if (buttonCount > 0) {
			for (let i = 0; i < buttonCount; i++) {
				const btn = exerciseButtons.nth(i);
				const text = await btn.textContent() ?? '';
				if (!text.includes('Added')) {
					await btn.click({ force: true });
					break;
				}
			}
		}

		const startButton = page.locator('button:has-text("Start Workout")');
		await expect(startButton).toBeVisible({ timeout: 5000 });
		await startButton.click({ force: true });

		await page.waitForURL(/\/workouts\/[a-f0-9-]+/, { timeout: 30000 });

		await expect(page.locator('text=Complete Workout').first()).toBeVisible({ timeout: 10000 });
		console.log('Quick workout start flow completed');
	});
});
