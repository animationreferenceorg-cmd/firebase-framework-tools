// End-to-end check of the extension's hover Save and right-click save.
// Loads the unpacked extension in Playwright's Chromium, serves a local test
// page, and points the extension at a local stand-in API, so nothing touches
// the live site or a real account.
//
//   node tests/extension/save-button.e2e.mjs
//
// Needs Playwright's Chromium (npx playwright install chromium).
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const EXTENSION = path.join(ROOT, 'extension');
const PAGE_PORT = 4580;
const API_PORT = 4581;
const PAGE = `http://127.0.0.1:${PAGE_PORT}`;
const API = `http://127.0.0.1:${API_PORT}`;
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-ext-e2e-'));

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures += 1;
}

// ---------------------------------------------------------------- fixtures

async function recordTestVideo() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 320, height: 180 }, recordVideo: { dir: work, size: { width: 320, height: 180 } } });
  const page = await context.newPage();
  await page.setContent('<div id="b" style="width:320px;height:180px;background:#7c3aed"></div><script>let i=0;setInterval(()=>{document.getElementById("b").style.background=i++%2?"#7c3aed":"#f59e0b"},120)</script>');
  await page.waitForTimeout(1500);
  const video = page.video();
  await context.close();
  await browser.close();
  return fs.readFileSync(await video.path());
}

const bigPng = fs.readFileSync(path.join(EXTENSION, 'site-icon.png'));
const smallPng = fs.readFileSync(path.join(EXTENSION, 'icon-48.png'));

function testPage(extraHead = '') {
  return `<!doctype html><html><head><meta charset="utf-8"><title>E2E Reference Blog</title>${extraHead}</head>
<body style="margin:0;padding:40px;font-family:sans-serif;background:#fff">
<h1>Reference blog</h1>
<img id="big" src="/big.png" alt="Sword draw key pose" style="width:480px;height:auto;display:block">
<p style="height:40px">Some text.</p>
<img id="small" src="/small.png" alt="tiny" style="width:48px;display:block">
<p style="height:40px">More text.</p>
<div data-pin-nopin><img id="optout" src="/big.png?copy=1" alt="opted out" style="width:400px;display:block"></div>
<p style="height:40px">Video below.</p>
<video id="vid" src="/clip.webm" muted loop autoplay playsinline style="width:480px;height:270px;display:block;background:#000"></video>
</body></html>`;
}

function startPageServer(videoBytes) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, PAGE);
      if (url.pathname === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(testPage()); return; }
      if (url.pathname === '/opted-out-page') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(testPage('<meta name="pinterest" content="nopin">')); return; }
      if (url.pathname === '/big.png') { res.writeHead(200, { 'content-type': 'image/png' }); res.end(bigPng); return; }
      if (url.pathname === '/small.png') { res.writeHead(200, { 'content-type': 'image/png' }); res.end(smallPng); return; }
      if (url.pathname === '/clip.webm') { res.writeHead(200, { 'content-type': 'video/webm' }); res.end(videoBytes); return; }
      res.writeHead(404); res.end();
    });
    server.listen(PAGE_PORT, '127.0.0.1', () => resolve(server));
  });
}

const received = [];
function startMockApi() {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks);
      const auth = req.headers.authorization || '';
      const json = (status, value) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(value)); };
      if (auth !== 'Bearer e2e-token') return json(401, { error: 'AUTH_REQUIRED', message: 'Sign in first.' });
      if (req.method === 'GET' && req.url === '/api/extension/bootstrap') {
        return json(200, {
          user: { uid: 'u1', displayName: 'E2E Animator' },
          capabilities: { privateBoards: false },
          boards: [
            { id: 'board_combat', title: 'Combat refs', isPrivate: false },
            { id: 'board_secret', title: 'Old private board', isPrivate: true },
            { id: 'board_walks', title: 'Walk cycles', isPrivate: false },
          ],
        });
      }
      if (req.method === 'POST' && req.url === '/api/clips/upload') {
        const form = await new Request(`${API}/x`, { method: 'POST', headers: { 'content-type': req.headers['content-type'] }, body }).formData();
        const file = form.get('file');
        received.push({
          route: 'upload',
          fileType: file?.type, fileSize: file?.size,
          fields: Object.fromEntries([...form.entries()].filter(([key]) => key !== 'file')),
        });
        return json(201, { id: `clip_e2e_${received.length}`, url: `/clip/clip_e2e_${received.length}` });
      }
      if (req.method === 'POST' && req.url === '/api/clips') {
        received.push({ route: 'clips', fields: JSON.parse(body.toString() || '{}') });
        return json(202, { id: `clip_e2e_${received.length}` });
      }
      json(404, { error: 'NOT_FOUND' });
    });
    server.listen(API_PORT, '127.0.0.1', () => resolve(server));
  });
}

