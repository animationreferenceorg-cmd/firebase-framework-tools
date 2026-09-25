import { expect, test, type Page } from '@playwright/test';

/**
 * Smoke coverage for the primary routes and the two billing redirects.
 * These run signed out; they prove each route renders without a server
 * error or a client crash, not that every feature works.
 */

const ROUTES = [
  { name: 'home', path: '/home' },
  { name: 'login', path: '/login' },
  { name: 'references', path: '/references' },
  { name: 'vault', path: '/vault' },
  { name: 'moodboard', path: '/moodboard' },
  { name: 'paint', path: '/paint' },
  { name: 'profile', path: '/profile' },
];

async function expectHealthyPage(page: Page, path: string) {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
  expect(response, `no response for ${path}`).not.toBeNull();
  expect(response!.status(), `${path} returned ${response!.status()}`).toBeLessThan(500);

  // <body> itself can report hidden on full-screen canvas layouts (paint), so
  // check for real visible content instead.
  await expect(page.locator('a:visible, button:visible, h1:visible, h2:visible, canvas:visible').first()).toBeVisible();
  // Next.js error boundary / dev overlay text.
  await expect(page.getByText(/Application error|Unhandled Runtime Error|Internal Server Error/i)).toHaveCount(0);
  // Give client components a moment to hydrate and surface crashes.
  await page.waitForTimeout(1500);
  expect(pageErrors.filter((m) => !/ResizeObserver|Failed to fetch|NetworkError|Load failed/i.test(m)), `client errors on ${path}`).toEqual([]);
}

for (const route of ROUTES) {
  test(`${route.name} renders @mobile`, async ({ page }) => {
    await expectHealthyPage(page, route.path);
  });
}

test('login page offers a sign-in action', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('button', { name: /sign in|log in|continue with google/i }).first()).toBeVisible();
});

test.describe('billing redirects', () => {
  test('checkout endpoint refuses signed-out requests', async ({ request }) => {
    const res = await request.post('/api/checkout', { data: { plan: 'pro_monthly' } });
    expect(res.status()).toBe(401);
    expect(await res.json()).toMatchObject({ error: 'AUTH_REQUIRED' });
  });

  test('billing portal endpoint refuses signed-out requests', async ({ request }) => {
    const res = await request.post('/api/portal', { data: {} });
    expect(res.status()).toBe(401);
  });

  test('webhook endpoint rejects unsigned events', async ({ request }) => {
    const res = await request.post('/api/webhooks/stripe', { data: { type: 'checkout.session.completed' } });
    // 400 (no signature) when configured; 500 when STRIPE_WEBHOOK_SECRET is unset locally.
    expect([400, 500]).toContain(res.status());
  });
});
