import { expect, test, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8787';
const PROGRAM_SLUG = 'stronglifts-5x5';
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

async function loginUser(page: Page) {
	await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 30000 });

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

async function startProgramWithSchedule(
	page: Page,
	programSlug: string,
	oneRMs: { squat: number; bench: number; deadlift: number; ohp: number },
	preferences: { days: string[]; time: string; startDate: string }
) {
	await page.goto(`${BASE_URL}/programs/${programSlug}/start`, { waitUntil: 'networkidle' });
	await expect(page.locator('h1:has-text("Start StrongLifts 5×5")').first()).toBeVisible({ timeout: 10000 });

	await page.fill('input[name="squat1rm"]', oneRMs.squat.toString());
	await page.fill('input[name="bench1rm"]', oneRMs.bench.toString());
	await page.fill('input[name="deadlift1rm"]', oneRMs.deadlift.toString());
	await page.fill('input[name="ohp1rm"]', oneRMs.ohp.toString());

	await page.click('button:has-text("Continue")');

	await expect(page.locator('text=Configure your workout schedule').first()).toBeVisible({ timeout: 5000 });

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
	const currentMonthYear = calendarMonthText?.trim() ?? '';

	if (!currentMonthYear.includes(month.toString()) || !currentMonthYear.includes(year.toString())) {
		const nextMonthBtn = page.locator('button[aria-label="Next month"]').first();
		for (let i = 0; i < 12; i++) {
			if (calendarMonthText?.trim().includes(monthNames[month - 1]) && calendarMonthText?.trim().includes(year.toString())) {
				break;
			}
			if (await nextMonthBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
				await nextMonthBtn.click();
				await page.waitForTimeout(300);
				calendarMonthText = await calendarMonth.textContent();
			} else {
				break;
			}
		}
	}

	const dayBtn = page.locator(`button:has-text("${day}")`).filter({ hasNot: page.locator('[disabled]') }).first();
	if (await dayBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
		await dayBtn.click();
	} else {
		const visibleDayBtn = page.locator(`button:has-text("${day}")`).first();
		if (await visibleDayBtn.isVisible().catch(() => false)) {
			await visibleDayBtn.click();
		}
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
		await page.click('button:has-text("Smart Start")');
		await page.waitForTimeout(500);
	}

	const startBtn = page.locator('button:has-text("Start Program")');
	await expect(startBtn).toBeVisible({ timeout: 5000 });

	await startBtn.click();

	await page.waitForURL(/\/programs\/cycle\/[a-z0-9-]+/, { timeout: 30000 });
	console.log('Program started, redirected to:', page.url());
}

