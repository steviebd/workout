import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { type Browser, type BrowserContext, type Locator, type Page, chromium } from '@playwright/test';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getInfisicalSecret(secretName: string): string {
	try {
		console.log(`Fetching ${secretName} from Infisical...`);
		const result = execSync(`infisical --env dev secrets get ${secretName} --plain`, {
			encoding: 'utf-8',
			stdio: ['pipe', 'pipe', 'pipe'],
		});
		const trimmed = result.trim();
		console.log(`Successfully fetched ${secretName}`);
		return trimmed;
	} catch (error) {
		console.error(`Failed to get ${secretName} from Infisical:`, error instanceof Error ? error.message : error);
		throw new Error(`Failed to get ${secretName} from Infisical: ${error instanceof Error ? error.message : error}`);
	}
}

interface JwtPayload {
	exp?: number;
	iat?: number;
}

function decodeJwt(token: string): JwtPayload | null {
	try {
		const parts = token.split('.');
		if (parts.length !== 3) {
			return null;
		}
		const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
		return JSON.parse(payload) as JwtPayload;
	} catch {
		return null;
	}
}

function isTokenExpired(token: string): boolean {
	const payload = decodeJwt(token);
	if (!payload?.exp) {
		return true;
	}
	const now = Math.floor(Date.now() / 1000);
	return payload.exp < now;
}

interface StorageState {
	cookies: Array<{
		name: string;
		value: string;
		domain: string;
		path: string;
		expires: number;
		httpOnly: boolean;
		secure: boolean;
		sameSite: string;
	}>;
	origins: unknown[];
}

function getSessionToken(storageStatePath: string): string | null {
	if (!existsSync(storageStatePath)) {
		return null;
	}
	try {
		const content = readFileSync(storageStatePath, 'utf-8');
		const state = JSON.parse(content) as StorageState;
		const sessionCookie = state.cookies.find((cookie) => cookie.name === 'session_token');
		return sessionCookie?.value ?? null;
	} catch {
		return null;
	}
}

function hasValidWorkosSession(storageStatePath: string): boolean {
	if (!existsSync(storageStatePath)) {
		return false;
	}
	try {
		const content = readFileSync(storageStatePath, 'utf-8');
		const state = JSON.parse(content) as StorageState;
		const workosCookies = state.cookies.filter(
			(cookie) =>
				cookie.name.includes('__Host-state') ||
				cookie.name.includes('workos') ||
				cookie.domain.includes('authkit.app')
		);
		const now = Date.now() / 1000;
		const hasValidWorkosCookie = workosCookies.some((cookie) => {
			const expiresInFuture = cookie.expires === -1 || cookie.expires > now;
			return expiresInFuture;
		});
		return hasValidWorkosCookie;
	} catch {
		return false;
	}
}

async function isAuthStateValid(storageStatePath: string): Promise<boolean> {
	if (!existsSync(storageStatePath)) {
		return false;
	}
	try {
		const content = readFileSync(storageStatePath, 'utf-8');
		const state = JSON.parse(content) as StorageState;
		if (state.cookies.length === 0) {
			return false;
		}
		const hasSessionCookie = state.cookies.some(
			(cookie) =>
				cookie.name.includes('session') ||
				cookie.name.includes('auth') ||
				cookie.name.includes('workos')
		);
		if (!hasSessionCookie) {
			return false;
		}
		const sessionToken = getSessionToken(storageStatePath);
		if (!sessionToken) {
			console.log('No session_token found in auth state');
			return false;
		}
		if (isTokenExpired(sessionToken)) {
			console.log('Session token has expired');
			const hasWorkosSession = hasValidWorkosSession(storageStatePath);
			if (hasWorkosSession) {
				console.log('WorkOS session cookies are still valid - can attempt refresh');
			}
			return hasWorkosSession;
		}
		console.log('Session token is valid');
		return true;
	} catch (error) {
		console.error('Error checking auth state validity:', error);
		return false;
	}
}

