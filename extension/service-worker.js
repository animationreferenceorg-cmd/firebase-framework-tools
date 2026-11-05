// Shared hover-save rules (file types, size caps, supported post links).
import './save-rules.js';

const DEFAULT_ORIGIN = 'https://animationreference.org';
const sessionStore = chrome.storage.session || chrome.storage.local;
const credentialStore = chrome.storage.local;

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await credentialStore.get('apiOrigin');
  if (!stored.apiOrigin) {
    credentialStore.set({ apiOrigin: DEFAULT_ORIGIN });
  }
});

async function getRelevantTabs() {
  try {
    const allTabs = await chrome.tabs.query({});
    return (allTabs || []).filter((t) => {
      if (!t.url) return false;
      try {
        const u = new URL(t.url);
        return (
          u.hostname === 'localhost' ||
          u.hostname === '127.0.0.1' ||
          u.hostname === 'animationreference.org' ||
          u.hostname.endsWith('.animationreference.org')
        );
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }
}

async function getOrigin() {
  const data = await credentialStore.get('apiOrigin');
  try {
    const tabs = await getRelevantTabs();
    const localTab = tabs.find((t) => t.url && (t.url.startsWith('http://localhost:3001') || t.url.startsWith('http://localhost:3000') || t.url.startsWith('http://127.0.0.1:3001') || t.url.startsWith('http://127.0.0.1:3000')));
    if (localTab?.url) {
      const devOrigin = new URL(localTab.url).origin;
      if (devOrigin !== data.apiOrigin) {
        await credentialStore.set({ apiOrigin: devOrigin });
      }
      return devOrigin;
    }
    if (tabs.length > 0 && tabs[0].url) {
      const devOrigin = new URL(tabs[0].url).origin;
      if (devOrigin !== data.apiOrigin) {
        await credentialStore.set({ apiOrigin: devOrigin });
      }
      return devOrigin;
    }
  } catch {}
  return data.apiOrigin || 'http://localhost:3001';
}

async function fetchWithOriginFallback(path, options = {}) {
  const primary = await getOrigin();
  const candidates = [
    primary,
    'http://localhost:3001',
    'http://localhost:3000',
    DEFAULT_ORIGIN,
  ].filter((v, i, arr) => v && arr.indexOf(v) === i);

  let lastError = null;
  let lastResponse = null;

  for (const origin of candidates) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(`${origin}${path}`, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.status !== 404 && res.status < 500) {
        if (origin !== primary) {
          await credentialStore.set({ apiOrigin: origin }).catch(() => {});
        }
        return { response: res, origin };
      }
      lastResponse = { response: res, origin };
    } catch (err) {
      lastError = err;
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError || new Error('Could not reach Animation Reference server.');
}


async function tryAutoSignInFromOpenTabs() {
  try {
    const tabs = await getRelevantTabs();
    for (const tab of tabs) {
      if (!tab.id) continue;
      const [res] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const bridge = document.getElementById('animref-extension-auth-bridge');
          if (bridge?.dataset?.token) {
            return {
              token: bridge.dataset.token,
              refreshToken: bridge.dataset.refreshToken,
              expiresAt: Number(bridge.dataset.expiresAt || 0),
              origin: bridge.dataset.origin || location.origin,
            };
          }
          return null;
        },
      }).catch(() => [null]);

      if (res?.result?.token) {
        await handleConnect(res.result, res.result.origin);
        return res.result.token;
      }
    }
  } catch {}

  try {
    if (chrome.cookies) {
      const urlsToCheck = ['http://localhost:3001', 'http://localhost:3000', 'http://127.0.0.1:3001', 'https://animationreference.org'];
      for (const checkUrl of urlsToCheck) {
        const cookie = await chrome.cookies.get({ url: checkUrl, name: 'animref_auth_token' }).catch(() => null);
        if (cookie?.value) {
          const token = decodeURIComponent(cookie.value);
          await handleConnect({ token }, checkUrl);
          return token;
        }
      }
    }
  } catch {}

  return null;
}

