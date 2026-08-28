const $ = (id) => document.getElementById(id);
const state = { context: null, bootstrap: null, fetchTimer: null, fetchRequestId: 0, currentUrl: '' };

if (new URLSearchParams(window.location.search).has('embedded')) {
  document.body.classList.add('embedded');
}

function showProgress(value, label, detail, status = '') {
  const panel = $('uploadProgress');
  panel.hidden = false;
  panel.className = `upload-progress ${status}`.trim();
  $('progressLabel').textContent = label;
  $('progressPercent').textContent = `${value}%`;
  $('progressBar').style.width = `${value}%`;
  $('progressDetail').textContent = detail;
  panel.querySelector('[role="progressbar"]').setAttribute('aria-valuenow', String(value));
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function api(path, options = {}) {
  return chrome.runtime.sendMessage({ type: 'AR_API', path, ...options });
}

async function updateFloatingWidgetProfile(user) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  await chrome.tabs.sendMessage(tab.id, {
    type: 'AR_PROFILE_UPDATED',
    avatarUrl: user?.avatarUrl || '',
    displayName: user?.displayName || '',
  });
}

function updateUIWithMeta(meta, overwrite = true) {
  if (!meta) return;
  state.context = { ...(state.context || {}), ...meta };

  if (meta.url) {
    $('sourceUrlInput').value = meta.url;
    try {
      $('sourceHost').textContent = new URL(meta.url).hostname.replace('www.', '');
    } catch {
      // Ignore
    }
  }

  // Clean title: ignore generic "Instagram", "YouTube", "TikTok", or "Facebook" titles
  const isGenericTitle = (t) => !t || ['instagram', 'youtube', 'tiktok', 'facebook', 'video reference'].includes(String(t).trim().toLowerCase());

  if (meta.title && !isGenericTitle(meta.title)) {
    const cleanTitle = String(meta.title).trim().slice(0, 120);
    $('title').value = cleanTitle;
    $('sourceTitle').textContent = cleanTitle;
  } else if (meta.title && isGenericTitle($('title').value)) {
    $('title').value = 'Video Reference';
    $('sourceTitle').textContent = 'Video Reference';
  }

  if (meta.description && !isGenericTitle(meta.description)) {
    $('descriptionInput').value = String(meta.description).trim();
  } else if (meta.description && isGenericTitle($('descriptionInput').value)) {
    $('descriptionInput').value = '';
  }

  const authorName = meta.authorName || meta.author;
  if (authorName && !isGenericTitle(authorName)) {
    $('creatorLabel').textContent = `@${authorName} (${meta.providerName || meta.provider || 'Web'})`;
    $('creatorLabel').hidden = false;
  }

  if (meta.authorAvatar) {
    $('creatorAvatar').src = meta.authorAvatar;
    $('creatorAvatar').hidden = false;
  }

  if (meta.tags && meta.tags.length > 0 && !meta.tags.includes('instagram, reference')) {
    $('tags').value = Array.isArray(meta.tags) ? meta.tags.join(', ') : meta.tags;
  } else if (authorName && !isGenericTitle(authorName) && (overwrite || !$('tags').value)) {
    $('tags').value = `${authorName.toLowerCase().replace(/\s+/g, '_')}, ${meta.providerName?.toLowerCase() || meta.provider?.toLowerCase() || ''}`;
  }

  if (meta.thumbnailUrl) {
    $('metaThumbnail').src = meta.thumbnailUrl;
    $('metaThumbnail').hidden = false;
  }

  if (Number.isFinite(meta.duration) && meta.duration > 0) state.context.duration = meta.duration;
}

