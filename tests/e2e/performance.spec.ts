import { expect, test } from '@playwright/test';

test('catalog loads independently of slow external discovery and shares quota state', async ({ page }) => {
  const videos = Array.from({ length: 96 }, (_, index) => ({
    id: `perf-${index}`,
    title: index % 2 ? `Walk cycle ${index}` : `Combat ${index}`,
    tags: index % 2 ? ['walk cycle'] : ['combat'],
    type: 'video',
    status: 'published',
    videoUrl: 'https://storage.googleapis.com/example/reference.mp4',
    thumbnailUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"/>',
  }));

  await page.addInitScript(() => {
    const listeners = new Set<EventListenerOrEventListenerObject>();
    const add = window.addEventListener.bind(window);
    const remove = window.removeEventListener.bind(window);
    window.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
      if (type === 'animref:quota-changed') listeners.add(listener);
      return add(type, listener, options);
    }) as typeof window.addEventListener;
    window.removeEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions) => {
      if (type === 'animref:quota-changed') listeners.delete(listener);
      return remove(type, listener, options);
    }) as typeof window.removeEventListener;
    Object.defineProperty(window, '__quotaListenerCount', { get: () => listeners.size });
  });

  await page.route('**/data/initial-videos.json', route => route.fulfill({ json: videos.slice(0, 30) }));
  await page.route('**/data/videos-snapshot.json', route => route.fulfill({ json: videos }));
  let finishDiscovery!: () => void;
  const discoveryGate = new Promise<void>(resolve => { finishDiscovery = resolve; });
  await page.route('**/api/import/search**', async route => {
    if (new URL(route.request().url()).searchParams.get('mode') === 'explore') await discoveryGate;
    await route.fulfill({ json: { results: [] } });
  });
  await page.route('https://storage.googleapis.com/example/**', route => route.abort());
  // Keep live community data from changing the fixture's catalog count.
  await page.route('**/firestore.googleapis.com/**', route => route.abort());

  try {
    await page.goto('/home', { waitUntil: 'domcontentloaded' });
    const library = page.locator('#reference-library');
    // The full 96-reference count must appear before external discovery resolves.
    await expect(library.getByText('96', { exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => (window as any).__quotaListenerCount)).toBe(1);
    await library.locator('[class~="group/card"]').first().click({ position: { x: 100, y: 80 }, timeout: 10000 });
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    const search = page.locator('input[placeholder]').first();
    await search.fill('walk cycle');
    // This also exercises the compiled worker, not just the pure scoring helper.
    await expect(library.getByText('48', { exact: true })).toBeVisible();
    await search.fill('combat');
    await expect(library.getByText('48', { exact: true })).toBeVisible();
    await expect(library.getByText(/Walk cycle \d+/).first()).toHaveCount(0);
    await search.fill('');
    await expect(library.getByText('96', { exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => (window as any).__quotaListenerCount)).toBe(1);
  } finally {
    finishDiscovery();
  }
});