async function getToken(force = false) {
  const stored = await credentialStore.get(['firebaseIdToken', 'firebaseRefreshToken', 'firebaseApiKey', 'firebaseTokenExpiresAt']);
  const hasValidToken = !force && stored.firebaseIdToken && (!stored.firebaseTokenExpiresAt || stored.firebaseTokenExpiresAt > Date.now() + 60_000);
  if (hasValidToken) return stored.firebaseIdToken;
  if (stored.firebaseRefreshToken && stored.firebaseApiKey) {
    try {
      const response = await fetch("https://securetoken.googleapis.com/v1/token?key=" + encodeURIComponent(stored.firebaseApiKey), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: stored.firebaseRefreshToken }),
      });
      const refreshed = await response.json();
      if (!response.ok || !refreshed.id_token) {
        if (refreshed.error?.message === 'TOKEN_EXPIRED' || refreshed.error?.message === 'USER_DISABLED') {
          await credentialStore.remove(['firebaseIdToken', 'firebaseRefreshToken', 'firebaseApiKey', 'firebaseTokenExpiresAt']);
        }
        throw new Error(refreshed.error?.message || 'Firebase session refresh failed.');
      }
      const next = {
        firebaseIdToken: refreshed.id_token,
        firebaseRefreshToken: refreshed.refresh_token || stored.firebaseRefreshToken,
        firebaseTokenExpiresAt: Date.now() + Number(refreshed.expires_in || 3600) * 1000,
      };
      await credentialStore.set(next);
      return next.firebaseIdToken;
    } catch (error) {
      // session refresh fallback
    }
  }
  const legacy = (await sessionStore.get('firebaseIdToken')).firebaseIdToken;
  if (legacy) await credentialStore.set({ firebaseIdToken: legacy });
  const autoToken = await tryAutoSignInFromOpenTabs();
  if (autoToken) return autoToken;
  return legacy || stored.firebaseIdToken || null;
}

const SUPPORTED_POST_URL = /^https?:\/\/(?:[^/]+\.)?(?:instagram\.com|youtube\.com|youtu\.be|tiktok\.com|vimeo\.com|x\.com|twitter\.com|facebook\.com|fb\.watch|pinterest\.com|pin\.it|artstation\.com|sakugabooru\.com|sketchfab\.com|giphy\.com|tenor\.com|unsplash\.com|pexels\.com|archive\.org)\//i;
const resolveInFlight = new Map();
const resolvedPostCache = new Map();
const RESOLVE_CACHE_MS = 2 * 60 * 1000;

async function openWidgetForTab(tabId, item = null) {
  if (!tabId) return;
  const payload = { floatingPanelOpen: true };
  if (item) {
    payload.pendingPickedElement = { item, at: Date.now() };
  }
  await chrome.storage.local.set(payload);
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'AR_WIDGET_OPEN', item });
    if (item) {
      chrome.runtime.sendMessage({ type: 'AR_ELEMENT_PICKED', item }).catch(() => {});
    }
  } catch {
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ['floating-widget.js'] });
      await chrome.tabs.sendMessage(tabId, { type: 'AR_WIDGET_OPEN', item });
    } catch (error) {
      // restricted tab
    }
  }
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url || !/^https?:\/\//i.test(tab.url)) return;
  await openWidgetForTab(tab.id);
});

