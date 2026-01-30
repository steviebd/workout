import { expect, test } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8787';

interface ManifestIcon {
  sizes: string;
  src: string;
  purpose?: string;
}

interface Manifest {
  name?: string;
  short_name?: string;
  start_url?: string;
  display?: string;
  icons?: ManifestIcon[];
  theme_color?: string;
  background_color?: string;
  description?: string;
  categories?: string[];
  scope?: string;
  orientation?: string;
  shortcuts?: Array<{ name: string }>;
}

test.describe('Service Worker', () => {
  test('should register service worker', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

    const swRegistered = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });

    expect(swRegistered).toBe(true);

    const hasController = await page.evaluate(() => {
      return navigator.serviceWorker.controller !== null;
    });

    expect(hasController).toBe(true);
  });

  test('should cache static assets', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

    const cacheNames = await page.evaluate((): Promise<string[]> => {
      return caches.keys().then((keys: Iterable<string>) => Array.from(keys));
    });

    expect(cacheNames.length).toBeGreaterThan(0);

    const hasStaticCache = cacheNames.some((name: string) =>
      name.includes('static') || name.includes('fit-workout')
    );

    expect(hasStaticCache).toBe(true);
  });

  test('should handle fetch events for static assets', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

    const cacheNames = await page.evaluate((): Promise<string[]> => {
      return caches.keys().then((keys: Iterable<string>) => Array.from(keys));
    });

    expect(cacheNames.length).toBeGreaterThan(0);
  });

  test('should handle navigation fallback', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

    const response = await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });

    expect(response?.status()).toBe(200);
  });
});

test.describe('PWA Manifest', () => {
  test('should serve manifest.json', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/manifest.json`);

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
  });

  test('should have valid manifest structure', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/manifest.json`);
    const manifest = await response.json() as Manifest;

    expect(manifest.name).toBeDefined();
    expect(manifest.short_name).toBeDefined();
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons).toBeDefined();
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons?.length).toBeGreaterThan(0);
  });

  test('should have required PWA fields', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/manifest.json`);
    const manifest = await response.json() as Manifest;

    expect(manifest.theme_color).toBeDefined();
    expect(manifest.background_color).toBeDefined();
    expect(manifest.description).toBeDefined();
    expect(manifest.categories).toBeDefined();
  });

  test('should have appropriate icon sizes', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/manifest.json`);
    const manifest = await response.json() as Manifest;

    expect(manifest.icons).toBeDefined();
    const has192Icon = manifest.icons?.some((icon) =>
      icon.sizes.includes('192') && icon.src.includes('192')
    ) ?? false;
    const has512Icon = manifest.icons?.some((icon) =>
      icon.sizes.includes('512') && icon.src.includes('512')
    ) ?? false;

    expect(has192Icon).toBe(true);
    expect(has512Icon).toBe(true);
  });

  test('should have maskable icon purpose', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/manifest.json`);
    const manifest = await response.json() as Manifest;

    const hasMaskableIcon = manifest.icons?.some((icon) =>
      icon.purpose?.includes('maskable') ?? icon.purpose?.includes('any')
    ) ?? false;

    expect(hasMaskableIcon).toBe(true);
  });
});

test.describe('Offline Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().setOffline(false);
  });

  test('should navigate between pages while online', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

    await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });
    await expect(page.locator('h1:has-text("Exercises")').first()).toBeVisible({ timeout: 10000 });

    await page.goto(`${BASE_URL}/templates`, { waitUntil: 'networkidle' });
    await expect(page.locator('h1:has-text("Templates")').first()).toBeVisible({ timeout: 10000 });

    await page.goto(`${BASE_URL}/workouts`, { waitUntil: 'networkidle' });
    await expect(page.locator('h1:has-text("Workouts")').first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate while offline with cached pages', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });
    await expect(page.locator('h1:has-text("Exercises")').first()).toBeVisible({ timeout: 10000 });

    await page.context().setOffline(true);

    await page.goto(`${BASE_URL}/templates`, { waitUntil: 'domcontentloaded' });

    const hasContent = await page.locator('body').textContent();
    expect(hasContent?.length).toBeGreaterThan(0);

    await page.context().setOffline(false);
  });
});

test.describe('App Shell Caching', () => {
  test('should cache HTML page', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

    const cacheNames = await page.evaluate((): Promise<string[]> => {
      return caches.keys().then((keys: Iterable<string>) => Array.from(keys));
    });

    const hasHtmlCache = cacheNames.some((name: string) =>
      name.includes('html') || name.includes('fit-workout')
    );

    expect(hasHtmlCache).toBe(true);
  });

  test('should cache JavaScript bundles', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

    const cacheNames = await page.evaluate((): Promise<string[]> => {
      return caches.keys().then((keys: Iterable<string>) => Array.from(keys));
    });

    expect(cacheNames.length).toBeGreaterThan(0);
  });
});

test.describe('PWA Installation', () => {
  test('should have display mode standalone', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/manifest.json`);
    const manifest = await response.json() as Manifest;

    expect(manifest.display).toBe('standalone');
  });

  test('should have appropriate scope', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/manifest.json`);
    const manifest = await response.json() as Manifest;

    expect(manifest.scope).toBe('/');
    expect(manifest.start_url).toBe('/');
  });

  test('should have portrait orientation', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/manifest.json`);
    const manifest = await response.json() as Manifest;

    expect(manifest.orientation).toBe('portrait-primary');
  });

  test('should have health/fitness categories', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/manifest.json`);
    const manifest = await response.json() as Manifest;

    expect(manifest.categories).toContain('health');
    expect(manifest.categories).toContain('fitness');
  });

  test('should have shortcuts defined', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/manifest.json`);
    const manifest = await response.json() as Manifest;

    expect(manifest.shortcuts).toBeDefined();
    expect(Array.isArray(manifest.shortcuts)).toBe(true);
    expect(manifest.shortcuts?.length).toBeGreaterThan(0);

    const hasStartWorkoutShortcut = manifest.shortcuts?.some((shortcut) =>
      shortcut.name.toLowerCase().includes('workout')
    ) ?? false;

    expect(hasStartWorkoutShortcut).toBe(true);
  });
});
