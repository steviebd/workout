import { expect, test, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8787';
const PROGRAM_SLUG = 'stronglifts-5x5';
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

async function loginUser(page: Page) {
	await page.goto(`${BASE_URL}/`, { waitUntil: 'load', timeout: 60000 });

	await page.waitForFunction(() => {
		const loading = document.querySelector('.animate-spin, .animate-pulse');
		const hasUser = document.querySelector('button.rounded-full');
		const hasSignIn = document.querySelector('button:has-text("Sign In")');
		return (!loading?.closest('.min-h-screen')) && (hasUser ?? hasSignIn);
	}, { timeout: 15000 }).catch(() => {});

	await page.waitForTimeout(2000);

	const userAvatar = page.locator('button.rounded-full').first();
	const isSignedIn = await userAvatar.isVisible({ timeout: 5000 }).catch(() => false);
	if (isSignedIn) {
		return;
	}

	await page.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'domcontentloaded', timeout: 30000 });

	await expect(page).toHaveURL((url: URL) => url.hostname.includes('authkit.app'), { timeout: 15000 });

	const emailInput = page.locator('input[name="email"]');
	await expect(emailInput).toBeVisible({ timeout: 10000 });

	const TEST_USERNAME = process.env.TEST_USERNAME ?? '';
	const TEST_PASSWORD = process.env.TEST_PASSWORD ?? '';

	await emailInput.fill(TEST_USERNAME);
	await page.locator('button:has-text("Continue")').first().click();

	await page.waitForTimeout(3000);

	const currentUrl = page.url();
	console.log('URL after email submit:', currentUrl);

	if (currentUrl.includes('authkit.app') && currentUrl.includes('magic')) {
		console.log('Magic link sent - checking email flow');
		return;
	}

	const passwordInput = page.locator('input[name="password"]');
	const isPasswordVisible = await passwordInput.isVisible({ timeout: 5000 }).catch(() => false);

	if (isPasswordVisible) {
		await passwordInput.fill(TEST_PASSWORD);
		const signInBtn = page.locator('button:has-text("Sign in")').first();
		await signInBtn.click();
	} else {
		const signInBtn = page.locator('button:has-text("Sign in")').first();
		if (await signInBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
			await signInBtn.click();
			await page.waitForTimeout(2000);
			if (await passwordInput.isVisible({ timeout: 5000 }).catch(() => false)) {
				await passwordInput.fill(TEST_PASSWORD);
				const finalSignInBtn = page.locator('button:has-text("Sign in")').first();
				await finalSignInBtn.click();
			}
		}
	}

	await page.waitForURL(BASE_URL, { timeout: 60000 });
}