async function waitForTab(tabId, timeoutMs = 15000) {
  const current = await chrome.tabs.get(tabId);
  if (current.status === 'complete') return;
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error('The page took too long to load.'));
    }, timeoutMs);
    const listener = (updatedTabId, info) => {
      if (updatedTabId === tabId && info.status === 'complete') {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function resolvePostInBrowserUncached(url) {
  if (!SUPPORTED_POST_URL.test(url)) throw new Error('Unsupported public post URL.');
  const tab = await chrome.tabs.create({ url, active: false });
  try {
    await waitForTab(tab.id);

    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async () => {
        // Social players hydrate after the document load event. Give the post
        // a moment to expose its signed media URL and creator details.
        for (let attempt = 0; attempt < 12 && !document.querySelector('video') && !document.querySelector('article img, [role="main"] img, #main-view img, .pin-image, .artwork-image'); attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        const meta = (selector) => document.querySelector(selector)?.content || '';
        const canonical = document.querySelector('link[rel="canonical"]')?.href || location.href;
        const article = document.querySelector('article, main') || document.body;
        const excludedPaths = new Set(['p', 'reel', 'reels', 'explore', 'accounts', 'direct', 'stories']);
        const profileImages = [...article.querySelectorAll('img')].filter((image) => /profile picture|avatar/i.test(image.alt || '') || /avatar/i.test(image.getAttribute('data-e2e') || ''));
        const avatarImage = profileImages.find((image) => image.closest('header, article')) || profileImages[0] || null;
        const instagramProfileLink = [...article.querySelectorAll('a[href]')].find((anchor) => {
          try {
            const candidate = new URL(anchor.href, location.href);
            const segments = candidate.pathname.split('/').filter(Boolean);
            return candidate.hostname.endsWith('instagram.com') && segments.length === 1 && !excludedPaths.has(segments[0].toLowerCase()) && (anchor.contains(avatarImage) || anchor.closest('header'));
          } catch { return false; }
        });
        const authorLink = avatarImage?.closest('a[href]') || instagramProfileLink || article.querySelector('a[href*="/@"], a[data-e2e*="user"]');
        const avatarAltName = (avatarImage?.alt || '').replace(/['’]s profile picture.*$/i, '').replace(/profile picture.*$/i, '').trim();
        const descriptionMeta = meta('meta[property="og:description"]') || meta('meta[name="description"]');
        const descriptionHandle = descriptionMeta.match(/@([a-zA-Z0-9._-]+)/)?.[1] || '';
        const authorText = authorLink?.textContent?.trim().replace(/^@/, '') || avatarAltName || descriptionHandle || meta('meta[name="author"]') || meta('meta[name="twitter:creator"]').replace(/^@/, '');
        const avatar = avatarImage?.currentSrc || avatarImage?.src || '';
        const caption = article?.querySelector('[data-e2e="browse-video-desc"], h1, div[aria-label*="caption" i], span[dir="auto"]')?.textContent?.trim() || '';
        const video = [...document.querySelectorAll('video')].sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0];
        const ogTitle = meta('meta[property="og:title"]');
        const isInstagram = location.hostname.endsWith('instagram.com');

        // Instagram buries the real caption inside its og tags:
        //   og:description -> `12 likes, 3 comments - handle on Jan 1, 2026: "caption"`
        //   og:title       -> `Name on Instagram: "caption"`
        // Taken raw, those put the like count and date into the description and
        // the word "Instagram" into the title. Unwrap the quoted part so the
        // fields get the post's own words.
        const unwrapQuoted = (text) => (String(text).match(/:\s*["“](.+)["”]\s*$/s)?.[1] || '').trim();
        const instagramCaption = isInstagram
          ? unwrapQuoted(descriptionMeta) || unwrapQuoted(ogTitle) || caption
          : '';

        const description = instagramCaption || descriptionMeta || caption;

        let title;
        if (isInstagram) {
          // Instagram posts have no title of their own — the first line of the
          // caption is the closest thing to one.
          const firstLine = instagramCaption.split('\n').map((line) => line.trim()).find(Boolean) || '';
          const handle = String(authorText || descriptionHandle || '').replace(/^@/, '');
          title = firstLine
            ? (firstLine.length > 110 ? `${firstLine.slice(0, 107)}…` : firstLine)
            : (handle ? `@${handle} on Instagram` : 'Instagram Reference');
        } else {
          title = ogTitle || document.title || caption;
        }
        const imageThumb = video?.poster || meta('meta[property="og:image"]') || meta('meta[name="twitter:image"]') || document.querySelector('.pin-image img, .artwork-image img, article img')?.currentSrc || '';
        return {
          url: canonical,
          title,
          description,
          author: authorText,
          authorUrl: authorLink?.href || '',
          authorAvatar: avatar,
          thumbnailUrl: imageThumb,
          mediaUrl: video?.currentSrc || video?.src || imageThumb,
          mediaType: video ? 'video' : location.hostname.includes('giphy') || (video?.src || '').endsWith('.gif') ? 'gif' : location.hostname.includes('sketchfab') ? 'model3d' : 'image',
          provider: location.hostname.replace(/^www\./, '').split('.')[0],
          duration: video && Number.isFinite(video.duration) ? video.duration : undefined,
          tags: [...new Set([...`${caption} ${description}`.matchAll(/#([\p{L}\p{N}_-]+)/gu)].map(match => match[1].toLowerCase()))].slice(0, 12),
        };
      },
    });
    const metadata = result?.result || null;
    if (metadata && !metadata.authorAvatar && metadata.authorUrl && SUPPORTED_POST_URL.test(metadata.authorUrl)) {
      await chrome.tabs.update(tab.id, { url: metadata.authorUrl });
      await waitForTab(tab.id, 12000);
      const [profileResult] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const profileImage = [...document.querySelectorAll('img')].find((image) => /profile picture|avatar/i.test(image.alt || '') && image.naturalWidth > 20);
          if (profileImage) return profileImage.currentSrc || profileImage.src || '';
          const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')].map((script) => {
            try { return JSON.parse(script.textContent || '{}'); } catch { return null; }
          }).find((value) => value?.['@type'] === 'Person');
          const jsonImage = Array.isArray(jsonLd?.image) ? jsonLd.image[0] : jsonLd?.image?.url || jsonLd?.image;
          return jsonImage || document.querySelector('meta[property="og:image"]')?.content || '';
        },
      });
      metadata.authorAvatar = profileResult?.result || '';
    }
    return metadata;
  } finally {
    if (tab.id) await chrome.tabs.remove(tab.id).catch(() => {});
  }
}

function resolveCacheKey(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    // Tracking query parameters do not change the source post.
    [...parsed.searchParams.keys()].forEach((key) => {
      if (/^(utm_|fbclid$|igshid$)/i.test(key)) parsed.searchParams.delete(key);
    });
    return parsed.toString();
  } catch {
    return url;
  }
}

