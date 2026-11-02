import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer, type Server } from 'node:http';
import { expect, test, type Page } from '@playwright/test';

let hostServer: Server;
let hostOrigin: string;
let embeddedUrl = '';
test.beforeAll(async () => {
  hostServer = createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end(`<iframe title="Artist video" src="${embeddedUrl}" allow="autoplay; fullscreen; picture-in-picture" style="width:100%;height:80vh;border:0"></iframe>`);
  });
  await new Promise<void>(resolve => hostServer.listen(0, '127.0.0.1', resolve));
  const address = hostServer.address();
  hostOrigin = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
});
test.afterAll(async () => { await new Promise<void>(resolve => hostServer.close(() => resolve())); });

async function mediaFixtures(page: Page, hls = false) {
  await page.route('https://media.test/**', route => {
    const name = new URL(route.request().url()).pathname.split('/').pop()!;
    const contentType = name.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : name.endsWith('.m2ts') ? 'video/mp2t' : 'video/mp4';
    return route.fulfill({ body: readFileSync(resolve('tests/fixtures', name)), contentType, headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  await page.route('**/api/embed/portfolio/public', route => route.fulfill({ json: { title: 'Artist demo reel', url: `https://media.test/embed-sample.${hls ? 'm3u8' : 'mp4'}`, poster: '' } }));
}

test('an external website can play the unbranded iframe @mobile', async ({ page, baseURL }) => {
  await mediaFixtures(page);
  const calls: string[] = [];
  page.on('request', request => calls.push(request.url()));
  const embed = `${baseURL}/embed/portfolio/public?autoplay=1&loop=1`;
  // A real server on another port gives a distinct origin in the same network
  // address space. Mocking the host document triggers Chrome's local-network block.
  embeddedUrl = embed;
  const response = page.waitForResponse(response => response.url() === embed);
  await page.goto(hostOrigin, { waitUntil: 'domcontentloaded' });
  expect((await response).headers()['x-frame-options']).toBeUndefined();
  expect((await response).headers()['content-security-policy']).toContain('frame-ancestors *');
  const frame = page.frameLocator('iframe[title="Artist video"]');
  const video = frame.locator('video');
  await expect(video).toBeVisible();
  await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).duration)).toBeGreaterThan(0);
  await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
  expect(await video.evaluate(element => ({ controls: (element as HTMLVideoElement).controls, muted: (element as HTMLVideoElement).muted, loop: (element as HTMLVideoElement).loop }))).toEqual({ controls: true, muted: true, loop: true });
  expect(await frame.locator('body').innerText()).not.toMatch(/animation\s?reference|upgrade|sign in/i);
  await expect(frame.getByRole('link')).toHaveCount(0);
  expect(calls.filter(url => /heycatch|firestore|identitytoolkit/.test(url))).toEqual([]);
});

test('the embed plays HLS and gives a plain unavailable state for private videos', async ({ page }) => {
  await mediaFixtures(page, true);
  await page.goto('/embed/portfolio/public', { waitUntil: 'domcontentloaded' });
  const video = page.locator('video');
  await expect(video).toBeVisible();
  await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).duration)).toBeGreaterThan(0);
  await video.evaluate(async element => { const player = element as HTMLVideoElement; player.muted = true; await player.play(); });
  await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
  await page.route('**/api/embed/clip/private', route => route.fulfill({ status: 404, json: { message: 'This video is unavailable or is not public.' } }));
  await page.goto('/embed/clip/private', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-embed-player]').getByRole('alert')).toContainText('not public');
  await expect(page.locator('video')).toHaveCount(0);
});

test('copyable embed code is available from a public portfolio video', async ({ page }) => {
  await mediaFixtures(page);
  await page.addInitScript(() => {
    (window as any).__storageReads = 0;
    const get = Storage.prototype.getItem;
    Storage.prototype.getItem = function(key: string) { (window as any).__storageReads++; return get.call(this, key); };
  });
  const video = { id: 'public', title: 'Artist demo reel', videoUrl: 'https://media.test/embed-sample.mp4', thumbnailUrl: '', posterUrl: '', tags: [], isPortfolio: true, status: 'published' };
  await page.route('**/data/*videos*.json', route => route.fulfill({ json: [video] }));
  await page.route('**/api/import/search**', route => route.fulfill({ json: { results: [], nextCursor: null } }));
  await page.route('**/firestore.googleapis.com/**', route => route.abort());
  await page.goto('/home', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-reference-id="public"] [class~="group/card"]').click({ position: { x: 100, y: 80 } });
  await page.getByRole('button', { name: 'Embed video', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Embed video', exact: true });
  const code = dialog.getByRole('textbox', { name: 'Embed code' });
  await expect(code).toHaveValue(/\/embed\/portfolio\/public/);
  await dialog.getByLabel('Autoplay (muted)', { exact: true }).check();
  await expect(code).toHaveValue(/autoplay=1&amp;muted=1/);
  await dialog.getByLabel('Loop', { exact: true }).check();
  await expect(code).toHaveValue(/loop=1/);
  await expect(code).toHaveValue(/allowfullscreen/);
  await dialog.getByRole('button', { name: 'Copy embed code', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Copied', exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__storageReads)).toBeLessThan(200);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Artist demo reel', exact: true })).toBeVisible();
});

test('regular pages keep their existing same-origin framing protection', async ({ request }) => {
  const response = await request.get('/home');
  expect(response.headers()['x-frame-options']).toBe('SAMEORIGIN');
});