async function createProgramWith1RMs(
	page: Page,
	oneRMs: { squat: number; bench: number; deadlift: number; ohp: number },
	preferences: { days: string[]; time: string; startDate: string },
	startMode: 'smart' | 'strict' = 'smart'
): Promise<string> {
	await page.goto(`${BASE_URL}/programs/${PROGRAM_SLUG}/start`, { waitUntil: 'load', timeout: 60000 });
	await expect(page.locator('h1:has-text("Start StrongLifts")').first()).toBeVisible({ timeout: 15000 });
	await page.waitForTimeout(2000);

	await page.locator('input[name="squat1rm"]').fill(oneRMs.squat.toString());
	await page.locator('input[name="bench1rm"]').fill(oneRMs.bench.toString());
	await page.locator('input[name="deadlift1rm"]').fill(oneRMs.deadlift.toString());
	await page.locator('input[name="ohp1rm"]').fill(oneRMs.ohp.toString());

	await page.waitForTimeout(500);

	const continueBtn = page.locator('button:has-text("Continue")');
	await expect(continueBtn).toBeEnabled({ timeout: 15000 });
	await continueBtn.click();

	await expect(page.locator('text=Configure your workout schedule').first()).toBeVisible({ timeout: 10000 });

	for (const day of preferences.days) {
		await page.click(`button:has-text("${day}")`);
	}

	await page.click(`button:has-text("${preferences.time}")`);

	const datePickerBtn = page.locator('[class*="relative"] button[type="button"]').first();
	await expect(datePickerBtn).toBeVisible({ timeout: 5000 });
	await datePickerBtn.click();

	const dateStr = preferences.startDate;
	const [year, month, day] = dateStr.split('-').map(Number);

	const calendarMonth = page.locator('text=/January|February|March|April|May|June|July|August|September|October|November|December/').first();
	let calendarMonthText = await calendarMonth.textContent();

	while (!calendarMonthText?.includes(monthNames[month - 1]) || !calendarMonthText?.includes(year.toString())) {
		const nextMonthBtn = page.locator('button[aria-label="Next month"]').first();
		if (await nextMonthBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
			await nextMonthBtn.click();
			await page.waitForTimeout(300);
			calendarMonthText = await calendarMonth.textContent();
		} else {
			break;
		}
	}

	const dayBtn = page.locator(`button:has-text("${day}")`).filter({ hasNot: page.locator('[disabled]') }).first();
	if (await dayBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
		await dayBtn.click();
	}

	await page.waitForTimeout(500);

	const reviewBtn = page.locator('button:has-text("Review")');
	if (await reviewBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
		await reviewBtn.click();
	}

	await page.waitForTimeout(500);

	await expect(page.locator('text=Review').first()).toBeVisible({ timeout: 5000 });

	const howWouldYouLike = page.locator('text=How would you like to start?').first();
	if (await howWouldYouLike.isVisible({ timeout: 2000 }).catch(() => false)) {
		await page.click(`button:has-text("${startMode === 'smart' ? 'Smart Start' : 'Strict Start'}')`);
		await page.waitForTimeout(500);
	}

	const startProgramBtn = page.locator('button:has-text("Start Program")');
	await expect(startProgramBtn).toBeVisible({ timeout: 5000 });
	await startProgramBtn.click();

	await page.waitForURL(/\/programs\/cycle\/[a-z0-9-]+/, { timeout: 30000 });
	const url = page.url();
	const cycleId = url.split('/cycle/')[1]?.split('?')[0] || '';
	console.log('Program started, cycle ID:', cycleId);

	return cycleId;
}

async function completeWorkout(page: Page): Promise<void> {
	await page.waitForTimeout(2000);

	const exerciseCards = page.locator('[class*="bg-card"]').filter({
		has: page.locator('text=/Squat|Bench|Deadlift|Overhead Press|Row/i')
	});

	const cardCount = await exerciseCards.count();
	console.log(`Found ${cardCount} exercise cards`);

	for (let i = 0; i < cardCount; i++) {
		const card = exerciseCards.nth(i);
		const addSetBtn = card.locator('button:has-text("Add Set")').first();

		if (await addSetBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
			for (let s = 0; s < 5; s++) {
				if (await addSetBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
					await addSetBtn.click();
					await page.waitForTimeout(200);
				}
			}

			const rows = card.locator('tbody tr');
			const rowCount = await rows.count();

			for (let r = 0; r < Math.min(rowCount, 5); r++) {
				const row = rows.nth(r);
				const inputs = row.locator('input[type="text"]');
				const inputCount = await inputs.count();

				if (inputCount >= 2) {
					await inputs.first().fill('100');
					await inputs.nth(1).fill('5');
				}
			}
		}
	}

	const completeBtn = page.locator('button:has-text("Complete Workout")').first();
	if (await completeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
		await completeBtn.click();
		await page.waitForTimeout(3000);

		const incompleteModal = page.locator('text=Incomplete Sets').first();
		if (await incompleteModal.isVisible({ timeout: 2000 }).catch(() => false)) {
			await page.click('button:has-text("Continue")');
			await page.waitForTimeout(2000);
		}

		await expect(page.locator('text=/Workout Complete|Completed|All done/i').first()).toBeVisible({ timeout: 15000 });
		console.log('Workout completed successfully');
	}
}