async function resolvePostInBrowser(url) {
  const key = resolveCacheKey(url);
  const cached = resolvedPostCache.get(key);
  if (cached && Date.now() - cached.createdAt < RESOLVE_CACHE_MS) return cached.data;
  if (resolveInFlight.has(key)) return resolveInFlight.get(key);

  const request = resolvePostInBrowserUncached(url)
    .then((data) => {
      resolvedPostCache.set(key, { data, createdAt: Date.now() });
      return data;
    })
    .finally(() => resolveInFlight.delete(key));

  resolveInFlight.set(key, request);
  return request;
}

async function handleConnect(message, senderOrigin) {
  if (!message || typeof message.token !== 'string') return { ok: false, error: 'Invalid token' };
  const origin = senderOrigin || message.origin || DEFAULT_ORIGIN;
  await credentialStore.set({
    firebaseIdToken: message.token,
    ...(typeof message.refreshToken === 'string' ? { firebaseRefreshToken: message.refreshToken } : {}),
    ...(typeof message.firebaseApiKey === 'string' ? { firebaseApiKey: message.firebaseApiKey } : {}),
    ...(Number.isFinite(message.tokenExpiresAt) ? { firebaseTokenExpiresAt: message.tokenExpiresAt } : {}),
    apiOrigin: origin,
  });
  await sessionStore.remove('quickBootstrap');
  await chrome.runtime.sendMessage({ type: 'AR_AUTH_CONNECTED' }).catch(() => {});
  const pending = await sessionStore.get('pendingCaptureTabId');
  if (pending.pendingCaptureTabId) {
    await openWidgetForTab(pending.pendingCaptureTabId);
    await sessionStore.remove('pendingCaptureTabId');
  }
  return { ok: true };
}

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'AR_CONNECT') {
    sendResponse({ ok: false });
    return false;
  }
  const senderOrigin = sender.url ? new URL(sender.url).origin : DEFAULT_ORIGIN;
  handleConnect(message, senderOrigin).then(async (res) => {
    if (sender.tab?.id) {
      const origin = await getOrigin();
      await chrome.tabs.update(sender.tab.id, { url: origin + "/references" }).catch(() => {});
    }
    sendResponse(res);
  });
  return true;
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'AR_CONNECT') {
    handleConnect(message, message.origin || DEFAULT_ORIGIN).then(sendResponse);
    return true;
  }
  if (message?.type === 'AR_START_CONNECT') {
    (async () => {
      if (_sender.tab?.id) await sessionStore.set({ pendingCaptureTabId: _sender.tab.id });
      let origin = null;
      try {
        const tabs = await getRelevantTabs();
        if (tabs.length > 0 && tabs[0].url) {
          origin = new URL(tabs[0].url).origin;
          await credentialStore.set({ apiOrigin: origin });
        }
      } catch {}
      if (!origin) origin = await getOrigin();
      await chrome.tabs.create({
        url: origin + "/extension/connect?extension_id=" + encodeURIComponent(chrome.runtime.id),
        active: true,
      });
      return { ok: true, origin };
    })().then(sendResponse).catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === 'AR_DISCONNECT') {
    credentialStore.remove(['firebaseIdToken', 'firebaseRefreshToken', 'firebaseApiKey', 'firebaseTokenExpiresAt', 'apiOrigin']).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message?.type === 'AR_RESOLVE_URL') {
    resolvePostInBrowser(message.url).then((data) => sendResponse({ ok: true, data })).catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === 'AR_OPEN_REFERENCES') {
    getOrigin().then((origin) => chrome.tabs.create({
      url: `${origin}/references${message.clipId ? `?capture=${encodeURIComponent(message.clipId)}` : ''}`,
      active: true,
    })).then(() => sendResponse({ ok: true })).catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type !== 'AR_API') return false;
  (async () => {
    const token = await getToken();
    const origin = await getOrigin();
    const isPublicEndpoint = message.path?.startsWith('/api/oembed');
    
    if (!token && !isPublicEndpoint) {
      return { ok: false, status: 401, error: 'Connect your Animation Reference account.' };
    }

    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(message.idempotencyKey ? { 'Idempotency-Key': message.idempotencyKey } : {}),
    };

    const isCapture = message.path === '/api/clips' && (message.method || 'GET') === 'POST';
    let captureValue = 8;
    let captureTimer = null;
    if (isCapture) {
      await sessionStore.set({ captureProgress: { value: captureValue, status: 'working', label: 'Downloading source video…', detail: 'Keep the extension open while the reference is copied.' } });
      captureTimer = setInterval(() => {
        captureValue = Math.min(92, captureValue + (captureValue < 45 ? 6 : captureValue < 75 ? 3 : 1));
        sessionStore.set({ captureProgress: {
          value: captureValue,
          status: 'working',
          label: captureValue < 45 ? 'Downloading source video…' : captureValue < 75 ? 'Uploading to Animation Reference…' : 'Processing playback…',
          detail: captureValue < 75 ? 'Keep the extension open while the reference is copied.' : 'Almost done — making the video playable.',
        } });
      }, 700);
    }
    try {
      let { response } = await fetchWithOriginFallback(message.path, {
        method: message.method || 'GET',
        headers,
        body: message.body ? JSON.stringify(message.body) : undefined,
      });
      let data = await response.json().catch(() => ({}));
      if (response.status === 401 && !isPublicEndpoint) {
        const refreshed = await getToken(true);
        if (refreshed && refreshed !== token) {
          headers['Authorization'] = 'Bearer ' + refreshed;
          const retryRes = await fetchWithOriginFallback(message.path, {
            method: message.method || 'GET',
            headers,
            body: message.body ? JSON.stringify(message.body) : undefined,
          });
          response = retryRes.response;
          data = await response.json().catch(() => ({}));
        }
      }
      if (response.ok && message.path === '/api/extension/boards' && message.method === 'POST') {
        await sessionStore.remove('quickBootstrap').catch(() => {});
      }
      if (isCapture) await sessionStore.set({ captureProgress: response.ok
        ? { value: 100, status: 'complete', label: 'Sent to Animation Reference', detail: 'Upload continues on the Reference Clips page.' }
        : { value: 100, status: 'error', label: 'Upload failed', detail: data.message || data.error || 'The reference could not be copied.' }
      });
      return { ok: response.ok, status: response.status, data, error: data.message || data.error };
    } catch (error) {
      if (isCapture) await sessionStore.set({ captureProgress: { value: 100, status: 'error', label: 'Upload failed', detail: error.message || 'The upload connection was interrupted.' } });
      throw error;
    } finally {
      if (captureTimer) clearInterval(captureTimer);
    }
  })().then(sendResponse).catch((error) => sendResponse({ ok: false, status: 0, error: error.message }));
  return true;
});