async function attemptTokenRefresh(
	page: Page,
	context: BrowserContext,
	baseUrl: string,
	storageStatePath: string
): Promise<boolean> {
	console.log('Attempting to refresh session token using WorkOS session...');

	try {
		const authResponse = await context.request.get(`${baseUrl}/api/auth/me`);
		if (authResponse.ok()) {
			console.log('Session token is still valid');
			await context.storageState({ path: storageStatePath });
			return true;
		}

		console.log('Current session token is invalid, checking WorkOS session...');

		await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });

		await page.waitForTimeout(3000);

		const signOutButton = page.locator('text=Sign Out').first();
		const isSignedIn = await signOutButton.isVisible({ timeout: 10000 }).catch(() => false);

		if (isSignedIn) {
			console.log('Successfully refreshed session via WorkOS session');
			await context.storageState({ path: storageStatePath });
			const newToken = getSessionToken(storageStatePath);
			if (newToken && !isTokenExpired(newToken)) {
				console.log('New session token is valid');
				return true;
			}
		}

		console.log('WorkOS session refresh did not produce valid token');
		return false;
	} catch (error) {
		console.error('Error during token refresh:', error);
		return false;
	}
}

function ensureStorageStateFile(storageStatePath: string): void {
	const dir = dirname(storageStatePath);
	mkdirSync(dir, { recursive: true });

	if (!existsSync(storageStatePath)) {
		const emptyState = { cookies: [], origins: [] };
		writeFileSync(storageStatePath, JSON.stringify(emptyState, null, 2));
	}
}

async function findSignInButton(page: Page): Promise<Locator | null> {
	const selectors = [
		'button:has-text("Sign In")',
		'a:has-text("Sign In")',
		'text=Sign In',
		'[data-testid="sign-in"]',
		'.sign-in-button',
		'button[class*="signin"]',
		'a[class*="signin"]',
	];

	for (const selector of selectors) {
		try {
			const button = page.locator(selector).first();
			const isVisible = await button.isVisible({ timeout: 2000 }).catch(() => false);
			if (isVisible) {
				console.log(`Found Sign In button with selector: ${selector}`);
				return button;
			}
		} catch {
			continue;
		}
	}
	return null;
}

async function waitForAuthLoading(page: Page, timeout: number = 10000): Promise<boolean> {
	console.log('Waiting for auth loading to complete...');
	
	try {
		await page.waitForFunction(() => {
			const loadingElement = document.querySelector('.animate-spin');
			if (loadingElement) {
				const parent = loadingElement.closest('.min-h-screen');
				if (parent) {
					const text = parent.textContent || '';
					return !text.includes('Loading') && !text.includes('Spinner');
				}
			}
			return true;
		}, { timeout: timeout });
		
		await page.waitForTimeout(1000);
		console.log('Auth loading completed');
		return true;
	} catch {
		console.log('Auth loading check timeout, continuing anyway');
		return false;
	}
}

async function waitForAuthStateDetermined(page: Page, timeout: number = 15000): Promise<boolean> {
	console.log('Waiting for auth state to be determined...');
	
	try {
		await page.waitForFunction(() => {
			const userButton = document.querySelector('button:has-text("Sign Out")');
			const signInButton = document.querySelector('button:has-text("Sign In")');
			const loadingSpinner = document.querySelector('.animate-pulse');
			
			if (loadingSpinner) {
				return false;
			}
			
			return userButton !== null || signInButton !== null;
		}, { timeout: timeout });
		
		console.log('Auth state determined');
		return true;
	} catch {
		console.log('Auth state determination timeout, continuing anyway');
		return false;
	}
}