async function fetchMetadataForUrl(url, force = true) {
  if (!url || !url.startsWith('http')) {
    $('message').textContent = 'Please paste a valid video URL.';
    return;
  }

  const requestId = ++state.fetchRequestId;
  state.currentUrl = url;

  $('fetchMetaBtn').disabled = true;
  $('fetchMetaBtn').textContent = '⏳ Fetching…';
  $('message').textContent = '';

  try {
    // Social URLs use the same server-side metadata path as every other link.
    // This avoids opening a temporary tab or requiring the user to visit it.
    const isInstagramOrFb = false;
    
    let response;
    if (isInstagramOrFb) {
      $('message').textContent = 'Loading background tab to bypass login walls…';
      response = await chrome.runtime.sendMessage({ type: 'AR_RESOLVE_URL', url });
      // The background worker returns { title, description, author, authorAvatar, thumbnailUrl, tags }
      // Map it to match the expected oEmbed format
      if (response?.ok && response.data) {
        response.data = {
          ...response.data,
          authorName: response.data.author || response.data.authorName,
          providerName: response.data.provider || response.data.providerName,
        };
      }
    } else {
      response = await api(`/api/oembed?url=${encodeURIComponent(url)}`);
    }

    if (requestId !== state.fetchRequestId) return;

    if (response?.ok && response?.data) {
      const meta = response.data;
      updateUIWithMeta(meta, true);
      $('message').className = 'success';
      $('message').textContent = 'Post captured. Add a category or tags, then save.';
    } else {
      $('message').textContent = response?.error || 'Could not fetch details. You can fill title & save.';
    }
  } catch (err) {
    if (requestId !== state.fetchRequestId) return;
    $('message').textContent = 'Network timeout fetching post details.';
  } finally {
    if (requestId === state.fetchRequestId) {
      $('fetchMetaBtn').disabled = false;
      $('fetchMetaBtn').textContent = '✨ Fetch Info';
    }
  }
}

async function extractMetaFromActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab?.url) return null;

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: () => {
        const videos = [...document.querySelectorAll('video')].filter((item) => {
          const rect = item.getBoundingClientRect();
          return rect.width > 60 && rect.height > 40 && rect.bottom > 0 && rect.top < window.innerHeight;
        });

        // Find playing or center video
        const viewportCenter = window.innerHeight / 2;
        const video = videos.find((v) => !v.paused && v.currentTime > 0) || videos.sort((a, b) => {
          const distA = Math.abs(a.getBoundingClientRect().top + a.getBoundingClientRect().height / 2 - viewportCenter);
          const distB = Math.abs(b.getBoundingClientRect().top + b.getBoundingClientRect().height / 2 - viewportCenter);
          return distA - distB;
        })[0];

        let postUrl = location.href;
        let title = '';
        let description = '';
        let author = '';
        let authorAvatar = '';

        if (video) {
          const container = video.closest('article, section, div[role="dialog"], main, div[data-pagelet]');
          const postAnchor = container?.querySelector(
            'a[href*="/p/"], a[href*="/reel/"], a[href*="/reels/"], a[href*="/watch"], a[href*="/shorts/"], a[href*="/video/"]'
          );
          if (postAnchor?.href) postUrl = postAnchor.href;

          const textEl = container?.querySelector('h1, h2, span._aacl, div._aacl, div[data-e2e="browse-video-desc"], div[aria-label*="caption"]');
          if (textEl?.textContent?.trim()) {
            title = textEl.textContent.trim();
          }

          const authorEl = container?.querySelector('a[href*="/@"], a.x1i10hfl, a[data-e2e="browse-username"], a[href*="facebook.com/"]');
          if (authorEl?.textContent?.trim()) {
            author = authorEl.textContent.trim().replace(/^@/, '');
          }

          const avatarEl = container?.querySelector('img[src*="profile"], img.x6ummos, img[alt*="profile"], img[data-e2e="user-avatar"]');
          if (avatarEl?.src) {
            authorAvatar = avatarEl.src;
          }
        }

        const ogTitle = document.querySelector('meta[property="og:title"]')?.content || document.title;
        const ogDesc = document.querySelector('meta[property="og:description"]')?.content || document.querySelector('meta[name="description"]')?.content || '';
        const ogImage = video?.poster || document.querySelector('meta[property="og:image"]')?.content || '';

        const hashtagMatches = (title + ' ' + ogDesc).match(/#([\w\u0590-\u05ff]+)/g) || [];
        const tags = hashtagMatches.map((t) => t.replace('#', '').toLowerCase()).slice(0, 10);

        const host = location.hostname.replace('www.', '');

        return {
          url: postUrl,
          title: title || ogTitle,
          description: ogDesc || title,
          authorName: author,
          authorAvatar: authorAvatar,
          thumbnailUrl: ogImage,
          mediaUrl: video?.currentSrc || video?.src || '',
          providerName: host.split('.')[0],
          tags: tags,
        };
      },
    });

    return results.map((item) => item.result).find((item) => item !== null && item.url) || null;
  } catch {
    return null;
  }
}