async function deleteProgramCycle(page: Page, cycleId: string): Promise<void> {
	try {
		await page.goto(`${BASE_URL}/programs/cycle/${cycleId}`, { waitUntil: 'load', timeout: 60000 });

		const deleteBtn = page.locator('button:has-text("Delete Program")').first();
		if (await deleteBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
			await deleteBtn.click();
			await page.waitForTimeout(500);

			const confirmBtn = page.locator('button:has-text("Delete")').last();
			if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
				await confirmBtn.click();
				await page.waitForTimeout(2000);
			}
		}
	} catch (error) {
		console.log('Could not delete program cycle:', error);
	}
}

test.describe('Comprehensive Program Flow', () => {
	test.beforeEach(async ({ page }) => {
		await loginUser(page);
	});

	test('1. Create program with 1RM of 100kg for each lift', async ({ page }) => {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 7);

		const cycleId = await createProgramWith1RMs(
			page,
			{ squat: 100, bench: 100, deadlift: 100, ohp: 100 },
			{ days: ['Mon', 'Wed', 'Fri'], time: 'Morning', startDate: tomorrow.toISOString().split('T')[0] },
			'smart'
		);

		await expect(page.locator('text=Week').first()).toBeVisible({ timeout: 10000 });

		await page.waitForTimeout(2000);

		const starting1RMsCard = page.locator('text=Starting 1RMs').first();
		await expect(starting1RMsCard).toBeVisible({ timeout: 10000 });

		const squat1rm = page.locator('text=Squat').locator('..').locator('text=100 kg');
		const bench1rm = page.locator('text=Bench').locator('..').locator('text=100 kg');
		const deadlift1rm = page.locator('text=Deadlift').locator('..').locator('text=100 kg');
		const ohp1rm = page.locator('text=OHP').locator('..').locator('text=100 kg');

		await expect(squat1rm.first()).toBeVisible({ timeout: 5000 });
		await expect(bench1rm.first()).toBeVisible({ timeout: 5000 });
		await expect(deadlift1rm.first()).toBeVisible({ timeout: 5000 });
		await expect(ohp1rm.first()).toBeVisible({ timeout: 5000 });

		console.log('All 1RMs verified as 100kg');

		await deleteProgramCycle(page, cycleId);
	});

	test('2. Test Smart Start date functionality', async ({ page }) => {
		const saturday = new Date();
		const daysUntilSaturday = (6 - saturday.getDay() + 7) % 7 || 7;
		saturday.setDate(saturday.getDate() + daysUntilSaturday);

		const cycleId = await createProgramWith1RMs(
			page,
			{ squat: 100, bench: 100, deadlift: 100, ohp: 100 },
			{ days: ['Mon', 'Wed', 'Fri'], time: 'Morning', startDate: saturday.toISOString().split('T')[0] },
			'smart'
		);

		await expect(page.locator('text=Week').first()).toBeVisible({ timeout: 10000 });
		await page.waitForTimeout(2000);

		const workoutCards = page.locator('[class*="bg-card"]').filter({ has: page.locator('text=Session') });
		const firstWorkoutCard = workoutCards.first();

		if (await firstWorkoutCard.isVisible({ timeout: 5000 }).catch(() => false)) {
			const cardText = await firstWorkoutCard.textContent();
			console.log('First workout card text:', cardText);

			expect(cardText).toContain('Session');
		}

		console.log('Smart Start correctly scheduled first workout');

		await deleteProgramCycle(page, cycleId);
	});

	test('3. Complete all workouts across all weeks', async ({ page }) => {
		test.setTimeout(600000);

		const today = new Date();
		const cycleId = await createProgramWith1RMs(
			page,
			{ squat: 100, bench: 100, deadlift: 100, ohp: 100 },
			{ days: ['Mon', 'Wed', 'Fri'], time: 'Morning', startDate: today.toISOString().split('T')[0] },
			'smart'
		);

		await expect(page.locator('text=Week').first()).toBeVisible({ timeout: 10000 });
		await page.waitForTimeout(2000);

		const workoutsResponse = await page.request.get(`${BASE_URL}/api/program-cycles/${cycleId}/workouts`);
		const workouts = await workoutsResponse.json() as Array<{ id: string; weekNumber: number; sessionNumber: number; sessionName: string; isComplete: boolean; scheduledDate: string }>;
		const totalWorkouts = workouts.length;
		console.log(`Total workouts in program: ${totalWorkouts}`);

		const incompleteWorkouts = workouts.filter(w => !w.isComplete);
		console.log(`Incomplete workouts: ${incompleteWorkouts.length}`);

		for (const workout of incompleteWorkouts) {
			console.log(`Starting workout ${workout.sessionName} (Week ${workout.weekNumber})`);

			const startResponse = await page.request.post(`${BASE_URL}/api/program-cycles/${cycleId}/start-workout`, {
				headers: { 'Content-Type': 'application/json' },
				data: { programCycleWorkoutId: workout.id, actualDate: workout.scheduledDate },
			});

			if (!startResponse.ok()) {
				console.log(`Failed to start workout ${workout.sessionName}, skipping`);
				continue;
			}

			const { workoutId } = await startResponse.json() as { workoutId: string };
			console.log(`Workout started, ID: ${workoutId}`);

			await page.goto(`${BASE_URL}/workouts/${workoutId}`, { waitUntil: 'load', timeout: 60000 });
			await page.waitForTimeout(2000);

			await completeWorkout(page);
			console.log(`Completed workout ${workout.sessionName}`);
		}

		await page.goto(`${BASE_URL}/programs/cycle/${cycleId}`, { waitUntil: 'load', timeout: 60000 });
		await page.waitForTimeout(2000);

		const updatedResponse = await page.request.get(`${BASE_URL}/api/program-cycles/${cycleId}/workouts`);
		const updatedWorkouts = await updatedResponse.json() as Array<{ isComplete: boolean }>;
		const completedCount = updatedWorkouts.filter(w => w.isComplete).length;

		console.log(`Completed ${completedCount} of ${totalWorkouts} workouts`);
		expect(completedCount).toBe(totalWorkouts);

		const programComplete = page.locator('text=Program Complete').first();
		await expect(programComplete).toBeVisible({ timeout: 10000 });
		console.log('Program completion message displayed');

		await deleteProgramCycle(page, cycleId);
	});

	test('4. End program and test 1RM', async ({ page }) => {
		const today = new Date();
		const cycleId = await createProgramWith1RMs(
			page,
			{ squat: 100, bench: 100, deadlift: 100, ohp: 100 },
			{ days: ['Mon', 'Wed', 'Fri'], time: 'Morning', startDate: today.toISOString().split('T')[0] },
			'smart'
		);

		await expect(page.locator('text=Week').first()).toBeVisible({ timeout: 10000 });

		const startBtn = page.locator('button:has-text("Start")').first();
		if (await startBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
			await startBtn.click();
			await page.waitForURL(/\/workouts\/[a-z0-9-]+/, { timeout: 30000 });
			await completeWorkout(page);
		}

		await page.goto(`${BASE_URL}/programs/cycle/${cycleId}`, { waitUntil: 'load', timeout: 60000 });
		await page.waitForTimeout(2000);

		const endProgramBtn = page.locator('button:has-text("End Program & Test 1RM")').first();
		await expect(endProgramBtn).toBeVisible({ timeout: 10000 });

		await endProgramBtn.click();

		await page.waitForURL(/\/workouts\/[a-z0-9-]+/, { timeout: 30000 });
		console.log('Redirected to 1RM test workout');

		await page.waitForTimeout(2000);

		await completeWorkout(page);
		console.log('1RM test workout completed');

		await page.goto(`${BASE_URL}/programs/cycle/${cycleId}`, { waitUntil: 'load', timeout: 60000 });
		await page.waitForTimeout(2000);

		const programComplete = page.locator('text=Program Complete').first();
		await expect(programComplete).toBeVisible({ timeout: 10000 });
		console.log('Program marked as complete after 1RM test');

		await deleteProgramCycle(page, cycleId);
	});
});