async function performLogin(
	page: Page,
	context: BrowserContext,
	baseUrl: string,
	username: string,
	password: string,
	emailSelector: string,
	passwordSelector: string,
	submitSelector: string,
	continueSelector: string,
	storageStatePath: string
): Promise<boolean> {
	console.log('Starting login flow...');

	let navigationTimeout: NodeJS.Timeout | null = null;
	
	try {
		const navPromise = page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
		
		navigationTimeout = setTimeout(() => {
			console.log('Navigation timeout, attempting to continue...');
			void page.evaluate(() => window.stop());
		}, 15000);
		
		await navPromise;
		clearTimeout(navigationTimeout);
	} catch (error) {
		console.log('Could not navigate to app:', error instanceof Error ? error.message : error);
		return false;
	}

	await page.waitForLoadState('domcontentloaded');
	
	await waitForAuthLoading(page, 15000);
	await waitForAuthStateDetermined(page, 15000);
	
	await page.waitForTimeout(2000);

	const initialSignOutButton = page.locator('text=Sign Out').first();
	const wasAlreadySignedIn = await initialSignOutButton.isVisible({ timeout: 5000 }).catch(() => false);
	
	if (wasAlreadySignedIn) {
		console.log('User is already authenticated');
		return true;
	}

	const signInButton = await findSignInButton(page);
	if (signInButton) {
		try {
			await signInButton.click({ timeout: 10000 });
		} catch (error) {
			console.log('Could not click Sign In button:', error instanceof Error ? error.message : error);
			return false;
		}
	} else {
		console.log('Sign In button not found, navigating directly to /auth/signin');
		await page.goto(`${baseUrl}/auth/signin`, { waitUntil: 'domcontentloaded', timeout: 15000 });
	}

	try {
		await page.waitForURL(
			(url: URL) => url.hostname.includes('authkit.app') || url.pathname.includes('/auth/signin'),
			{ timeout: 15000 }
		);
	} catch (error) {
		console.log('Did not reach auth page:', error instanceof Error ? error.message : error);
		return false;
	}

	console.log('Auth page loaded, proceeding with login...');

	try {
		const emailInput = page.locator(emailSelector);
		await emailInput.waitFor({ state: 'visible', timeout: 10000 });
		await emailInput.fill(username);
	} catch (error) {
		console.log('Could not fill email:', error instanceof Error ? error.message : error);
		return false;
	}

	try {
		await page.locator(continueSelector).click({ timeout: 10000 });
	} catch (error) {
		console.log('Could not click Continue:', error instanceof Error ? error.message : error);
		return false;
	}

	try {
		await page.waitForLoadState('domcontentloaded');
		await page.locator(passwordSelector).waitFor({ state: 'visible', timeout: 15000 });
	} catch (error) {
		console.log('Password field not visible:', error instanceof Error ? error.message : error);
		return false;
	}

	try {
		await page.locator(passwordSelector).fill(password);
		await page.locator(submitSelector).click({ timeout: 10000 });
	} catch (error) {
		console.log('Could not submit password:', error instanceof Error ? error.message : error);
		return false;
	}

	try {
		await page.waitForURL((url: URL) => url.origin === baseUrl, { timeout: 30000 });
	} catch {
		await page.waitForLoadState('domcontentloaded');
		console.log('Did not return to app, checking current URL...');
		const currentUrl = page.url();
		console.log('Current URL:', currentUrl);
	}

	await page.waitForTimeout(5000);
	await page.waitForLoadState('networkidle');
	
	console.log('Final URL after login:', page.url());
	
	const signOutButton = page.locator('text=Sign Out').first();
	const isSignedIn = await signOutButton.isVisible({ timeout: 10000 }).catch(() => false);
	
	console.log('Post-login check - Sign Out visible:', isSignedIn);

	const signInAgain = page.locator('text=Sign In').first();
	const isSignInVisible = await signInAgain.isVisible().catch(() => false);
	console.log('Post-login check - Sign In visible:', isSignInVisible);

	if (isSignedIn) {
		console.log('Login successful - Sign Out button is visible');
		await context.storageState({ path: storageStatePath });
		console.log('Auth state saved to:', storageStatePath);
		return true;
	}

	if (isSignInVisible) {
		console.log('Login may have failed - Sign In button still visible');
		return false;
	}

	console.log('Assuming login succeeded - neither Sign In nor Sign Out visible (page might still be loading)');
	await context.storageState({ path: storageStatePath });
	console.log('Auth state saved to:', storageStatePath);
	return true;
}