// ---------------------------------------------------------------- helpers

const hostState = (page) => page.evaluate(() => {
  const host = document.getElementById('animref-save-host');
  return host ? Object.fromEntries([...host.attributes].filter((a) => a.name.startsWith('data-')).map((a) => [a.name.slice(5), a.value])) : null;
});

async function waitForState(page, key, value, timeout = 6000) {
  const start = Date.now();
  for (;;) {
    const state = await hostState(page);
    const actual = state?.[key];
    if (typeof value === 'function' ? value(actual) : actual === value) return state;
    if (Date.now() - start > timeout) return state;
    await page.waitForTimeout(80);
  }
}

async function hoverElement(page, selector) {
  await page.locator(selector).scrollIntoViewIfNeeded();
  await page.mouse.move(5, 5);
  await page.waitForTimeout(250);
  const box = await page.locator(selector).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
  return box;
}

async function clickSaveButton(page, box) {
  // The button sits 10px inside the media's top-left corner.
  await page.mouse.move(Math.max(box.x, 0) + 40, Math.max(box.y, 0) + 28, { steps: 3 });
  await page.mouse.down();
  await page.mouse.up();
}

// ---------------------------------------------------------------- run

const videoBytes = await recordTestVideo();
const pageServer = await startPageServer(videoBytes);
const apiServer = await startMockApi();

const context = await chromium.launchPersistentContext(path.join(work, 'profile'), {
  channel: 'chromium',
  headless: true,
  viewport: { width: 1280, height: 900 },
  args: [`--disable-extensions-except=${EXTENSION}`, `--load-extension=${EXTENSION}`],
});