// ---------------------------------------------------------------------------
// Hover Save and right-click "Save to Animation Reference" (save-button.js).
// The page script never sees credentials: it asks this worker for the user's
// boards and hands it the save, which runs here with the stored token.
// ---------------------------------------------------------------------------

const RULES = globalThis.AR_SAVE_RULES;
const SAVE_MENU_ID = 'animref-save';
const BOOTSTRAP_CACHE_MS = 60_000;

function createSaveMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: SAVE_MENU_ID,
      title: 'Save to Animation Reference',
      contexts: ['image', 'video', 'link'],
    });
  });
}
async function refreshOpenTabWidgets() {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (!tab?.id || !tab?.url || !/^https?:\/\//i.test(tab.url)) continue;
      chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['floating-widget.js'] }).catch(() => {});
    }
  } catch {}
}

chrome.runtime.onInstalled.addListener(() => {
  createSaveMenu();
  refreshOpenTabWidgets();
});
chrome.runtime.onStartup.addListener(() => {
  createSaveMenu();
  refreshOpenTabWidgets();
});
refreshOpenTabWidgets();

async function sendToSaveButton(tabId, message) {
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch {
    // Pages opened before the extension was installed have no content script yet.
    await chrome.scripting.executeScript({ target: { tabId }, files: ['save-rules.js', 'save-button.js'] });
    await chrome.tabs.sendMessage(tabId, message);
  }
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== SAVE_MENU_ID || !tab?.id || !/^https?:\/\//i.test(tab.url || '')) return;
  const mediaType = info.mediaType === 'image' || info.mediaType === 'video' ? info.mediaType : null;
  sendToSaveButton(tab.id, {
    type: 'AR_SAVE_TARGET',
    mediaType,
    srcUrl: info.srcUrl || '',
    linkUrl: mediaType ? '' : info.linkUrl || '',
    pageUrl: info.pageUrl || tab.url,
  }).catch(() => {});
});