async function globalSetup() {
	const storageStatePath = join(__dirname, '.auth/state.json');
	const baseUrl = process.env.BASE_URL ?? 'http://localhost:8787';

	ensureStorageStateFile(storageStatePath);

	if (process.env.SKIP_GLOBAL_SETUP === 'true') {
		console.log('SKIP_GLOBAL_SETUP is set, skipping authentication');
		return;
	}

	const authValid = await isAuthStateValid(storageStatePath);
	if (authValid) {
		console.log('Valid auth state already exists');
		return;
	}

	const sessionToken = getSessionToken(storageStatePath);
	const hasWorkosSession = sessionToken ? hasValidWorkosSession(storageStatePath) : false;

	let browser: Browser | null = null;
	let context: BrowserContext | null = null;

	try {
		console.log('Launching browser for authentication...');
		browser = await chromium.launch({ timeout: 30000 });
		context = await browser.newContext();
		const page = await context.newPage();

		page.setDefaultTimeout(15000);
		page.setDefaultNavigationTimeout(30000);

		if (sessionToken && hasWorkosSession) {
			console.log('Token expired but WorkOS session is valid - attempting automatic refresh...');
			const refreshSuccess = await attemptTokenRefresh(page, context, baseUrl, storageStatePath);
			if (refreshSuccess) {
				console.log('Session token refreshed successfully via WorkOS session');
				return;
			}
			console.log('WorkOS session refresh failed - falling back to full re-authentication');
		}

		console.log('Auth state is invalid or expired, attempting re-authentication...');

		console.log('Fetching test credentials...');
		let testUsername: string;
		let testPassword: string;

		try {
			testUsername = process.env.TEST_USERNAME ?? getInfisicalSecret('TEST_USERNAME');
			testPassword = process.env.TEST_PASSWORD ?? getInfisicalSecret('TEST_PASSWORD');
			console.log('Test credentials fetched successfully');
		} catch (error) {
			console.error('Failed to get credentials from Infisical:', error instanceof Error ? error.message : error);
			console.error('Cannot proceed with authentication without valid credentials');
			console.error('Please ensure TEST_USERNAME and TEST_PASSWORD are set in Infisical dev environment');
			process.exit(1);
		}

		const emailSelector = process.env.PLAYWRIGHT_AUTH_EMAIL_SELECTOR ?? 'input[name="email"]';
		const passwordSelector = process.env.PLAYWRIGHT_AUTH_PASSWORD_SELECTOR ?? 'input[name="password"]';
		const submitSelector = process.env.PLAYWRIGHT_AUTH_SUBMIT_SELECTOR ?? 'button[name="intent"]:not([data-method])';
		const continueSelector = process.env.PLAYWRIGHT_AUTH_CONTINUE_SELECTOR ?? 'button:has-text("Continue")';

		console.log('Starting full login flow...');
		const success = await performLogin(
			page,
			context,
			baseUrl,
			testUsername,
			testPassword,
			emailSelector,
			passwordSelector,
			submitSelector,
			continueSelector,
			storageStatePath
		);

		if (success) {
			console.log('Login completed successfully');
		} else {
			console.error('Login failed - auth state not saved');
			console.error('Tests will likely fail without valid authentication');
			process.exit(1);
		}
	} catch (error) {
		console.error('Global setup error:', error instanceof Error ? error.message : error);
		console.error('Authentication setup failed - tests cannot run without valid auth');
		process.exit(1);
	} finally {
		if (browser) {
			try {
				await browser.close();
			} catch {
				console.log('Error closing browser');
			}
		}
	}
}

export default globalSetup;