try {
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 15000 });
  await new Promise((resolve) => setTimeout(resolve, 600));
  const swErrors = [];
  worker.on('console', (message) => { if (message.type() === 'error') swErrors.push(message.text()); });

  const connect = () => worker.evaluate((api) => chrome.storage.local.set({ apiOrigin: api, firebaseIdToken: 'e2e-token', firebaseTokenExpiresAt: Date.now() + 3_600_000 }), API);
  await connect();

  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(PAGE);
  await page.waitForFunction(() => document.getElementById('vid').readyState >= 2 && document.getElementById('big').complete);

  // 1. Hover a large image: the button appears.
  let box = await hoverElement(page, '#big');
  let state = await waitForState(page, 'button', 'visible');
  check('hover on a large image shows Save', state?.button === 'visible' && state?.kind === 'image', JSON.stringify(state));

  // 2. Small images and opted-out images get no button.
  await hoverElement(page, '#small');
  await page.waitForTimeout(450);
  check('a 48px image gets no button', (await hostState(page))?.button !== 'visible');
  await hoverElement(page, '#optout');
  await page.waitForTimeout(450);
  check('an image inside data-pin-nopin gets no button', (await hostState(page))?.button !== 'visible');

  // 3. Full save of the image: first save asks for the rights confirmation.
  box = await hoverElement(page, '#big');
  await waitForState(page, 'button', 'visible');
  await page.mouse.move(Math.max(box.x, 0) + 40, Math.max(box.y, 0) + 28, { steps: 3 });
  await page.waitForTimeout(300);
  check('the button stays visible with the mouse over it', (await hostState(page))?.button === 'visible');
  await page.screenshot({ path: path.join(work, 'button-hover.png'), clip: { x: 0, y: 0, width: 640, height: 220 } });
  await clickSaveButton(page, box);
  state = await waitForState(page, 'status', 'ready');
  check('clicking Save opens the board picker', state?.popover === 'open' && state?.status === 'ready', JSON.stringify(state));
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(work, 'popover.png') });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  check('Save is blocked until the rights box is ticked', received.length === 0 && (await hostState(page))?.popover === 'open');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Enter');
  state = await waitForState(page, 'toast', (value) => Boolean(value), 15000);
  check('saving shows the confirmation', state?.toast === 'Saved to Combat refs', JSON.stringify(state));
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(work, 'toast.png') });
  const imageSave = received[0];
  check('the image file reaches the upload API intact', imageSave?.route === 'upload' && imageSave.fileType === 'image/png' && imageSave.fileSize === bigPng.length, JSON.stringify(imageSave && { type: imageSave.fileType, size: imageSave.fileSize }));
  check('the save credits its source page and uses the chosen board', imageSave?.fields.sourceUrl === `${PAGE}/` && imageSave?.fields.sourceTitle === 'E2E Reference Blog' && imageSave?.fields.boardId === 'board_combat' && imageSave?.fields.isPrivate === 'false' && imageSave?.fields.title === 'Sword draw key pose', JSON.stringify(imageSave?.fields));

  // 4. Video: hover, save (rights already confirmed, last board remembered).
  box = await hoverElement(page, '#vid');
  state = await waitForState(page, 'button', 'visible');
  check('hover on a video shows Save', state?.kind === 'video', JSON.stringify(state));
  await clickSaveButton(page, box);
  await waitForState(page, 'status', 'ready');
  await page.keyboard.press('Enter');
  // The first save's toast may still be showing, so wait for the upload itself.
  for (let waited = 0; received.length < 2 && waited < 15000; waited += 100) await page.waitForTimeout(100);
  state = await waitForState(page, 'status', 'saved');
  check('saving the video closes the picker', state?.status === 'saved' && state?.popover === 'closed', JSON.stringify(state));
  const videoSave = received[1];
  check('the video file reaches the upload API', videoSave?.fileType === 'video/webm' && videoSave?.fileSize === videoBytes.length && videoSave?.fields.boardId === 'board_combat', JSON.stringify(videoSave && { type: videoSave.fileType, size: videoSave.fileSize, board: videoSave.fields.boardId }));

  // 5. Right-click save: what the context menu sends to the page.
  const tabId = await worker.evaluate(async (url) => (await chrome.tabs.query({})).find((tab) => tab.url?.startsWith(url))?.id, PAGE);
  box = await hoverElement(page, '#big');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' });
  await worker.evaluate(({ id, src, url }) => chrome.tabs.sendMessage(id, { type: 'AR_SAVE_TARGET', mediaType: 'image', srcUrl: src, pageUrl: url }), { id: tabId, src: `${PAGE}/big.png`, url: `${PAGE}/` });
  state = await waitForState(page, 'status', 'ready');
  check('right-click save opens the board picker on the image', state?.popover === 'open' && state?.status === 'ready', JSON.stringify(state));
  await page.keyboard.press('Escape');
  state = await waitForState(page, 'popover', 'closed');
  check('Escape closes the picker', state?.popover === 'closed');
  await worker.evaluate(({ id }) => chrome.tabs.sendMessage(id, { type: 'AR_SAVE_TARGET', mediaType: null, linkUrl: 'https://example.com/article' }), { id: tabId });
  state = await waitForState(page, 'status', 'unsupported');
  check('right-click on an ordinary link explains it can’t be saved', state?.status === 'unsupported', JSON.stringify(state));
  await page.keyboard.press('Escape');

  // 6. Signed out: Save asks to connect instead of failing.
  await worker.evaluate(async () => { await chrome.storage.local.remove(['firebaseIdToken', 'firebaseTokenExpiresAt']); await (chrome.storage.session || chrome.storage.local).remove('quickBootstrap'); });
  box = await hoverElement(page, '#big');
  await waitForState(page, 'button', 'visible');
  await clickSaveButton(page, box);
  state = await waitForState(page, 'status', 'needs-connect');
  check('when signed out, Save asks to connect the account', state?.status === 'needs-connect', JSON.stringify(state));
  await page.keyboard.press('Escape');
  await connect();

  // 7. Page-wide opt-out and excluded hosts.
  await page.goto(`${PAGE}/opted-out-page`);
  await page.waitForFunction(() => document.getElementById('big').complete);
  await hoverElement(page, '#big');
  await page.waitForTimeout(450);
  check('a page with <meta name="pinterest" content="nopin"> gets no buttons', (await hostState(page))?.button !== 'visible');
  await page.goto(`http://localhost:${PAGE_PORT}/`);
  await page.waitForFunction(() => document.getElementById('big').complete);
  await hoverElement(page, '#big');
  await page.waitForTimeout(450);
  check('excluded hosts (localhost) get no buttons', (await hostState(page)) === null);

  check('no page errors', pageErrors.length === 0, pageErrors.join(' | '));
  check('no extension errors', swErrors.length === 0, swErrors.join(' | '));
  console.log(`screenshots: ${work}`);
} finally {
  await context.close();
  pageServer.close();
  apiServer.close();
}

console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