async function quickBootstrap() {
  let token = await getToken();
  if (!token) return { ok: false, status: 401, error: 'Connect your Animation Reference account.' };
  const origin = await getOrigin();
  const cached = (await sessionStore.get('quickBootstrap')).quickBootstrap;
  if (cached && cached.origin === origin && Date.now() - cached.at < BOOTSTRAP_CACHE_MS) return { ok: true, status: 200, data: cached.data };
  let { response, origin: activeOrigin } = await fetchWithOriginFallback('/api/extension/bootstrap', { headers: { Authorization: `Bearer ${token}` } });
  let data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    const refreshed = await getToken(true);
    if (refreshed && refreshed !== token) {
      token = refreshed;
      const retryRes = await fetchWithOriginFallback('/api/extension/bootstrap', { headers: { Authorization: `Bearer ${token}` } });
      response = retryRes.response;
      activeOrigin = retryRes.origin;
      data = await response.json().catch(() => ({}));
    }
  }
  if (!response.ok) return { ok: false, status: response.status, error: data.message || 'Your boards could not be loaded.' };
  await sessionStore.set({ quickBootstrap: { at: Date.now(), origin: activeOrigin, data } });
  return { ok: true, status: 200, data };
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function validSavePayload(payload) {
  if (!payload || typeof payload !== 'object') return 'Nothing to save.';
  if (payload.kind !== 'image' && payload.kind !== 'video') return 'Only images and videos can be saved.';
  if (typeof payload.boardId !== 'string' || !/^[A-Za-z0-9_-]{0,128}$/.test(payload.boardId)) return 'Choose a board.';
  if (!isHttpUrl(payload.sourceUrl)) return 'This page can’t be credited as a source.';
  if (payload.mode === 'file' && payload.mediaUrl && !isHttpUrl(payload.mediaUrl)) return 'This file can’t be downloaded.';
  return null;
}

