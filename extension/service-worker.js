const DEFAULT_ORIGIN = 'https://animationreference.org';
const sessionStore = chrome.storage.session || chrome.storage.local;
const credentialStore = chrome.storage.local;

chrome.runtime.onInstalled.addListener(() => {
  // The downloadable extension is intended for the live product. Its connect
  // flow may still explicitly set a different trusted origin during development.
  credentialStore.set({ apiOrigin: DEFAULT_ORIGIN });
});

async function getOrigin() {
  const data = await credentialStore.get('apiOrigin');
  if (data.apiOrigin) return data.apiOrigin;
  // Migrate development users of the earlier session-only extension build.
  const legacy = await sessionStore.get('apiOrigin');
  if (legacy.apiOrigin) {
    await credentialStore.set({ apiOrigin: legacy.apiOrigin });
    return legacy.apiOrigin;
  }
  return data.apiOrigin || DEFAULT_ORIGIN;
}

async function getToken() {
  const stored = await credentialStore.get(['firebaseIdToken', 'firebaseRefreshToken', 'firebaseApiKey', 'firebaseTokenExpiresAt']);
  const hasValidToken = stored.firebaseIdToken && (!stored.firebaseTokenExpiresAt || stored.firebaseTokenExpiresAt > Date.now() + 60_000);
  if (hasValidToken) return stored.firebaseIdToken;
  if (stored.firebaseRefreshToken && stored.firebaseApiKey) {
    try {
      const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(stored.firebaseApiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: stored.firebaseRefreshToken }),
      });
      const refreshed = await response.json();
      if (!response.ok || !refreshed.id_token) throw new Error(refreshed.error?.message || 'Firebase session refresh failed.');
      const next = {
        firebaseIdToken: refreshed.id_token,
        firebaseRefreshToken: refreshed.refresh_token || stored.firebaseRefreshToken,
        firebaseTokenExpiresAt: Date.now() + Number(refreshed.expires_in || 3600) * 1000,
      };
      await credentialStore.set(next);
      return next.firebaseIdToken;
    } catch (error) {
      console.warn('Animation Reference session refresh failed.', error);
    }
  }
  // Preserve existing sign-ins made before credentials became persistent.
  const legacy = (await sessionStore.get('firebaseIdToken')).firebaseIdToken;
  if (legacy) await credentialStore.set({ firebaseIdToken: legacy });
  return legacy || null;
}

const SUPPORTED_POST_URL = /^https?:\/\/(?:[^/]+\.)?(?:instagram\.com|youtube\.com|youtu\.be|tiktok\.com|vimeo\.com|x\.com|twitter\.com|facebook\.com|fb\.watch)\//i;
const resolveInFlight = new Map();
const resolvedPostCache = new Map();
const RESOLVE_CACHE_MS = 2 * 60 * 1000;

async function openWidgetForTab(tabId) {
  if (!tabId) return;
  await chrome.storage.local.set({ floatingPanelOpen: true });
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'AR_WIDGET_OPEN' });
  } catch {
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ['floating-widget.js'] });
      await chrome.tabs.sendMessage(tabId, { type: 'AR_WIDGET_OPEN' });
    } catch (error) {
      console.warn('Animation Reference could not open the capture bubble on this page.', error);
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
        for (let attempt = 0; attempt < 12 && !document.querySelector('video'); attempt += 1) {
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
        return {
          url: canonical,
          title,
          description,
          author: authorText,
          authorUrl: authorLink?.href || '',
          authorAvatar: avatar,
          thumbnailUrl: video?.poster || meta('meta[property="og:image"]') || meta('meta[name="twitter:image"]'),
          mediaUrl: video?.currentSrc || video?.src || '',
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

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'AR_CONNECT' || typeof message.token !== 'string') {
    sendResponse({ ok: false });
    return false;
  }

  const senderOrigin = sender.url ? new URL(sender.url).origin : DEFAULT_ORIGIN;
  credentialStore.set({
    firebaseIdToken: message.token,
    ...(typeof message.refreshToken === 'string' ? { firebaseRefreshToken: message.refreshToken } : {}),
    ...(typeof message.firebaseApiKey === 'string' ? { firebaseApiKey: message.firebaseApiKey } : {}),
    ...(Number.isFinite(message.tokenExpiresAt) ? { firebaseTokenExpiresAt: message.tokenExpiresAt } : {}),
    apiOrigin: senderOrigin,
  }).then(async () => {
    await chrome.runtime.sendMessage({ type: 'AR_AUTH_CONNECTED' }).catch(() => {});
    const pending = await sessionStore.get('pendingCaptureTabId');
    if (pending.pendingCaptureTabId) {
      await openWidgetForTab(pending.pendingCaptureTabId);
      await sessionStore.remove('pendingCaptureTabId');
    }
    // Keep the Animation Reference sign-in tab open and take the user into the
    // Reference Clips workflow instead of closing it immediately after sign-in.
    if (sender.tab?.id) {
      const origin = await getOrigin();
      await chrome.tabs.update(sender.tab.id, { url: `${origin}/references` }).catch(() => {});
    }
    sendResponse({ ok: true });
  });
  return true;
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'AR_START_CONNECT') {
    (async () => {
      if (_sender.tab?.id) await sessionStore.set({ pendingCaptureTabId: _sender.tab.id });
      const origin = await getOrigin();
      await chrome.tabs.create({
        url: `${origin}/extension/connect?extension_id=${encodeURIComponent(chrome.runtime.id)}`,
        active: true,
      });
      return { ok: true };
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
      const response = await fetch(`${origin}${message.path}`, {
        method: message.method || 'GET',
        headers,
        body: message.body ? JSON.stringify(message.body) : undefined,
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401 && !isPublicEndpoint) {
        await credentialStore.remove(['firebaseIdToken', 'firebaseRefreshToken', 'firebaseApiKey', 'firebaseTokenExpiresAt']);
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
