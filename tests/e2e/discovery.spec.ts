import { expect, test, type Page } from '@playwright/test';

function item(index: number, title = `Dragon model ${index}`) {
  const portrait = index % 3 === 0;
  return {
    id: `sf_test_${index}`, title, source: 'sketchfab', mediaType: 'model3d',
    sourceUrl: `https://sketchfab.com/3d-models/test-${index}`,
    thumbnailUrl: `/discovery-fixture/${portrait ? 'portrait' : 'landscape'}.svg`,
    mediaUrl: `/discovery-fixture/${portrait ? 'portrait' : 'landscape'}.svg`,
    width: portrait ? 400 : 800, height: portrait ? 800 : 400,
    tags: ['3d-model', title],
  };
}

async function fixtures(page: Page) {
  await page.route('**/data/*videos*.json', route => route.fulfill({ json: [] }));
  await page.route('**/firestore.googleapis.com/**', route => route.abort());
  await page.route('**/discovery-fixture/*.svg', route => {
    const portrait = route.request().url().includes('portrait');
    return route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="${portrait ? 400 : 800}" height="${portrait ? 800 : 400}"><rect width="100%" height="100%" fill="#584596"/></svg>` });
  });
}

async function openHome(page: Page) {
  // Discovery starts in an effect, so its first request confirms the rendered
  // filter buttons have hydrated before the test clicks them.
  const ready = page.waitForResponse(response => response.url().includes('/api/import/search'));
  await page.goto('/home', { waitUntil: 'domcontentloaded' });
  await ready;
}

test('indexed artwork appears before a slow native API and survives local relevance scoring', async ({ page }) => {
  await fixtures(page);
  let releaseNative!: () => void;
  const gate = new Promise<void>(resolve => { releaseNative = resolve; });
  await page.route('**/api/import/search**', async route => {
    const params = new URL(route.request().url()).searchParams;
    if (params.get('q') === 'female robot turnaround' && params.get('source') === 'artstation') await gate;
    const results = params.get('q') === 'female robot turnaround' && params.get('source') === 'web-images'
      ? ['artstation', 'pinterest'].map((source, index) => ({
        ...item(index, `Study ${index + 1}`), id: `web_${source}`, source, mediaType: 'image', tags: [],
        sourceUrl: source === 'artstation' ? 'https://www.artstation.com/artwork/study' : 'https://www.pinterest.com/pin/123/',
      })) : [];
    await route.fulfill({ json: { results, nextCursor: null } });
  });
  try {
    await openHome(page);
    await page.getByRole('button', { name: 'VisDev', exact: true }).click();
    await page.locator('input[placeholder]').first().fill('female robot turnaround');
    await expect(page.locator('[data-reference-id="web_artstation"]')).toBeVisible();
    await expect(page.locator('[data-reference-id="web_pinterest"]')).toBeVisible();
    await expect(page.getByText('Finding more references…')).toBeVisible();
    releaseNative();
    await expect(page.getByText('Finding more references…')).toHaveCount(0);
    await expect(page.locator('[data-reference-id="web_artstation"]')).toHaveCount(1);
  } finally { releaseNative(); }
});

test('search mixes Pinterest into the first page and reuses recent provider results', async ({ page }) => {
  await fixtures(page);
  let dragonPinRequests = 0;
  await page.route('**/api/import/search**', async route => {
    const params = new URL(route.request().url()).searchParams;
    const source = params.get('source');
    const query = params.get('q');
    if (query === 'dragon' && source === 'pinterest') dragonPinRequests++;
    const results = !query ? [] : source === 'artstation'
      ? Array.from({ length: 60 }, (_, index) => ({ ...item(index, `${query} study`), source: 'artstation', mediaType: 'image' }))
      : source === 'pinterest' ? [{
        ...item(99, `${query} pose`), id: `pin_${query}`, source: 'pinterest', mediaType: 'image',
        sourceUrl: `https://www.pinterest.com/pin/${query === 'dragon' ? 1 : 2}/`,
      }] : [];
    await route.fulfill({ json: { results, nextCursor: null, providers: [{ source, status: 'ok' }] } });
  });
  await openHome(page);
  const search = page.locator('input[placeholder]').first();
  await search.fill('dragon');
  await expect(page.locator('[data-reference-id="pin_dragon"]')).toBeVisible();
  const firstIds = await page.locator('#reference-library [data-reference-id]').evaluateAll(elements => elements.slice(0, 30).map(element => element.getAttribute('data-reference-id')));
  expect(firstIds).toContain('pin_dragon');
  await search.fill('horse');
  await expect(page.locator('[data-reference-id="pin_horse"]')).toBeVisible();
  await search.fill('dragon');
  await expect(page.locator('[data-reference-id="pin_dragon"]')).toBeVisible();
  expect(dragonPinRequests).toBe(1);
});