/** Download the media in the user's browser, with the same type and size limits as the upload API. */
async function fetchMedia(mediaUrl, kind) {
  let response = await fetch(mediaUrl, { credentials: 'omit', redirect: 'follow' });
  // Some hosts only serve media to signed-in visitors; retry with the user's own cookies.
  if (response.status === 401 || response.status === 403) response = await fetch(mediaUrl, { credentials: 'include', redirect: 'follow' });
  if (!response.ok) throw new Error(`The site refused the download (${response.status}).`);

  const type = RULES.resolveMediaType(response.headers.get('content-type'), response.url || mediaUrl);
  const accepted = type && RULES.ACCEPTED_TYPES[type];
  if (!accepted) throw new Error('This file type can’t be saved yet. Images: JPG, PNG, WebP, GIF. Videos: MP4, WebM, MOV.');
  const limit = RULES.MAX_BYTES[accepted.kind];
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > limit) throw new Error(accepted.kind === 'video' ? 'Videos can be up to 250 MB.' : 'Images can be up to 25 MB.');

  const reader = response.body?.getReader();
  if (!reader) return { blob: await response.blob(), type, ext: accepted.ext, kind: accepted.kind };
  const chunks = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > limit) {
      await reader.cancel();
      throw new Error(accepted.kind === 'video' ? 'Videos can be up to 250 MB.' : 'Images can be up to 25 MB.');
    }
    chunks.push(value);
  }
  return { blob: new Blob(chunks, { type }), type, ext: accepted.ext, kind: accepted.kind || kind };
}

async function quickSave(payload) {
  const problem = validSavePayload(payload);
  if (problem) return { ok: false, status: 422, error: problem };
  const token = await getToken();
  if (!token) return { ok: false, status: 401, error: 'Connect your Animation Reference account.' };
  const origin = await getOrigin();
  const title = String(payload.title || 'Saved reference').replace(/\s+/g, ' ').trim().slice(0, 120);

  const defaultEnd = Number.isFinite(payload.duration) && payload.duration > 0 ? payload.duration : 60;
  const startTime = Number.isFinite(payload.startTime) && payload.startTime >= 0 ? payload.startTime : 0;
  const endTime = Number.isFinite(payload.endTime) && payload.endTime > startTime ? payload.endTime : defaultEnd;
  const isDataThumb = typeof payload.thumbnailUrl === 'string' && payload.thumbnailUrl.startsWith('data:image/');
  const thumbUrl = (isHttpUrl(payload.thumbnailUrl) || isDataThumb)
    ? payload.thumbnailUrl
    : (payload.kind === 'image' && isHttpUrl(payload.mediaUrl) ? payload.mediaUrl : undefined);
  const { response } = await fetchWithOriginFallback('/api/clips', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify({
      sourceUrl: payload.sourceUrl,
      startTime,
      endTime,
      title,
      category: 'Acting',
      tags: ['saved from web'],
      boardId: payload.boardId || undefined,
      isPrivate: Boolean(payload.isPrivate),
      thumbnailUrl: thumbUrl,
      mediaUrl: isHttpUrl(payload.mediaUrl) ? payload.mediaUrl : undefined,
      mediaType: payload.kind === 'image' ? 'image' : (payload.kind === 'gif' ? 'gif' : 'video'),
      sourceAuthorName: payload.authorName || undefined,
      sourceAuthorUrl: payload.authorUrl || undefined,
      sourceAuthorAvatar: payload.authorAvatar || undefined,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    return { ok: false, status: 401, error: 'Your session expired. Please sign in again.' };
  }
  if (!response.ok) return { ok: false, status: response.status, error: data.message || data.error || 'The save didn’t go through.' };
  return { ok: true, status: response.status, data };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const respond = (work) => {
    work.then(sendResponse).catch((error) => sendResponse({ ok: false, status: 0, error: error?.message || 'Something went wrong.' }));
    return true;
  };
  switch (message?.type) {
    case 'AR_QUICK_BOOTSTRAP':
      return respond(quickBootstrap());
    case 'AR_QUICK_SAVE':
      return respond(quickSave(message.payload));
    case 'AR_OPEN_CLIP': {
      const clipId = String(message.clipId || '');
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(clipId)) return false;
      return respond(getOrigin().then((origin) => chrome.tabs.create({ url: `${origin}/clip/${clipId}`, active: true })).then(() => ({ ok: true })));
    }
    case 'AR_OPEN_BOARD': {
      const boardId = String(message.boardId || '');
      const path = boardId && /^[A-Za-z0-9_-]{1,128}$/.test(boardId) ? `/moodboard?board=${encodeURIComponent(boardId)}` : '/moodboard';
      return respond(getOrigin().then((origin) => chrome.tabs.create({ url: `${origin}${path}`, active: true })).then(() => ({ ok: true })));
    }
    case 'AR_OPEN_WIDGET':
      return respond(openWidgetForTab(sender.tab?.id, message.item || null).then(() => ({ ok: true })));
    default:
      return false;
  }
});