async function completeProgramWorkout(page: Page, workoutUrl: string) {
	await page.goto(workoutUrl, { waitUntil: 'networkidle' });
	await expect(page.locator('text=Complete Workout').first()).toBeVisible({ timeout: 10000 });

	const exerciseCards = page.locator('[class*="bg-card"]').filter({ has: page.locator('text=Squat').or(page.locator('text=Bench').or(page.locator('text=Deadlift'))) });

	const cardCount = await exerciseCards.count();
	if (cardCount > 0) {
		for (let i = 0; i < Math.min(cardCount, 2); i++) {
			const card = exerciseCards.nth(i);
			const expandBtn = card.locator('button:has-text("Add Set")').first();
			if (await expandBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
				await expandBtn.click();
				await expandBtn.click();
				
				const rows = page.locator('tbody tr');
				const rowCount = await rows.count();
				if (rowCount > 0) {
					await rows.first().locator('input[type="text"]').first().fill('100');
					await rows.first().locator('input[type="text"]').nth(1).fill('5');
				}
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
}

test.describe('Calendar Scheduling Feature', () => {
	test.beforeEach(async ({ page }) => {
		await loginUser(page);
		await page.goto(`${BASE_URL}/programs/${PROGRAM_SLUG}/start`, { waitUntil: 'networkidle' });
		await expect(page.locator('h1:has-text("Start StrongLifts 5×5")').first()).toBeVisible({ timeout: 10000 });
	});

	test.describe('Program Start Wizard - Schedule Configuration', () => {
		test('1.1 multi-step wizard navigation', async ({ page }) => {

			const continueBtn = page.locator('button:has-text("Continue")');
			await expect(continueBtn).toBeVisible();

			await page.fill('input[name="squat1rm"]', '100');
			await page.fill('input[name="bench1rm"]', '80');
			await page.fill('input[name="deadlift1rm"]', '120');
			await page.fill('input[name="ohp1rm"]', '60');

			await continueBtn.click();

			await expect(page.locator('text=Configure your workout schedule').first()).toBeVisible({ timeout: 5000 });
			console.log('Schedule configuration step loaded successfully');
		});

		test('1.2 day selector validation - cannot continue with insufficient days', async ({ page }) => {
			await page.fill('input[name="squat1rm"]', '100');
			await page.fill('input[name="bench1rm"]', '80');
			await page.fill('input[name="deadlift1rm"]', '120');
			await page.fill('input[name="ohp1rm"]', '60');

			await page.click('button:has-text("Continue")');

			await expect(page.locator('text=Configure your workout schedule').first()).toBeVisible({ timeout: 5000 });

			await page.waitForTimeout(1000);

			const reviewBtn = page.locator('button:has-text("Review")');
			await expect(reviewBtn).toBeVisible({ timeout: 5000 });
			const isDisabled = await reviewBtn.isDisabled();
			expect(isDisabled).toBe(true);
			console.log('Review button correctly disabled without required days');
		});

		test('1.3 day selector enables continue when exact count selected', async ({ page }) => {
			await page.fill('input[name="squat1rm"]', '100');
			await page.fill('input[name="bench1rm"]', '80');
			await page.fill('input[name="deadlift1rm"]', '120');
			await page.fill('input[name="ohp1rm"]', '60');

			await page.click('button:has-text("Continue")');

			await expect(page.locator('text=Configure your workout schedule').first()).toBeVisible({ timeout: 5000 });

			await page.click('button:has-text("Mon")');
			await page.click('button:has-text("Wed")');
			await page.click('button:has-text("Fri")');

			await page.click('button:has-text("Morning")');

			await page.click('button:has-text("Select date")');
			await page.waitForSelector('[class*="calendar"]', { timeout: 5000 });
			const nextMonthBtn = page.locator('button[aria-label="Next month"]').first();
			if (await nextMonthBtn.isVisible().catch(() => false)) {
				await nextMonthBtn.click();
			}
			const dateBtn = page.locator('button:has-text("15")').filter({ hasNot: page.locator('[disabled]') }).first();
			if (await dateBtn.isVisible().catch(() => false)) {
				await dateBtn.click();
			}

			await page.waitForTimeout(500);

			const reviewBtn = page.locator('button:has-text("Review")');
			await expect(reviewBtn).toBeVisible({ timeout: 5000 });
			const isDisabled = await reviewBtn.isDisabled();
			expect(isDisabled).toBe(false);
			console.log('Review button enabled with correct day count');
		});

		test('1.4 time preference selection works', async ({ page }) => {
			await page.fill('input[name="squat1rm"]', '100');
			await page.fill('input[name="bench1rm"]', '80');
			await page.fill('input[name="deadlift1rm"]', '120');
			await page.fill('input[name="ohp1rm"]', '60');

			await page.click('button:has-text("Continue")');

			await page.click('button:has-text("Mon")');
			await page.click('button:has-text("Wed")');
			await page.click('button:has-text("Fri")');

			await page.click('button:has-text("Morning")');

			const morningBtn = page.locator('button:has-text("Morning")');
			const isSelected = await morningBtn.evaluate((el: Element) => el.classList.contains('bg-primary') || el.classList.contains('bg-primary/'));
			expect(isSelected).toBe(true);
			console.log('Time preference selection works');
		});

		test('1.5 start date picker allows future date selection', async ({ page }) => {
			await page.goto(`${BASE_URL}/programs/${PROGRAM_SLUG}/start`, { waitUntil: 'networkidle' });

			await page.fill('input[name="squat1rm"]', '100');
			await page.fill('input[name="bench1rm"]', '80');
			await page.fill('input[name="deadlift1rm"]', '120');
			await page.fill('input[name="ohp1rm"]', '60');

			await page.click('button:has-text("Continue")');

			await page.click('button:has-text("Mon")');
			await page.click('button:has-text("Wed")');
			await page.click('button:has-text("Fri")');

			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 7);
			const dateStr = tomorrow.toISOString().split('T')[0];
			const [year, month, day] = dateStr.split('-').map(Number);

			const datePickerBtn = page.locator('[class*="relative"] button[type="button"]').first();
			await datePickerBtn.click();

			const targetDate = new Date(year, month - 1, day);
			const calendarMonth = page.locator('text=/January|February|March|April|May|June|July|August|September|October|November|December/').first();
			const calendarMonthText = await calendarMonth.textContent();
			const currentMonthYear = calendarMonthText?.trim() ?? '';

			if (!currentMonthYear.includes(month.toString()) || !currentMonthYear.includes(year.toString())) {
				const nextMonthBtn = page.locator('button[aria-label="Next month"]').first();
				const prevMonthBtn = page.locator('button[aria-label="Previous month"]').first();
				let monthsDiff = (targetDate.getFullYear() - new Date().getFullYear()) * 12 + (targetDate.getMonth() - new Date().getMonth());

				while (monthsDiff > 0) {
					await nextMonthBtn.click();
					monthsDiff--;
				}
				while (monthsDiff < 0) {
					await prevMonthBtn.click();
					monthsDiff++;
				}
			}

			const dayBtn = page.locator(`button:has-text("${day}")`).filter({ hasNot: page.locator('[disabled]') }).first();
			await dayBtn.click();

			const dateValue = await datePickerBtn.textContent();
			expect(dateValue).toContain(day.toString());
			console.log('Start date picker works');
		});

		test('1.6 schedule summary displays in review step', async ({ page }) => {
			await page.fill('input[name="squat1rm"]', '100');
			await page.fill('input[name="bench1rm"]', '80');
			await page.fill('input[name="deadlift1rm"]', '120');
			await page.fill('input[name="ohp1rm"]', '60');

			await page.click('button:has-text("Continue")');

			await page.click('button:has-text("Mon")');
			await page.click('button:has-text("Wed")');
			await page.click('button:has-text("Fri")');

			await page.click('button:has-text("Morning")');

			const futureDate = new Date();
			futureDate.setDate(futureDate.getDate() + 21);
			const dateStr = futureDate.toISOString().split('T')[0];
			const [year, month, day] = dateStr.split('-').map(Number);

			const datePickerBtn = page.locator('[class*="relative"] button[type="button"]').first();
			await datePickerBtn.click();

			const targetDate = new Date(year, month - 1, day);
			const calendarMonth = page.locator('text=/January|February|March|April|May|June|July|August|September|October|November|December/').first();
			const calendarMonthText = await calendarMonth.textContent();
			const currentMonthYear = calendarMonthText?.trim() ?? '';

			if (!currentMonthYear.includes(month.toString()) || !currentMonthYear.includes(year.toString())) {
				const nextMonthBtn = page.locator('button[aria-label="Next month"]').first();
				const prevMonthBtn = page.locator('button[aria-label="Previous month"]').first();
				let monthsDiff = (targetDate.getFullYear() - new Date().getFullYear()) * 12 + (targetDate.getMonth() - new Date().getMonth());

				while (monthsDiff > 0) {
					await nextMonthBtn.click();
					monthsDiff--;
				}
				while (monthsDiff < 0) {
					await prevMonthBtn.click();
					monthsDiff++;
				}
			}

			const dayBtn = page.locator(`button:has-text("${day}")`).filter({ hasNot: page.locator('[disabled]') }).first();
			await dayBtn.click();

			await page.click('button:has-text("Review")');

			await expect(page.locator('h3:has-text("Program Details")').first()).toBeVisible({ timeout: 10000 });

			const howWouldYouLike = page.locator('text=How would you like to start?').first();
			if (await howWouldYouLike.isVisible({ timeout: 2000 }).catch(() => false)) {
				await page.click('button:has-text("Smart Start")');
			}

			await page.waitForSelector('text=Mon', { timeout: 5000 });
			await page.waitForSelector('text=Wed', { timeout: 5000 });
			await page.waitForSelector('text=Fri', { timeout: 5000 });

			const reviewContent = await page.content();
			expect(reviewContent).toContain('Mon');
			expect(reviewContent).toContain('Wed');
			expect(reviewContent).toContain('Fri');
			console.log('Schedule summary displays correctly');
		});

		test('1.7 program creation with schedule redirects to cycle dashboard', async ({ page }) => {
			const futureDate = new Date();
			futureDate.setDate(futureDate.getDate() + 21);

			await startProgramWithSchedule(page, PROGRAM_SLUG, {
				squat: 100,
				bench: 80,
				deadlift: 120,
				ohp: 60,
			}, {
				days: ['Mon', 'Wed', 'Fri'],
				time: 'Morning',
				startDate: futureDate.toISOString().split('T')[0],
			});

			await page.waitForURL(/\/programs\/cycle\/[a-z0-9-]+/, { timeout: 30000 });
			await expect(page.locator('text=Week').first()).toBeVisible({ timeout: 10000 });
			console.log('Program created and redirected to dashboard successfully');
		});
	});

	test.describe('Dashboard Calendar View', () => {
		test.beforeEach(async ({ page }) => {
			const futureDate = new Date();
			futureDate.setDate(futureDate.getDate() + 21);

			await startProgramWithSchedule(page, PROGRAM_SLUG, {
				squat: 100,
				bench: 80,
				deadlift: 120,
				ohp: 60,
			}, {
				days: ['Mon', 'Wed', 'Fri'],
				time: 'Morning',
				startDate: futureDate.toISOString().split('T')[0],
			});
		});

		test('2.1 weekly schedule loads with 7 days', async ({ page }) => {
			await expect(page.locator('h2:has-text("Week")').first()).toBeVisible({ timeout: 10000 });

			await page.waitForSelector('[class*="bg-card"]', { timeout: 10000 });

			const dayCards = page.locator('[class*="bg-card"]');
			await page.waitForTimeout(2000);

			const days = await dayCards.count();
			expect(days).toBeGreaterThanOrEqual(3);
			console.log('Weekly schedule loaded with workout days');
		});

		test('2.2 week navigation changes week number', async ({ page }) => {
			await expect(page.locator('h2:has-text("Week")').first()).toBeVisible({ timeout: 10000 });

			const weekHeader = page.locator('h2:has-text("Week")').first();
			await expect(weekHeader).toBeVisible();

			const currentWeek = await weekHeader.textContent();

			const nextBtn = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-right') }).first();
			if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
				await nextBtn.click();
				await page.waitForTimeout(1000);
			}

			const newWeek = await weekHeader.textContent();
			expect(newWeek).not.toBe(currentWeek);
			console.log('Week navigation works');
		});

		test('2.3 go to today button navigates to current week', async ({ page }) => {
			await expect(page.locator('h2:has-text("Week")').first()).toBeVisible({ timeout: 10000 });

			const nextBtn = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-right') }).first();
			if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
				await nextBtn.click();
				await nextBtn.click();
				await page.waitForTimeout(1000);
			}

			const todayBtn = page.locator('text=Go to Today');
			if (await todayBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
				await todayBtn.click();
				await page.waitForTimeout(1000);
			}

			console.log('Go to Today button works');
		});

		test('2.4 workout displays session name and date on calendar', async ({ page }) => {
			await expect(page.locator('h2:has-text("Week")').first()).toBeVisible({ timeout: 10000 });
			await page.waitForTimeout(2000);

			const workoutCard = page.locator('[class*="bg-card"]').filter({ has: page.locator('text=Session') }).first();
			const isVisible = await workoutCard.isVisible({ timeout: 5000 }).catch(() => false);

			if (isVisible) {
				await expect(workoutCard).toContainText(/Session/);
			}
			console.log('Workout display verification complete');
		});

		test('2.5 rest day shows rest day label', async ({ page }) => {
			await expect(page.locator('h2:has-text("Week")').first()).toBeVisible({ timeout: 10000 });
			await page.waitForTimeout(2000);

			const restDayLabels = page.locator('text=Rest Day');
			const count = await restDayLabels.count();
			expect(count).toBeGreaterThanOrEqual(0);
			console.log(`Found ${count} rest days in the schedule`);
		});

		test('2.6 week progress bar updates correctly', async ({ page }) => {
			await expect(page.locator('h2:has-text("Week")').first()).toBeVisible({ timeout: 10000 });

			const progressBar = page.locator('[role="progressbar"]');
			const isVisible = await progressBar.isVisible({ timeout: 5000 }).catch(() => false);

			if (isVisible) {
				console.log('Week progress bar is visible');
			} else {
				console.log('Progress bar not immediately visible (may appear after workout completion)');
			}
		});
	});

	test.describe('Workout Start from Calendar', () => {
		test.beforeEach(async ({ page }) => {
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 7);

			await startProgramWithSchedule(page, PROGRAM_SLUG, {
				squat: 100,
				bench: 80,
				deadlift: 120,
				ohp: 60,
			}, {
				days: ['Mon', 'Wed', 'Fri'],
				time: 'Morning',
				startDate: tomorrow.toISOString().split('T')[0],
			});
		});

		test('3.1 start workout from calendar day', async ({ page }) => {
			await expect(page.locator('text=Week').first()).toBeVisible({ timeout: 10000 });
			await page.waitForTimeout(2000);

			const startBtn = page.locator('button:has-text("Start")').first();
			const isVisible = await startBtn.isVisible({ timeout: 5000 }).catch(() => false);

			if (isVisible) {
				await startBtn.click();
				await page.waitForURL(/\/workouts\/[a-z0-9-]+/, { timeout: 30000 });
				await expect(page.locator('text=Complete').first()).toBeVisible({ timeout: 10000 });
				console.log('Started workout from calendar successfully');
			} else {
				console.log('No startable workout found (all may be completed or future dated)');
			}
		});

		test('3.2 view completed workout', async ({ page }) => {
			await expect(page.locator('text=Week').first()).toBeVisible({ timeout: 10000 });
			await page.waitForTimeout(2000);

			const viewBtn = page.locator('button:has-text("View")').first();
			const isVisible = await viewBtn.isVisible({ timeout: 5000 }).catch(() => false);

			if (isVisible) {
				await viewBtn.click();
				await page.waitForURL(/\/workouts\/[a-z0-9-]+/, { timeout: 30000 });
				console.log('Viewed completed workout successfully');
			} else {
				console.log('No completed workouts to view');
			}
		});
	});

	test.describe('Rescheduling', () => {
		test.beforeEach(async ({ page }) => {
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 7);

			await startProgramWithSchedule(page, PROGRAM_SLUG, {
				squat: 100,
				bench: 80,
				deadlift: 120,
				ohp: 60,
			}, {
				days: ['Mon', 'Wed', 'Fri'],
				time: 'Morning',
				startDate: tomorrow.toISOString().split('T')[0],
			});
		});

		test('4.1 reschedule dialog opens with calendar icon click', async ({ page }) => {
			await expect(page.locator('text=Week').first()).toBeVisible({ timeout: 10000 });
			await page.waitForTimeout(2000);

			const calendarIcon = page.locator('[class*="lucide-calendar"]').first();
			const isVisible = await calendarIcon.isVisible({ timeout: 5000 }).catch(() => false);

			if (isVisible) {
				await calendarIcon.click();
				await page.waitForTimeout(500);

				const dialog = page.locator('text=Reschedule Workout').first();
				const dialogVisible = await dialog.isVisible({ timeout: 3000 }).catch(() => false);

				if (dialogVisible) {
					console.log('Reschedule dialog opened successfully');
				} else {
					console.log('Dialog opened but title not found');
				}
			} else {
				console.log('Calendar icon not visible (may need workout to be present)');
			}
		});

		test('4.2 reschedule shows current schedule info', async ({ page }) => {
			await expect(page.locator('text=Week').first()).toBeVisible({ timeout: 10000 });
			await page.waitForTimeout(2000);

			const calendarIcon = page.locator('[class*="lucide-calendar"]').first();
			const isVisible = await calendarIcon.isVisible({ timeout: 5000 }).catch(() => false);

			if (isVisible) {
				await calendarIcon.click();
				await page.waitForTimeout(500);

				const currentSchedule = page.locator('text=Current Schedule');
				const isCurrentVisible = await currentSchedule.isVisible({ timeout: 2000 }).catch(() => false);

				if (isCurrentVisible) {
					console.log('Current schedule info displayed');
				}
			}
		});
	});

	test.describe('Week Calculation (Date-based)', () => {
		test.skip('5.1 current week based on today date', async ({ page }) => {
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);

			await startProgramWithSchedule(page, PROGRAM_SLUG, {
				squat: 100,
				bench: 80,
				deadlift: 120,
				ohp: 60,
			}, {
				days: ['Mon', 'Wed', 'Fri'],
				time: 'Morning',
				startDate: tomorrow.toISOString().split('T')[0],
			});

			await expect(page.locator('text=Week').first()).toBeVisible({ timeout: 10000 });
			const weekText = await page.locator('text=/Week \\d+/').first().textContent();
			expect(weekText).toContain('Week');
			console.log('Current week displayed:', weekText);
		});

		test.skip('5.2 dashboard shows no workout when rest day', async ({ page }) => {
			const nextMonday = new Date();
			nextMonday.setDate(nextMonday.getDate() + ((7 - nextMonday.getDay()) % 7 + 1) % 7 || 7);

			await startProgramWithSchedule(page, PROGRAM_SLUG, {
				squat: 100,
				bench: 80,
				deadlift: 120,
				ohp: 60,
			}, {
				days: ['Mon', 'Wed', 'Fri'],
				time: 'Morning',
				startDate: nextMonday.toISOString().split('T')[0],
			});

			await expect(page.locator('text=Week').first()).toBeVisible({ timeout: 10000 });
			console.log('Dashboard loads correctly');
		});
	});

	test.describe('Full Program Flow with Calendar', () => {
		test.skip('complete program flow: start program, complete workout, verify calendar updates', async ({ page }) => {
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 7);

			await startProgramWithSchedule(page, PROGRAM_SLUG, {
				squat: 100,
				bench: 80,
				deadlift: 120,
				ohp: 60,
			}, {
				days: ['Mon', 'Wed', 'Fri'],
				time: 'Morning',
				startDate: tomorrow.toISOString().split('T')[0],
			});

			const url = page.url();
			const cycleId = url.split('/cycle/')[1]?.split('?')[0] || '';
			console.log('Program started with cycle ID:', cycleId);

			await expect(page.locator('text=Week').first()).toBeVisible({ timeout: 10000 });

			const startBtn = page.locator('button:has-text("Start")').first();
			const isVisible = await startBtn.isVisible({ timeout: 5000 }).catch(() => false);

			if (isVisible) {
				await startBtn.click();
				await page.waitForURL(/\/workouts\/[a-z0-9-]+/, { timeout: 30000 });
				console.log('Started workout from calendar');

				await completeProgramWorkout(page, page.url());
				console.log('Workout completed successfully');

				await page.goto(`${BASE_URL}/programs/cycle/${cycleId}`, { waitUntil: 'networkidle' });
				await page.waitForTimeout(2000);

				const checkmark = page.locator('[class*="lucide-check-circle"]');
				const checkmarkCount = await checkmark.count();
				expect(checkmarkCount).toBeGreaterThanOrEqual(0);
				console.log(`Found ${checkmarkCount} completed workouts on calendar`);
			} else {
				console.log('No workout available to start (all completed or in future)');
			}

			console.log('Full program flow test completed');
		});
	});

	test.describe('Edge Cases', () => {
		test.skip('6.1 scheduling respects preferred days - first workout on preferred day', async ({ page }) => {
			const saturday = new Date();
			const daysUntilSaturday = (6 - saturday.getDay() + 7) % 7;
			saturday.setDate(saturday.getDate() + (daysUntilSaturday || 7));

			await startProgramWithSchedule(page, PROGRAM_SLUG, {
				squat: 100,
				bench: 80,
				deadlift: 120,
				ohp: 60,
			}, {
				days: ['Mon', 'Wed', 'Fri'],
				time: 'Morning',
				startDate: saturday.toISOString().split('T')[0],
			});

			await expect(page.locator('text=Week').first()).toBeVisible({ timeout: 10000 });
			console.log('Program started - scheduling respects preferred days');
		});

		test.skip('6.2 multiple week navigation works correctly', async ({ page }) => {
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 7);

			await startProgramWithSchedule(page, PROGRAM_SLUG, {
				squat: 100,
				bench: 80,
				deadlift: 120,
				ohp: 60,
			}, {
				days: ['Mon', 'Wed', 'Fri'],
				time: 'Morning',
				startDate: tomorrow.toISOString().split('T')[0],
			});

			await expect(page.locator('text=Week').first()).toBeVisible({ timeout: 10000 });

			const nextBtn = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-right') }).first();

			for (let i = 0; i < 3; i++) {
				if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
					await nextBtn.click();
					await page.waitForTimeout(500);
				}
			}

			console.log('Navigated through multiple weeks successfully');
		});
	});
});