async function init() {
  const response = await api('/api/extension/bootstrap');
  if (!response?.ok) {
    $('connect').hidden = false;
    $('clipForm').hidden = true;
    return;
  }

  state.bootstrap = response.data;
  $('connect').hidden = true;
  $('clipForm').hidden = false;
  $('statusDot').classList.add('on');
  updateFloatingWidgetProfile(response.data.user).catch(() => {
    // The standalone popup has no floating widget to update.
  });

  $('board').replaceChildren();
  response.data.boards.forEach((item) => $('board').add(new Option(`${item.isPrivate ? '🔒 ' : ''}${item.title}`, item.id)));
  $('isPrivate').disabled = true;

  // Step 1: Instant DOM extraction from active tab
  const tabMeta = await extractMetaFromActiveTab();
  if (tabMeta) {
    updateUIWithMeta(tabMeta, false);
  }

  // Step 2: Enrich with server oEmbed metadata
  const currentUrl = $('sourceUrlInput').value.trim();
  if (currentUrl.startsWith('http')) {
    fetchMetadataForUrl(currentUrl, true);
  }
}

$('fetchMetaBtn').addEventListener('click', () => {
  const url = $('sourceUrlInput').value.trim();
  fetchMetadataForUrl(url, true);
});

$('sourceUrlInput').addEventListener('input', (e) => {
  const url = e.target.value.trim();
  clearTimeout(state.fetchTimer);
  if (url.startsWith('http')) {
    state.fetchTimer = setTimeout(() => fetchMetadataForUrl(url, true), 400);
  }
});

$('sourceUrlInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const url = $('sourceUrlInput').value.trim();
    fetchMetadataForUrl(url, true);
  }
});

$('connectButton').addEventListener('click', async () => {
  const response = await chrome.runtime.sendMessage({ type: 'AR_START_CONNECT' });
  if (!response?.ok) $('message').textContent = response?.error || 'Could not open sign in.';
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'AR_AUTH_CONNECTED') init();
});

window.addEventListener('focus', () => {
  if (!state.bootstrap) init();
});

$('board').addEventListener('change', (event) => {
  const board = state.bootstrap?.boards.find((item) => item.id === event.target.value);
  if (board) $('isPrivate').checked = Boolean(board.isPrivate);
});

$('clipForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  $('message').className = '';

  const sourceUrl = $('sourceUrlInput').value.trim();
  if (!sourceUrl || !sourceUrl.startsWith('http')) {
    return ($('message').textContent = 'Please enter a valid HTTP video URL.');
  }

  $('saveButton').disabled = true;
  $('saveButton').textContent = 'Sending…';
  showProgress(30, 'Sending to Animation Reference…', 'Creating the reference card.');

  let response;
  try {
    response = await api('/api/clips', {
      method: 'POST',
      idempotencyKey: crypto.randomUUID(),
      body: {
        sourceUrl,
        thumbnailUrl: state.context?.thumbnailUrl || undefined,
        sourceDescription: $('descriptionInput').value || state.context?.description || undefined,
        sourceAuthorName: state.context?.authorName || state.context?.author || undefined,
        sourceAuthorUrl: state.context?.authorUrl || undefined,
        sourceAuthorAvatar: state.context?.authorAvatar || undefined,
        mediaUrl: state.context?.mediaUrl || undefined,
        startTime: 0,
        endTime: state.context?.duration || 60,
        title: $('title').value || 'Video Reference',
        category: 'Acting',
        tags: $('tags').value.split(',').map((tag) => tag.trim()).filter(Boolean),
        boardId: $('board').value || undefined,
        isPrivate: $('isPrivate').checked,
      },
    });
  } catch (error) {
    response = { ok: false, error: error?.message || 'Could not reach Animation Reference.' };
  }

  $('saveButton').disabled = false;
  $('saveButton').textContent = '⚡ Save to Animation Reference';

  if (!response?.ok) {
    showProgress(100, 'Could not send reference', response?.error || 'Try again.', 'error');
    return ($('message').textContent = response?.error || 'Could not save clip.');
  }

  showProgress(100, 'Sent to Animation Reference', 'The video will continue uploading on the Reference Clips page.', 'complete');
  $('message').className = 'success';
  $('message').textContent = 'Sent! You can close this popup.';
  chrome.runtime.sendMessage({ type: 'AR_OPEN_REFERENCES', clipId: response.data?.id }).catch(() => {});
});

init();