test('3D discovery keeps paging, deduplicates and preserves image proportions @mobile', async ({ page }) => {
  await fixtures(page);
  const requestedPages: string[] = [];
  await page.route('**/api/import/search**', route => {
    const params = new URL(route.request().url()).searchParams;
    if (params.get('source') !== 'sketchfab' || params.get('tab') !== '3d-models') return route.fulfill({ json: { results: [], nextCursor: null } });
    const cursor = params.get('cursor') || 'first';
    requestedPages.push(cursor);
    const start = cursor === 'first' ? 0 : cursor === 'page-2' ? 24 : 48;
    const results = Array.from({ length: start === 48 ? 12 : 24 }, (_, index) => item(start + index));
    if (start === 24) results.unshift(item(0));
    return route.fulfill({ json: { results, nextCursor: start === 48 ? null : start === 0 ? 'page-2' : 'page-3' } });
  });
  await openHome(page);
  await page.getByRole('button', { name: '3D Models', exact: true }).click();
  const library = page.locator('#reference-library');
  await expect(library.locator('[data-reference-id="sf_test_0"]')).toBeVisible();
  for (const pages of [2, 3]) {
    await expect.poll(async () => {
      await library.locator('[aria-live="polite"]').scrollIntoViewIfNeeded();
      return requestedPages.length;
    }).toBeGreaterThanOrEqual(pages);
  }
  await expect(library.getByText('60', { exact: true })).toBeVisible();
  expect(requestedPages).toEqual(['first', 'page-2', 'page-3']);
  await expect(library.locator('[data-reference-id="sf_test_0"]')).toHaveCount(1);
  await expect(library.getByText(/You’re caught up/)).toBeVisible();
  const ratios = await library.locator('[data-reference-id] [class~="group/card"]').evaluateAll(elements => elements.slice(0, 3).map(element => {
    const rect = element.getBoundingClientRect();
    return rect.width / rect.height;
  }));
  expect(ratios[0]).toBeCloseTo(0.5, 1);
  expect(ratios[1]).toBeCloseTo(2, 1);
  // Switching tabs must not carry model-only results into VisDev.
  await page.getByRole('button', { name: 'VisDev', exact: true }).click();
  await expect(library.locator('[data-reference-id^="sf_test_"]')).toHaveCount(0);
});

test('a failed provider can retry without discarding existing cards', async ({ page }) => {
  await fixtures(page);
  let attempts = 0;
  await page.route('**/api/import/search**', route => {
    const params = new URL(route.request().url()).searchParams;
    const active = params.get('tab') === '3d-models';
    if (active && params.get('source') === 'sketchfab') return route.fulfill({ json: { results: [item(0)], nextCursor: null } });
    if (active && params.get('source') === 'artstation') {
      attempts++;
      return route.fulfill({ json: attempts === 1
        ? { results: [], providers: [{ source: 'artstation', status: 'unavailable', message: 'ArtStation temporarily unavailable.' }] }
        : { results: [{ ...item(1), id: 'as_recovered', source: 'artstation' }], nextCursor: null } });
    }
    return route.fulfill({ json: { results: [], nextCursor: null } });
  });
  await openHome(page);
  await page.getByRole('button', { name: '3D Models', exact: true }).click();
  await expect(page.locator('[data-reference-id="sf_test_0"]')).toBeVisible();
  await page.getByRole('button', { name: 'Retry unavailable sources' }).click();
  await expect(page.locator('[data-reference-id="as_recovered"]')).toBeVisible();
  await expect(page.locator('[data-reference-id="sf_test_0"]')).toHaveCount(1);
  expect(attempts).toBe(2);
});

test('changing the search cancels old requests and prevents stale results', async ({ page }) => {
  await fixtures(page);
  let releaseOld!: () => void;
  let oldStarted!: () => void;
  const started = new Promise<void>(resolve => { oldStarted = resolve; });
  const gate = new Promise<void>(resolve => { releaseOld = resolve; });
  await page.route('**/api/import/search**', async route => {
    const params = new URL(route.request().url()).searchParams;
    const query = params.get('q');
    if (params.get('source') !== 'sketchfab' || !query) return route.fulfill({ json: { results: [], nextCursor: null } });
    if (query === 'dragon') { oldStarted(); await gate; }
    await route.fulfill({ json: { results: [item(query === 'dragon' ? 99 : 100, `${query} model`)], nextCursor: null } });
  });
  try {
    await openHome(page);
    await page.getByRole('button', { name: '3D Models', exact: true }).click();
    const search = page.locator('input[placeholder]').first();
    await search.fill('dragon');
    await started;
    await search.fill('horse');
    await expect(page.locator('[data-reference-id="sf_test_100"]')).toBeVisible();
    releaseOld();
    await expect(page.locator('[data-reference-id="sf_test_99"]')).toHaveCount(0);
  } finally { releaseOld(); }
});

test('the media dropdown filters results and requests matching providers', async ({ page }) => {
  await fixtures(page);
  const requested: URLSearchParams[] = [];
  await page.route('**/api/import/search**', route => {
    const params = new URL(route.request().url()).searchParams;
    requested.push(params);
    const results = params.get('source') === 'sketchfab' ? [item(0)] : params.get('source') === 'artstation'
      ? [{ ...item(1), id: 'as_painting', source: 'artstation', mediaType: 'image', tags: ['visdev'] }] : [];
    return route.fulfill({ json: { results, nextCursor: null } });
  });
  await openHome(page);
  await expect(page.locator('[data-reference-id="sf_test_0"]')).toBeVisible();
  await page.getByRole('button', { name: 'Filter media type' }).click();
  await page.getByRole('menuitemradio', { name: 'Images', exact: true }).click();
  await expect(page.locator('[data-reference-id="as_painting"]')).toBeVisible();
  await expect(page.locator('[data-reference-id="sf_test_0"]')).toHaveCount(0);
  await expect(page.locator('[data-layout="masonry"]')).toBeVisible();
  expect(requested.filter(params => params.get('media') === 'image').map(params => params.get('source'))).not.toContain('sketchfab');
});
