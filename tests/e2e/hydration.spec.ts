import { expect, test } from '@playwright/test';

test('home hydrates with matching dialog IDs on fresh loads and reloads', async ({ page }) => {
  const hydrationErrors: string[] = [];
  page.on('console', message => {
    if (/hydrati|server rendered HTML|did not match/i.test(message.text())) hydrationErrors.push(message.text());
  });
  page.on('pageerror', error => {
    if (/hydrati|server rendered HTML|did not match/i.test(error.message)) hydrationErrors.push(error.message);
  });
  await page.route('**/api/import/search**', route => route.fulfill({ json: { results: [], nextCursor: null } }));
  await page.route('**/data/*videos*.json', route => route.fulfill({ json: [] }));
  await page.route('**/firestore.googleapis.com/**', route => route.abort());

  for (let attempt = 0; attempt < 3; attempt++) {
    const hydrated = page.waitForResponse(response => response.url().includes('/api/import/search'), { timeout: 15000 });
    await page.goto('/home', { waitUntil: 'domcontentloaded' });
    await hydrated;
    expect(hydrationErrors).toEqual([]);
    const trigger = page.getByRole('button', { name: 'Recent Updates', exact: true });
    const controlledId = await trigger.getAttribute('aria-controls');
    // Next's development issue badge overlaps the left edge of this footer row.
    const bounds = await trigger.boundingBox();
    await trigger.click({ position: { x: bounds!.width - 12, y: 12 } });
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('id', controlledId!);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    expect(hydrationErrors).toEqual([]);
  }
  await expect.poll(() => page.evaluate(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    return registrations.filter(registration => registration.scope === `${location.origin}/`).length;
  })).toBe(0);
});
