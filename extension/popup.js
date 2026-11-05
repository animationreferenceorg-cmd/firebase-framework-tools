window.addEventListener('error', (e) => e.preventDefault());
window.addEventListener('unhandledrejection', (e) => e.preventDefault());

const $ = (id) => document.getElementById(id);

const state = {
  bootstrap: null,
  context: null,
  pageMedia: [],
  selectedMedia: new Map(),
  currentView: 'grid', // 'grid' | 'boards' | 'boardContents'
  boards: [],
  allSavedItems: [],
  activeInspectBoard: null,
  savingBoardId: null,
  savedBoardId: null,
  cropStartTime: 0,
  cropEndTime: 10,
  videoDuration: 10,
  isCropping: false,
  captureMode: 'video', // 'video' | 'frame'
  isInitializing: false,
};

// Check embedded mode
if (new URLSearchParams(window.location.search).has('embedded')) {
  document.body.classList.add('embedded');
}

async function api(path, options = {}) {
  try {
    const res = await Promise.race([
      chrome.runtime.sendMessage({ type: 'AR_API', path, ...options }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out. Please try again.')), 15000))
    ]);
    return res || { ok: false, error: 'No response from background worker.' };
  } catch (err) {
    return { ok: false, error: err?.message || 'Connection failed' };
  }
}

async function getActiveTabUrl() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url && /^https?:\/\//i.test(tab.url)) return tab.url;
  } catch {}
  return 'https://animationreference.org';
}

async function openBoardOnWebsite(boardId = '') {
  const origin = await getActiveAppOrigin();
  const targetUrl = boardId
    ? `${origin}/moodboard?board=${encodeURIComponent(boardId)}`
    : `${origin}/moodboard`;
  chrome.tabs.create({ url: targetUrl });
}

let feedbackTimer = null;
function showFeedback(text, mode = 'saving') {
  if (!text) {
    hideFeedback();
    return;
  }
  if (feedbackTimer) {
    clearTimeout(feedbackTimer);
    feedbackTimer = null;
  }
  const fb = $('saveFeedback');
  const spinner = $('feedbackSpinner');
  const txt = $('feedbackText');
  if (!fb) return;
  fb.hidden = false;
  fb.style.display = 'flex';
  fb.classList.add('is-visible');
  txt.textContent = text;

  if (mode === 'saving') {
    spinner.hidden = false;
    fb.style.backgroundColor = 'rgba(18, 14, 28, 0.95)';
    fb.style.borderColor = 'rgba(124, 58, 237, 0.4)';
  } else if (mode === 'success') {
    spinner.hidden = true;
    fb.style.backgroundColor = 'rgba(16, 185, 129, 0.95)';
    fb.style.borderColor = 'rgba(16, 185, 129, 0.5)';
    feedbackTimer = setTimeout(() => hideFeedback(), 2500);
  } else if (mode === 'error' || mode === true) {
    spinner.hidden = true;
    fb.style.backgroundColor = 'rgba(220, 38, 38, 0.95)';
    fb.style.borderColor = 'rgba(220, 38, 38, 0.5)';
    feedbackTimer = setTimeout(() => hideFeedback(), 3500);
  }
}

function hideFeedback() {
  if (feedbackTimer) {
    clearTimeout(feedbackTimer);
    feedbackTimer = null;
  }
  const fb = $('saveFeedback');
  const txt = $('feedbackText');
  if (txt) txt.textContent = '';
  if (fb) {
    fb.hidden = true;
    fb.style.display = 'none';
    fb.classList.remove('is-visible');
  }
}

// Format seconds into 00:00.0
function formatTime(sec) {
  const s = Math.max(0, sec || 0);
  const m = Math.floor(s / 60);
  const remainder = (s % 60).toFixed(1);
  return `${m}:${remainder.padStart(4, '0')}`;
}

// 2x2 Collage HTML Builder (Pinterest Style)
function buildCollageHtml(thumbnails = []) {
  const thumbs = Array.isArray(thumbnails) ? thumbnails.filter(Boolean).slice(0, 4) : [];
  if (thumbs.length === 0) {
    return `
      <div class="board-collage-thumb">
        <div class="board-collage-tile"></div>
        <div class="board-collage-tile"></div>
        <div class="board-collage-tile"></div>
        <div class="board-collage-tile"></div>
      </div>
    `;
  }
  if (thumbs.length === 1) {
    return `
      <div class="board-collage-thumb single-thumb">
        <img src="${thumbs[0]}" alt="" loading="lazy" />
      </div>
    `;
  }
  // Up to 4 tiles
  const tilesHtml = Array.from({ length: 4 }).map((_, i) => {
    if (thumbs[i]) {
      return `<img src="${thumbs[i]}" alt="" loading="lazy" />`;
    }
    return `<div class="board-collage-tile"></div>`;
  }).join('');

  return `<div class="board-collage-thumb">${tilesHtml}</div>`;
}

// Render Board Rows
function renderBoardRow(board) {
  const savingId = board.id || '__all__';
  const isSaving = state.savingBoardId === savingId;
  const isSaved = state.savedBoardId === savingId;
  const itemCount = board.isAllBoards
    ? (state.allSavedItems?.length || 0)
    : (board.itemCount ?? board.items?.length ?? board.thumbnails?.length ?? 0);

  const row = document.createElement('div');
  row.className = `board-row ${isSaving ? 'saving' : ''} ${isSaved ? 'saved' : ''}`;
  row.tabIndex = 0;
  row.setAttribute('role', 'button');
  row.setAttribute('aria-label', `View or save to ${board.title}`);

  const collageContent = board.isAllBoards
    ? `<div class="board-collage-thumb single-thumb" style="display:flex;align-items:center;justify-content:center;background:rgba(124,58,237,0.18);font-size:20px;">📁</div>`
    : buildCollageHtml(board.thumbnails);

  row.innerHTML = `
    <div class="board-meta-col" title="Click to see what's inside ${escapeHtml(board.title)}">
      ${collageContent}
      <div class="board-title-wrap">
        <div class="board-title">
          ${board.isPrivate ? '<span class="board-secret-icon" title="Secret board">🔒</span>' : ''}
          ${escapeHtml(board.title)}
        </div>
        <div class="board-subtitle">
          <span>${itemCount} ${itemCount === 1 ? 'reference' : 'references'}</span>
          <span>·</span>
          <span>Click to view</span>
        </div>
      </div>
    </div>
    <div class="board-actions-col">
      <button class="board-open-site-btn" type="button" title="Open board on website">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="ext-link-svg">
          <path d="M7 17L17 7M7 7h10v10" />
        </svg>
      </button>
      <button class="board-save-btn" type="button" ${isSaving ? 'disabled' : ''}>
        ${isSaving ? 'Saving…' : isSaved ? 'Saved ✓' : 'Save'}
      </button>
    </div>
  `;

  // Click board meta (left side) to inspect board contents inside popup
  const metaCol = row.querySelector('.board-meta-col');
  metaCol.addEventListener('click', (e) => {
    e.stopPropagation();
    openBoardContentsView(board);
  });

  // Click ↗ button to open board on website
  const openSiteBtn = row.querySelector('.board-open-site-btn');
  openSiteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openBoardOnWebsite(board.id || '');
  });

  // Click Save button to save reference(s) to this board
  const saveBtn = row.querySelector('.board-save-btn');
  saveBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    saveToBoard(board);
  });

  row.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      saveToBoard(board);
    }
  });

  // Drag-and-drop: drop pin directly into this moodboard
  row.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    row.classList.add('drag-over');
    const saveBtn = row.querySelector('.board-save-btn');
    if (saveBtn && !state.savingBoardId) saveBtn.textContent = 'Drop to Save';
  });

  row.addEventListener('dragleave', () => {
    row.classList.remove('drag-over');
    const saveBtn = row.querySelector('.board-save-btn');
    if (saveBtn && !state.savingBoardId) saveBtn.textContent = isSaved ? 'Saved' : 'Save';
  });

  row.addEventListener('drop', (e) => {
    e.preventDefault();
    row.classList.remove('drag-over');

    try {
      const dataStr = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text/uri-list');
      if (dataStr && (dataStr.startsWith('http://') || dataStr.startsWith('https://'))) {
        state.context = state.context || {};
        state.context.mediaUrl = dataStr;
        state.context.thumbnailUrl = dataStr;
      }
    } catch { }

    saveToBoard(board);
  });

  return row;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Filter and render boards
function renderBoards(filterText = '') {
  const query = filterText.toLowerCase().trim();
  const all = state.boards || [];

  const allBoardsItem = {
    id: '',
    title: 'All Boards (Main collection)',
    isPrivate: false,
    isAllBoards: true,
    thumbnails: (state.allSavedItems || []).map((i) => i.thumbnailUrl).filter(Boolean).slice(0, 4).concat(all.flatMap((b) => b.thumbnails || [])).slice(0, 4),
    items: state.allSavedItems || [],
    itemCount: (state.allSavedItems || []).length,
  };

  const listToFilter = [allBoardsItem, ...all];
  const filtered = query
    ? listToFilter.filter((b) => (b.title || '').toLowerCase().includes(query))
    : listToFilter;

  const topChoices = query ? [] : filtered.slice(0, 3);
  const remaining = query ? filtered : filtered.slice(3);

  // Render Top Choices
  const topList = $('topChoicesList');
  topList.replaceChildren();
  if (topChoices.length > 0) {
    $('topChoicesSection').hidden = false;
    topChoices.forEach((board) => topList.appendChild(renderBoardRow(board)));
  } else {
    $('topChoicesSection').hidden = true;
  }

  // Render All Boards
  const allList = $('allBoardsList');
  allList.replaceChildren();
  if (remaining.length > 0) {
    $('allBoardsSection').hidden = false;
    remaining.forEach((board) => allList.appendChild(renderBoardRow(board)));
  } else if (!query && topChoices.length > 0) {
    $('allBoardsSection').hidden = true;
  } else {
    $('allBoardsSection').hidden = !query;
  }

  // No match state
  $('noBoardsFound').hidden = filtered.length > 0 || all.length === 0;
  populateTrimBoardSelect();
}

function populateTrimBoardSelect() {
  const sel = $('trimBoardSelect');
  if (!sel) return;
  const prev = sel.value;
  sel.replaceChildren();

  const allOpt = document.createElement('option');
  allOpt.value = '';
  allOpt.textContent = '📁 All Boards (Main collection)';
  sel.appendChild(allOpt);

  (state.boards || []).forEach((b) => {
    const opt = document.createElement('option');
    opt.value = b.id;
    opt.textContent = `${b.isPrivate ? '🔒 ' : ''}${b.title}`;
    sel.appendChild(opt);
  });

  if (prev && [...sel.options].some((o) => o.value === prev)) {
    sel.value = prev;
  }
}

// Save to a specific board (Instant 0ms Optimistic UI + parallel background sync!)
async function saveToBoard(board) {
  const selectedList = Array.from(state.selectedMedia.values());
  const itemsToSave = selectedList.length > 0 ? selectedList : (state.context ? [state.context] : []);

  if (itemsToSave.length === 0) {
    showFeedback('Please select at least one reference to save.', 'error');
    return;
  }

  const savingId = board.id || '__all__';
  // Apply edited title if user customized it in Edit Studio
  const editedTitle = $('editClipTitleInput')?.value?.trim();
  if (editedTitle && itemsToSave.length === 1) {
    itemsToSave[0].title = editedTitle;
    if (state.context) state.context.title = editedTitle;
  }

  // If user chose "Save Current Frame" mode for a video, ensure we have a captured frame
  if (itemsToSave.length === 1 && itemsToSave[0]?.isVideo && state.captureMode === 'frame') {
    const frameDataUrl = await grabCurrentVideoFrame();
    if (frameDataUrl) {
      itemsToSave[0] = {
        ...itemsToSave[0],
        thumbnailUrl: frameDataUrl,
        mediaUrl: frameDataUrl,
        isVideo: false,
        kind: 'image',
      };
    }
  }

  // INSTANT 0ms OPTIMISTIC UI: mark as Saved ✓ and update board items immediately
  state.savingBoardId = null;
  state.savedBoardId = savingId;

  const optimisticEntries = itemsToSave.map((item) => {
    const title = (item?.title || state.context?.title || 'Animation Reference').slice(0, 140);
    const thumbnailUrl = item?.thumbnailUrl || state.context?.thumbnailUrl || item?.mediaUrl || 'brand-mark.svg';
    const mediaUrl = item?.mediaUrl || state.context?.mediaUrl || thumbnailUrl;
    const isVideo = Boolean(item?.isVideo || item?.kind === 'video');
    return {
      id: crypto.randomUUID(),
      title,
      thumbnailUrl,
      mediaUrl,
      sourceUrl: item?.pageUrl || item?.url || 'https://animationreference.org',
      isVideo,
    };
  });

  state.allSavedItems = [...optimisticEntries, ...(state.allSavedItems || [])];
  if (board.id) {
    const targetBoard = state.boards.find((b) => b.id === board.id);
    if (targetBoard) {
      targetBoard.items = [...optimisticEntries, ...(targetBoard.items || [])];
      targetBoard.itemCount = (targetBoard.itemCount || 0) + optimisticEntries.length;
      const newThumbs = optimisticEntries.map((e) => e.thumbnailUrl).filter((u) => u && u !== 'brand-mark.svg');
      if (newThumbs.length > 0) {
        targetBoard.thumbnails = [...newThumbs, ...(targetBoard.thumbnails || [])].slice(0, 4);
      }
    }
  }

  renderBoards($('boardSearchInput').value);
  if (state.currentView === 'boardContents' && state.activeInspectBoard) {
    renderBoardContents(state.activeInspectBoard);
  }
  showFeedback(
    itemsToSave.length > 1
      ? `✨ Saved ${itemsToSave.length} references to "${board.title}"!`
      : `✨ Saved to "${board.title}"!`,
    'success'
  );

  // Sync to backend in parallel without blocking the UI
  try {
    const tabUrl = await getActiveTabUrl();
    const results = await Promise.all(
      itemsToSave.map((item) => {
        const sourceUrl = item?.url || item?.pageUrl || tabUrl;
        const title = (item?.title || state.context?.title || 'Animation Reference').slice(0, 140);
        const thumbnailUrl = item?.thumbnailUrl || state.context?.thumbnailUrl || undefined;
        const rawMediaUrl = item?.mediaUrl || state.context?.mediaUrl || undefined;
        const mediaUrl = rawMediaUrl && !rawMediaUrl.startsWith('blob:') ? rawMediaUrl : undefined;
        const mediaType = item?.isVideo || item?.kind === 'video' ? 'video' : 'image';

        return api('/api/clips', {
          method: 'POST',
          idempotencyKey: crypto.randomUUID(),
          body: {
            sourceUrl,
            title,
            thumbnailUrl: thumbnailUrl && !thumbnailUrl.startsWith('blob:') ? thumbnailUrl : undefined,
            mediaUrl,
            mediaType,
            boardId: board.id ? board.id : undefined,
            isPrivate: Boolean(board.isPrivate),
            sourceAuthorName: state.context?.authorName || undefined,
            sourceAuthorUrl: state.context?.authorUrl || undefined,
            sourceAuthorAvatar: state.context?.authorAvatar || undefined,
            sourceDescription: state.context?.description || undefined,
            tags: state.context?.tags || ['animation', 'reference'],
            startTime: state.cropStartTime > 0 ? Number(state.cropStartTime) : 0,
            endTime: state.cropEndTime > 0 ? Number(state.cropEndTime) : (state.videoDuration || 60),
          },
        });
      })
    );

    const failed = results.find((r) => !r?.ok);
    if (failed) {
      throw new Error(failed.error || 'Save failed. Please check network.');
    }
  } catch (err) {
    state.savedBoardId = null;
    renderBoards($('boardSearchInput').value);
    showFeedback(err?.message || 'Could not save reference', 'error');
  }
}

// Extract All Images, Videos & Canvas Elements from Active Tab
async function extractAllPageMedia() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab?.url || !/^https?:\/\//i.test(tab.url)) {
    return { items: [], pageTitle: tab?.title || '', pageUrl: '' };
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: false },
      func: () => {
        const found = [];
        const seen = new Set();
        const pageTitle = document.querySelector('meta[property="og:title"]')?.content || document.title;
        const pageUrl = location.href;
        const ogImage = document.querySelector('meta[property="og:image"]')?.content ||
          document.querySelector('meta[name="twitter:image"]')?.content || '';

        const captureVideoFrame = (v) => {
          try {
            const vw = v.videoWidth || 320;
            const vh = v.videoHeight || 180;
            if (vw > 0 && vh > 0) {
              const canvas = document.createElement('canvas');
              const scale = Math.min(1, 480 / vw);
              canvas.width = Math.round(vw * scale);
              canvas.height = Math.round(vh * scale);
              const ctx = canvas.getContext('2d');
              ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
              if (dataUrl && dataUrl.length > 1000) return dataUrl;
            }
          } catch {}
          return '';
        };

        const getYouTubeThumb = (urlStr) => {
          try {
            const u = new URL(urlStr);
            let ytId = u.searchParams.get('v');
            if (!ytId && u.hostname.includes('youtu.be')) ytId = u.pathname.slice(1);
            if (!ytId && u.pathname.includes('/shorts/')) ytId = u.pathname.split('/shorts/')[1]?.split('/')[0];
            if (!ytId && u.pathname.includes('/embed/')) ytId = u.pathname.split('/embed/')[1]?.split('/')[0];
            if (ytId) return `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
          } catch {}
          return '';
        };

        // 1. All qualifying video elements (including MSE blob: streams on YouTube, IG, TikTok, Vimeo, X)
        document.querySelectorAll('video').forEach((v, index) => {
          const rect = v.getBoundingClientRect();
          if (rect.width < 60 && rect.height < 40 && !v.videoWidth) return;
          const domId = `video_${index}`;
          v.setAttribute('data-animref-vid', domId);
          v.setAttribute('data-animref-el', domId);

          const rawSrc = v.currentSrc || v.src || v.querySelector('source[src]')?.src || '';
          const isDirectHttp = /^https?:\/\//i.test(rawSrc) && !rawSrc.startsWith('blob:');

          // Find closest post link if inside a feed (Instagram, TikTok, X, etc.)
          const article = v.closest('article, [data-e2e], ytd-rich-item-renderer, ytd-video-renderer');
          const postAnchor = article?.querySelector('a[href*="/p/"], a[href*="/reel/"], a[href*="/video/"], a[href*="/status/"], a[href*="/watch?v="], a[href*="/shorts/"]');
          const itemPageUrl = postAnchor?.href || pageUrl;

          const frameThumb = captureVideoFrame(v);
          const posterHttp = v.poster && /^https?:\/\//i.test(v.poster) ? v.poster : '';
          const nearbyImg = article?.querySelector('img')?.src || '';
          const ytThumb = getYouTubeThumb(itemPageUrl);
          const thumb = frameThumb || posterHttp || ytThumb || (nearbyImg && /^https?:\/\//i.test(nearbyImg) ? nearbyImg : '') || ogImage;

          const uniqueKey = isDirectHttp ? rawSrc : `${itemPageUrl}#${domId}`;
          if (seen.has(uniqueKey)) return;
          seen.add(uniqueKey);

          const dur = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 15;
          const cur = Number.isFinite(v.currentTime) && v.currentTime > 0 ? v.currentTime : 0;
          const vTitle = v.getAttribute('title') || v.getAttribute('aria-label') || article?.querySelector('h1, h2, h3, [id="video-title"]')?.textContent?.trim() || pageTitle;

          found.push({
            id: domId,
            domVideoId: domId,
            kind: 'video',
            mediaUrl: isDirectHttp ? rawSrc : itemPageUrl,
            isDirectVideoUrl: isDirectHttp,
            thumbnailUrl: thumb || 'brand-mark.svg',
            title: (vTitle || 'Video Reference').replace(/\s+/g, ' ').trim(),
            duration: dur,
            currentTime: cur,
            isVideo: true,
            pageUrl: itemPageUrl,
            elementLabel: `🎬 Video ${index + 1} (${Math.round(rect.width || v.videoWidth || 0)}×${Math.round(rect.height || v.videoHeight || 0)})`,
          });
        });

        // 2. Embedded Video Iframes (YouTube, Vimeo, TikTok)
        document.querySelectorAll('iframe[src]').forEach((ifr, index) => {
          const src = ifr.src || '';
          if (!/(youtube\.com\/embed\/|player\.vimeo\.com\/|tiktok\.com\/)/i.test(src)) return;
          const rect = ifr.getBoundingClientRect();
          if (rect.width < 100 || rect.height < 60) return;
          const domId = `iframe_video_${index}`;
          ifr.setAttribute('data-animref-el', domId);
          const ytThumb = getYouTubeThumb(src) || ogImage || 'brand-mark.svg';
          if (seen.has(src)) return;
          seen.add(src);
          found.push({
            id: domId,
            kind: 'video',
            mediaUrl: src,
            isDirectVideoUrl: false,
            thumbnailUrl: ytThumb,
            title: ifr.title || pageTitle || 'Embedded Video',
            duration: 30,
            currentTime: 0,
            isVideo: true,
            pageUrl: src,
            elementLabel: `🎬 Embedded Video ${index + 1}`,
          });
        });

        // 3. Qualifying Canvas Elements (3D / WebGL / Animation Canvases)
        document.querySelectorAll('canvas').forEach((c, index) => {
          const rect = c.getBoundingClientRect();
          if (rect.width < 150 || rect.height < 120) return;
          try {
            const dataUrl = c.toDataURL('image/jpeg', 0.82);
            if (!dataUrl || dataUrl.length < 1000) return;
            const domId = `canvas_${index}`;
            c.setAttribute('data-animref-el', domId);
            found.push({
              id: domId,
              kind: 'image',
              mediaUrl: dataUrl,
              thumbnailUrl: dataUrl,
              title: `${pageTitle} (Canvas ${index + 1})`,
              isVideo: false,
              pageUrl,
              elementLabel: `🎨 Canvas ${index + 1} (${Math.round(rect.width)}×${Math.round(rect.height)})`,
            });
          } catch {}
        });

        // 4. All qualifying image elements
        document.querySelectorAll('img').forEach((img, index) => {
          const rect = img.getBoundingClientRect();
          const naturalW = img.naturalWidth || rect.width;
          const naturalH = img.naturalHeight || rect.height;
          if (naturalW < 120 || naturalH < 120) return;
          const src = img.currentSrc || img.src;
          if (!src || !/^https?:\/\//i.test(src) || seen.has(src)) return;
          if (src.includes('avatar') && naturalW < 140) return;
          seen.add(src);
          const domId = `img_${index}`;
          img.setAttribute('data-animref-el', domId);
          found.push({
            id: domId,
            kind: 'image',
            mediaUrl: src,
            thumbnailUrl: src,
            title: (img.alt || img.title || pageTitle || 'Image Reference').replace(/\s+/g, ' ').trim(),
            isVideo: false,
            pageUrl,
            elementLabel: `🖼️ Image ${index + 1} (${Math.round(naturalW)}×${Math.round(naturalH)})`,
          });
        });

        // 5. Fallbacks: og:image, twitter:image
        if (found.length === 0 && ogImage && /^https?:\/\//i.test(ogImage)) {
          found.push({
            id: 'fallback_0',
            kind: 'image',
            mediaUrl: ogImage,
            thumbnailUrl: ogImage,
            title: pageTitle,
            isVideo: false,
            pageUrl,
            elementLabel: '🖼️ Page Cover Image',
          });
        }

        return { items: found, pageTitle, pageUrl };
      },
    });

    const data = results?.[0]?.result;
    return data || { items: [], pageTitle: '', pageUrl: '' };
  } catch {
    return { items: [], pageTitle: '', pageUrl: '' };
  }
}

// Interactive On-Page Element Picker ("🎯 Pick Element")
async function startElementPickerOnPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab?.url || !/^https?:\/\//i.test(tab.url)) {
    showFeedback('Open a webpage first to pick an element.', 'error');
    return;
  }

  // Minimize embedded panel temporarily so the user can see the whole webpage
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'AR_CLOSE_WIDGET' }, '*');
  }

  await chrome.scripting.executeScript({
    target: { tabId: tab.id, allFrames: false },
    func: () => {
      const existing = document.getElementById('animref-element-picker-overlay');
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.id = 'animref-element-picker-overlay';
      overlay.innerHTML = `
        <div style="position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:2147483647;background:#110e19;border:1.5px solid #20d8ec;color:#f8f7fb;padding:10px 18px;border-radius:999px;font:700 13px/1.2 Inter,system-ui,sans-serif;box-shadow:0 12px 32px rgba(0,0,0,0.65);display:flex;align-items:center;gap:12px;pointer-events:auto;">
          <span>🎯 Click any <b>Video</b>, <b>Image</b>, or <b>Element</b> on the page to capture &amp; edit</span>
          <button id="animref-picker-cancel" type="button" style="background:rgba(255,255,255,0.12);border:0;color:#fff;padding:4px 10px;border-radius:99px;font-size:11.5px;font-weight:700;cursor:pointer;">Cancel (Esc)</button>
        </div>
        <div id="animref-picker-box" style="position:fixed;pointer-events:none;z-index:2147483646;border:2.5px solid #20d8ec;background:rgba(124,58,237,0.18);border-radius:8px;box-shadow:0 0 0 2px rgba(124,58,237,0.5),0 0 24px rgba(32,216,236,0.45);display:none;transition:all 0.05s ease;">
          <div id="animref-picker-tag" style="position:absolute;top:-26px;left:0;background:#7c3aed;color:#fff;font:800 11px/1 Inter,system-ui,sans-serif;padding:5px 9px;border-radius:6px;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.4);"></div>
        </div>
      `;
      document.documentElement.appendChild(overlay);

      const box = overlay.querySelector('#animref-picker-box');
      const tag = overlay.querySelector('#animref-picker-tag');
      const cancelBtn = overlay.querySelector('#animref-picker-cancel');

      const resolveMediaElement = (target) => {
        if (!target || !(target instanceof Element) || overlay.contains(target)) return null;
        if (target.id === 'animation-reference-floating-widget' || target.id === 'animref-save-host') return null;
        if (target.tagName === 'VIDEO' || target.tagName === 'IMG' || target.tagName === 'CANVAS') return target;
        const innerVideo = target.querySelector('video');
        if (innerVideo) return innerVideo;
        const innerCanvas = target.querySelector('canvas');
        if (innerCanvas) return innerCanvas;
        const innerImg = target.querySelector('img');
        if (innerImg && (innerImg.naturalWidth >= 80 || innerImg.width >= 80)) return innerImg;
        // Also check document.elementsFromPoint for videos covered by transparent player controls
        return target;
      };

      const findBestAtPoint = (x, y) => {
        const els = document.elementsFromPoint(x, y);
        for (const el of els) {
          if (overlay.contains(el) || el.id === 'animation-reference-floating-widget' || el.id === 'animref-save-host') continue;
          if (el.tagName === 'VIDEO') return el;
        }
        for (const el of els) {
          if (overlay.contains(el) || el.id === 'animation-reference-floating-widget' || el.id === 'animref-save-host') continue;
          if (el.tagName === 'CANVAS' || el.tagName === 'IMG') return el;
        }
        return resolveMediaElement(els[0]);
      };

      let hoveredEl = null;

      const onMove = (e) => {
        const candidate = findBestAtPoint(e.clientX, e.clientY);
        if (!candidate) {
          box.style.display = 'none';
          hoveredEl = null;
          return;
        }
        hoveredEl = candidate;
        const rect = candidate.getBoundingClientRect();
        box.style.display = 'block';
        box.style.left = `${rect.left}px`;
        box.style.top = `${rect.top}px`;
        box.style.width = `${rect.width}px`;
        box.style.height = `${rect.height}px`;

        const tagType = candidate.tagName === 'VIDEO'
          ? `🎬 VIDEO · ${Math.round(rect.width)}×${Math.round(rect.height)}${Number.isFinite(candidate.duration) ? ` · ${candidate.duration.toFixed(1)}s` : ''} — Click to Capture & Edit`
          : candidate.tagName === 'IMG'
          ? `🖼️ IMAGE · ${Math.round(rect.width)}×${Math.round(rect.height)} — Click to Capture`
          : candidate.tagName === 'CANVAS'
          ? `🎨 CANVAS · ${Math.round(rect.width)}×${Math.round(rect.height)} — Click to Capture`
          : `📦 ${candidate.tagName} · ${Math.round(rect.width)}×${Math.round(rect.height)} — Click to Capture`;
        tag.textContent = tagType;
      };

      const cleanup = () => {
        window.removeEventListener('mousemove', onMove, true);
        window.removeEventListener('click', onClick, true);
        window.removeEventListener('keydown', onKey, true);
        overlay.remove();
      };

      const onKey = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          cleanup();
          chrome.runtime.sendMessage({ type: 'AR_OPEN_WIDGET' });
        }
      };

      const onClick = (e) => {
        if (cancelBtn && cancelBtn.contains(e.target)) {
          e.preventDefault();
          e.stopPropagation();
          cleanup();
          chrome.runtime.sendMessage({ type: 'AR_OPEN_WIDGET' });
          return;
        }
        if (!hoveredEl) return;
        e.preventDefault();
        e.stopPropagation();

        const el = hoveredEl;
        const pageTitle = document.querySelector('meta[property="og:title"]')?.content || document.title;
        const pageUrl = location.href;
        const ogImage = document.querySelector('meta[property="og:image"]')?.content || '';
        const domId = `picked_${Date.now()}`;
        el.setAttribute('data-animref-el', domId);

        let item = null;
        if (el.tagName === 'VIDEO') {
          el.setAttribute('data-animref-vid', domId);
          const rawSrc = el.currentSrc || el.src || el.querySelector('source[src]')?.src || '';
          const isDirectHttp = /^https?:\/\//i.test(rawSrc) && !rawSrc.startsWith('blob:');
          let frameThumb = '';
          try {
            const vw = el.videoWidth || 320;
            const vh = el.videoHeight || 180;
            const canvas = document.createElement('canvas');
            const scale = Math.min(1, 480 / vw);
            canvas.width = Math.round(vw * scale);
            canvas.height = Math.round(vh * scale);
            canvas.getContext('2d').drawImage(el, 0, 0, canvas.width, canvas.height);
            frameThumb = canvas.toDataURL('image/jpeg', 0.85);
          } catch {}
          const posterHttp = el.poster && /^https?:\/\//i.test(el.poster) ? el.poster : '';
          item = {
            id: domId,
            domVideoId: domId,
            kind: 'video',
            mediaUrl: isDirectHttp ? rawSrc : pageUrl,
            isDirectVideoUrl: isDirectHttp,
            thumbnailUrl: frameThumb || posterHttp || ogImage || 'brand-mark.svg',
            title: (el.getAttribute('title') || el.getAttribute('aria-label') || pageTitle || 'Picked Video').trim(),
            duration: Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 15,
            currentTime: Number.isFinite(el.currentTime) ? el.currentTime : 0,
            isVideo: true,
            pageUrl,
            elementLabel: `🎯 Picked Video (${Math.round(el.clientWidth)}×${Math.round(el.clientHeight)})`,
          };
        } else if (el.tagName === 'CANVAS') {
          let dataUrl = ogImage;
          try { dataUrl = el.toDataURL('image/jpeg', 0.85); } catch {}
          item = {
            id: domId,
            kind: 'image',
            mediaUrl: dataUrl || pageUrl,
            thumbnailUrl: dataUrl || 'brand-mark.svg',
            title: `${pageTitle} (Picked Canvas)`,
            isVideo: false,
            pageUrl,
            elementLabel: `🎯 Picked Canvas`,
          };
        } else {
          const imgSrc = el.currentSrc || el.src || el.querySelector('img')?.src || ogImage || pageUrl;
          item = {
            id: domId,
            kind: 'image',
            mediaUrl: imgSrc,
            thumbnailUrl: imgSrc,
            title: (el.getAttribute('alt') || el.getAttribute('title') || pageTitle || 'Picked Element').trim(),
            isVideo: false,
            pageUrl,
            elementLabel: `🎯 Picked ${el.tagName}`,
          };
        }

        cleanup();
        chrome.storage.local.set({ pendingPickedElement: { item, at: Date.now() } }, () => {
          chrome.runtime.sendMessage({ type: 'AR_OPEN_WIDGET' });
          chrome.runtime.sendMessage({ type: 'AR_ELEMENT_PICKED', item }).catch(() => {});
        });
      };

      window.addEventListener('mousemove', onMove, true);
      window.addEventListener('click', onClick, true);
      window.addEventListener('keydown', onKey, true);
    },
  });
}

// Render Media Grid (Pinterest 3-column Layout + Edit/Trim button on cards)
function renderMediaGrid() {
  const container = $('pageMediaGrid');
  container.replaceChildren();

  const items = state.pageMedia;
  $('noMediaFoundNotice').hidden = items.length > 0;

  items.forEach((item) => {
    const key = item.id || item.mediaUrl;
    const isSelected = state.selectedMedia.has(key) || state.selectedMedia.has(item.mediaUrl);
    const card = document.createElement('div');
    card.className = `media-item-card ${isSelected ? 'is-selected' : ''}`;
    card.tabIndex = 0;
    card.setAttribute('role', 'checkbox');
    card.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    card.title = item.title || 'Click to select';

    card.innerHTML = `
      <img src="${escapeHtml(item.thumbnailUrl || 'brand-mark.svg')}" alt="" class="media-item-img" loading="lazy" />
      <div class="media-check-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="media-check-svg">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <button class="card-quick-save-btn" type="button" title="Save directly to All Boards">Save</button>
      <button class="card-edit-btn" type="button" title="Edit, trim video, or choose board">${item.isVideo ? '✂️ Trim' : '✏️ Edit'}</button>
      ${item.isVideo ? '<span class="media-kind-tag">VIDEO</span>' : ''}
    `;

    const saveBtn = card.querySelector('.card-quick-save-btn');
    saveBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      saveBtn.disabled = true;
      saveBtn.classList.add('is-saved');
      saveBtn.textContent = 'Saved ✓';
      showFeedback(`✨ Saved to All Boards!`, 'success');

      const optimisticEntry = {
        id: crypto.randomUUID(),
        title: (item.title || 'Animation Reference').slice(0, 140),
        thumbnailUrl: item.thumbnailUrl || item.mediaUrl || 'brand-mark.svg',
        mediaUrl: item.mediaUrl || item.thumbnailUrl,
        sourceUrl: item.pageUrl || 'https://animationreference.org',
        isVideo: Boolean(item.isVideo),
      };
      state.allSavedItems = [optimisticEntry, ...(state.allSavedItems || [])];
      renderBoards($('boardSearchInput').value);

      try {
        const tabUrl = await getActiveTabUrl();
        const payload = {
          sourceUrl: item.pageUrl || tabUrl,
          title: (item.title || 'Animation Reference').slice(0, 140),
          thumbnailUrl: item.thumbnailUrl && !item.thumbnailUrl.startsWith('blob:') ? item.thumbnailUrl : undefined,
          mediaUrl: item.mediaUrl && !item.mediaUrl.startsWith('blob:') ? item.mediaUrl : undefined,
          mediaType: item.isVideo ? 'video' : 'image',
          boardId: '',
          isPrivate: false,
          tags: ['animation', 'reference'],
        };
        const res = await api('/api/clips', {
          method: 'POST',
          idempotencyKey: crypto.randomUUID(),
          body: payload,
        });

        if (!res?.ok) {
          throw new Error(res?.error || 'Save failed.');
        }
        setTimeout(() => {
          saveBtn.classList.remove('is-saved');
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save';
        }, 2500);
      } catch (err) {
        saveBtn.classList.remove('is-saved');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
        showFeedback(err?.message || 'Could not save reference', 'error');
      }
    });

    // Click "✂️ Trim" / "✏️ Edit" button on card to jump straight to Edit Studio + Board Picker
    const editBtn = card.querySelector('.card-edit-btn');
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectSingleElementForEditing(item, true);
    });

    card.addEventListener('click', () => {
      toggleMediaSelection(item, card);
    });

    container.appendChild(card);
  });

  updateSelectionUI();
}

function selectSingleElementForEditing(item, openStudio = true) {
  if (!item) return;
  state.selectedMedia.clear();
  state.selectedMedia.set(item.mediaUrl, item);
  state.context = item;
  renderMediaGrid();
  setView('boards');
  if (openStudio && $('videoCropStudio')) {
    $('videoCropStudio').hidden = false;
    $('videoCropStudio').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function toggleMediaSelection(item, cardEl) {
  if (state.selectedMedia.has(item.mediaUrl)) {
    state.selectedMedia.delete(item.mediaUrl);
    cardEl.classList.remove('is-selected');
    cardEl.setAttribute('aria-checked', 'false');
  } else {
    // Limit to max 20 images matching Pinterest
    if (state.selectedMedia.size >= 20) {
      showFeedback('You can select up to twenty references at a time.', true);
      return;
    }
    state.selectedMedia.set(item.mediaUrl, item);
    cardEl.classList.add('is-selected');
    cardEl.setAttribute('aria-checked', 'true');
  }
  updateSelectionUI();
}

function updateSelectionUI() {
  const count = state.selectedMedia.size;
  $('selectionCountBadge').textContent = `${count} selected`;
  $('boardPickerSelectedCount').textContent = `${count} selected`;

  const nextBtn = $('nextToBoardsBtn');
  if (count > 0) {
    nextBtn.disabled = false;
    nextBtn.classList.add('can-proceed');
    nextBtn.textContent = `Next (${count})`;
  } else {
    nextBtn.disabled = true;
    nextBtn.classList.remove('can-proceed');
    nextBtn.textContent = 'Next';
  }

  // Update Select All Button text
  const allBtn = $('toggleSelectAllBtn');
  if (count > 0 && count === state.pageMedia.length) {
    allBtn.textContent = 'Deselect all';
  } else {
    allBtn.textContent = 'Select all';
  }
}

// Open a board inside the popup to see its saved references
function openBoardContentsView(board) {
  state.activeInspectBoard = board;
  renderBoardContents(board);
  setView('boardContents');
}

function renderBoardContents(board) {
  if (!board) return;
  const isAll = Boolean(board.isAllBoards || !board.id);
  const targetBoard = isAll ? board : (state.boards.find((b) => b.id === board.id) || board);
  const items = isAll ? (state.allSavedItems || []) : (targetBoard.items || []);

  $('activeBoardTitle').textContent = targetBoard.title || 'Board';
  $('activeBoardCountBadge').textContent = `${items.length} ${items.length === 1 ? 'item' : 'items'}`;

  const hasSelection = state.selectedMedia.size > 0 || Boolean(state.context);
  const saveHereBtn = $('saveCurrentToActiveBoardBtn');
  if (saveHereBtn) {
    saveHereBtn.hidden = !hasSelection;
    saveHereBtn.textContent = `+ Save current reference here`;
  }

  const grid = $('boardContentsGrid');
  const emptyNotice = $('emptyBoardNotice');
  grid.replaceChildren();

  if (items.length === 0) {
    emptyNotice.hidden = false;
    return;
  }
  emptyNotice.hidden = true;

  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'media-item-card';
    card.title = `${item.title || 'Saved Reference'} — Click to open`;
    const thumb = item.thumbnailUrl || item.mediaUrl || 'brand-mark.svg';
    card.innerHTML = `
      <img src="${escapeHtml(thumb)}" alt="" class="media-item-img" loading="lazy" />
      ${item.isVideo ? '<span class="media-kind-tag">VIDEO</span>' : ''}
      <div class="saved-item-card-title">${escapeHtml(item.title || 'Reference')}</div>
    `;
    card.addEventListener('click', async () => {
      const origin = await getActiveAppOrigin();
      const url = board.id
        ? `${origin}/moodboard?board=${encodeURIComponent(board.id)}`
        : (item.sourceUrl && /^https?:\/\//i.test(item.sourceUrl) ? item.sourceUrl : `${origin}/moodboard`);
      chrome.tabs.create({ url });
    });
    grid.appendChild(card);
  });
}

// Switch between View 1 (Media Grid), View 2 (Board Picker), and View 3 (Board Contents)
function setView(viewName) {
  state.currentView = viewName;
  if ($('viewBoardContents')) $('viewBoardContents').hidden = viewName !== 'boardContents';
  if (viewName === 'boardContents') {
    $('viewMediaGrid').hidden = true;
    $('viewBoardPicker').hidden = true;
    return;
  }
  if (viewName === 'boards') {
    $('viewMediaGrid').hidden = true;
    $('viewBoardPicker').hidden = false;

    populateElementSelector();

    // Update summary card with selected item(s)
    const selectedList = Array.from(state.selectedMedia.values());
    if (selectedList.length === 1) {
      const item = selectedList[0];
      state.context = item;
      $('metaThumbnail').src = item.thumbnailUrl || 'brand-mark.svg';
      $('sourceTitle').textContent = item.title || 'Captured reference';
      $('sourceHost').textContent = item.elementLabel ? `${item.elementLabel} · Click board to save` : 'Grab & drop into any board below';
      if ($('editClipTitleInput')) $('editClipTitleInput').value = item.title || '';
      $('toggleCropBtn').hidden = false;

      if (item.isVideo) {
        $('mediaTypeBadge').hidden = false;
        $('cropBtnLabel').textContent = 'Edit / Trim';
        if ($('videoTrimSection')) $('videoTrimSection').hidden = false;
        setupCropStudio(item);
      } else {
        $('mediaTypeBadge').hidden = true;
        $('cropBtnLabel').textContent = 'Edit';
        if ($('videoTrimSection')) $('videoTrimSection').hidden = true;
        if ($('cropDurationBadge')) $('cropDurationBadge').textContent = 'IMAGE';
      }
    } else if (selectedList.length > 1) {
      $('metaThumbnail').src = selectedList[0].thumbnailUrl || 'brand-mark.svg';
      $('sourceTitle').textContent = `${selectedList.length} references selected`;
      $('sourceHost').textContent = 'Bulk saving directly to selected board';
      $('mediaTypeBadge').hidden = true;
      $('toggleCropBtn').hidden = false;
      $('cropBtnLabel').textContent = 'Switch Element';
      if ($('videoTrimSection')) $('videoTrimSection').hidden = true;
      $('videoCropStudio').hidden = true;
    } else {
      $('metaThumbnail').src = 'brand-mark.svg';
      $('sourceTitle').textContent = 'No element selected yet';
      $('sourceHost').textContent = 'Click "🎯 Pick" to select a video or element on the page';
      $('mediaTypeBadge').hidden = true;
      $('toggleCropBtn').hidden = false;
      $('cropBtnLabel').textContent = 'Edit';
      if ($('videoTrimSection')) $('videoTrimSection').hidden = true;
      $('videoCropStudio').hidden = true;
    }
  } else {
    $('viewMediaGrid').hidden = false;
    $('viewBoardPicker').hidden = true;
  }
}

function populateElementSelector() {
  const select = $('captureElementSelect');
  if (!select) return;
  select.replaceChildren();

  const items = state.pageMedia || [];
  if (items.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No media detected — click "🎯 Pick on Page"';
    select.appendChild(opt);
    return;
  }

  items.forEach((item, idx) => {
    const opt = document.createElement('option');
    opt.value = String(idx);
    const prefix = item.elementLabel || (item.isVideo ? `🎬 Video ${idx + 1}` : `🖼️ Image ${idx + 1}`);
    const shortTitle = (item.title || '').slice(0, 38);
    opt.textContent = `${prefix}${shortTitle ? ` — ${shortTitle}` : ''}`;
    if (state.context && (state.context.id === item.id || state.context.mediaUrl === item.mediaUrl)) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });
}

async function highlightElementOnPage(domId) {
  if (!domId) return;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [domId],
      func: (id) => {
        const el = document.querySelector(`[data-animref-el="${id}"], [data-animref-vid="${id}"]`);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const prevOutline = el.style.outline;
        const prevShadow = el.style.boxShadow;
        el.style.outline = '3px solid #20d8ec';
        el.style.boxShadow = '0 0 28px rgba(32, 216, 236, 0.75)';
        setTimeout(() => {
          el.style.outline = prevOutline;
          el.style.boxShadow = prevShadow;
        }, 1600);
      },
    });
  } catch {}
}

async function seekPageVideoAndGrabFrame(domVideoId, timeSec) {
  if (!domVideoId) return null;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return null;
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [domVideoId, timeSec],
      func: async (vidId, targetTime) => {
        const v = document.querySelector(`video[data-animref-vid="${vidId}"]`) || document.querySelector('video');
        if (!v) return null;
        if (typeof targetTime === 'number' && Number.isFinite(targetTime)) {
          v.currentTime = Math.max(0, Math.min(targetTime, Number.isFinite(v.duration) ? v.duration : targetTime));
          await new Promise((r) => setTimeout(r, 90));
        }
        let frameDataUrl = '';
        try {
          const vw = v.videoWidth || 320;
          const vh = v.videoHeight || 180;
          const canvas = document.createElement('canvas');
          const scale = Math.min(1, 560 / vw);
          canvas.width = Math.round(vw * scale);
          canvas.height = Math.round(vh * scale);
          canvas.getContext('2d').drawImage(v, 0, 0, canvas.width, canvas.height);
          frameDataUrl = canvas.toDataURL('image/jpeg', 0.86);
        } catch {}
        return {
          currentTime: Number.isFinite(v.currentTime) ? v.currentTime : 0,
          duration: Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 15,
          frameDataUrl: frameDataUrl && frameDataUrl.length > 1000 ? frameDataUrl : '',
        };
      },
    });
    return res?.result || null;
  } catch {
    return null;
  }
}

async function grabCurrentVideoFrame() {
  const item = state.context;
  const player = $('cropVideoPlayer');
  if (item?.isDirectVideoUrl && player && !player.hidden && player.videoWidth > 0) {
    try {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 560 / player.videoWidth);
      canvas.width = Math.round(player.videoWidth * scale);
      canvas.height = Math.round(player.videoHeight * scale);
      canvas.getContext('2d').drawImage(player, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
      if (dataUrl && dataUrl.length > 1000) return dataUrl;
    } catch {}
  }
  const pageRes = await seekPageVideoAndGrabFrame(item?.domVideoId || 'video_0', null);
  return pageRes?.frameDataUrl || item?.thumbnailUrl || '';
}

// Initialize Video Crop Studio (supports both direct video URLs and live page MSE/blob videos)
function setupCropStudio(itemOrUrl, fallbackDuration) {
  const item = typeof itemOrUrl === 'object' && itemOrUrl !== null
    ? itemOrUrl
    : { mediaUrl: itemOrUrl, duration: fallbackDuration, isDirectVideoUrl: true };

  const player = $('cropVideoPlayer');
  const frameImg = $('liveVideoFramePreview');
  const cropBtn = $('toggleCropBtn');

  cropBtn.hidden = false;
  const dur = Math.max(1, Number(item.duration) || 15);
  const start = Number.isFinite(item.currentTime) && item.currentTime > 0 && item.currentTime < dur - 1
    ? Number(item.currentTime.toFixed(1))
    : 0;
  state.videoDuration = dur;
  state.cropStartTime = start;
  state.cropEndTime = Math.min(dur, Math.max(start + 10, 5));

  $('cropStartRange').max = dur;
  $('cropStartRange').value = state.cropStartTime;
  $('cropEndRange').max = dur;
  $('cropEndRange').value = state.cropEndTime;

  if (item.isDirectVideoUrl && item.mediaUrl && !item.mediaUrl.startsWith('blob:')) {
    player.src = item.mediaUrl;
  } else {
    player.removeAttribute('src');
  }
  player.hidden = true;
  if (frameImg) frameImg.hidden = true;
  populateTrimBoardSelect();

  updateCropLabels();
}

const mainCropPlayer = $('cropVideoPlayer');
if (mainCropPlayer) {
  mainCropPlayer.addEventListener('timeupdate', () => {
    if (state.isCropping && !mainCropPlayer.hidden) {
      if (mainCropPlayer.currentTime >= state.cropEndTime) {
        mainCropPlayer.currentTime = state.cropStartTime;
        mainCropPlayer.play().catch(() => {});
      }
    }
  });
}

function updateCropLabels() {
  if ($('cropStartLabel')) $('cropStartLabel').textContent = formatTime(state.cropStartTime);
  if ($('cropEndLabel')) $('cropEndLabel').textContent = formatTime(state.cropEndTime);
  const diff = Math.max(0, state.cropEndTime - state.cropStartTime).toFixed(1);
  if ($('cropDurationBadge')) {
    $('cropDurationBadge').textContent = state.captureMode === 'frame'
      ? `STILL FRAME (${formatTime(state.cropStartTime)})`
      : `${formatTime(state.cropStartTime)} – ${formatTime(state.cropEndTime)} (${diff}s)`;
  }
}


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

async function getActiveAppOrigin() {
  try {
    const tabs = await getRelevantTabs();
    const localTab = tabs.find((t) => t.url && (t.url.startsWith('http://localhost') || t.url.startsWith('http://127.0.0.1')));
    if (localTab?.url) return new URL(localTab.url).origin;
    if (tabs.length > 0 && tabs[0].url) {
      return new URL(tabs[0].url).origin;
    }
  } catch {}
  const stored = (await chrome.storage.local.get('apiOrigin'))?.apiOrigin;
  return stored || 'http://localhost:3001';
}

// Pinterest auto-sign in: automatically grabs token from any open Animation Reference tab
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
        await applyConnectPayload(res.result);
        return true;
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
          return await applyConnectPayload({ token, origin: checkUrl });
        }
      }
    }
  } catch {}

  return false;
}

// Initialize Extension Popup
async function init() {
  hideFeedback();
  if (state.isInitializing) return;
  state.isInitializing = true;

  try {
    let response = await api('/api/extension/bootstrap');

    if (!response?.ok) {
      const autoConnected = await tryAutoSignInFromOpenTabs();
      if (autoConnected) {
        response = await api('/api/extension/bootstrap');
      }
    }

    if (!response?.ok) {
      if (!state.bootstrap) {
        $('connect').hidden = false;
        $('mainContent').hidden = true;
      }
      return;
    }

    state.bootstrap = response.data;
    state.boards = response.data.boards || [];
    state.allSavedItems = response.data.allSavedItems || [];

    $('connect').hidden = true;
    $('mainContent').hidden = false;

  // Set User Profile (Animation Reference Header)
  const user = response.data.user || {};
  $('userName').textContent = user.displayName || user.username || 'Michael';
  if (user.avatarUrl) {
    $('userAvatar').src = user.avatarUrl;
    $('userAvatar').hidden = false;
    $('defaultAvatar').hidden = true;
  }

  // Extract all page media (Pinterest Multi-Select Media Grabber)
  const pageData = await extractAllPageMedia();
  state.pageMedia = pageData.items || [];

  // Check if user just picked a specific element on the page or clicked Trim on the hover pin
  const pendingPicked = (await chrome.storage.local.get('pendingPickedElement'))?.pendingPickedElement;
  const recentPick = pendingPicked?.item && Date.now() - (pendingPicked.at || 0) < 30000 ? pendingPicked.item : null;
  if (recentPick) {
    await chrome.storage.local.remove('pendingPickedElement').catch(() => {});
    state.pageMedia = [recentPick, ...state.pageMedia.filter((m) => m.id !== recentPick.id && m.mediaUrl !== recentPick.mediaUrl)];
  }

  // Default pre-select the first item
  state.selectedMedia.clear();
  if (state.pageMedia.length > 0) {
    state.selectedMedia.set(state.pageMedia[0].mediaUrl, state.pageMedia[0]);
    state.context = state.pageMedia[0];
  }

  // Render the Pinterest 3-column media grid
  renderMediaGrid();
  renderBoards();

  if (recentPick) {
    setView('boards');
    if ($('videoCropStudio')) $('videoCropStudio').hidden = false;
  } else if (state.pageMedia.length <= 1 || state.pageMedia[0]?.isVideo) {
    // If page has a primary video or <= 1 item, go straight to boards view so Video Edit/Trim & Boards are immediately ready
    setView('boards');
    if (state.pageMedia[0]?.isVideo && $('videoCropStudio')) {
      $('videoCropStudio').hidden = false;
    }
  } else {
    setView('grid');
  }
  } finally {
    state.isInitializing = false;
  }
}

// Navigation between views
$('nextToBoardsBtn').addEventListener('click', () => {
  if (state.selectedMedia.size > 0) {
    setView('boards');
  }
});

$('backToGridBtn').addEventListener('click', () => {
  setView('grid');
});

$('browseBoardsFromGridBtn')?.addEventListener('click', () => {
  setView('boards');
});

$('backToBoardsBtn')?.addEventListener('click', () => {
  setView('boards');
});

$('openActiveBoardSiteBtn')?.addEventListener('click', () => {
  openBoardOnWebsite(state.activeInspectBoard?.id || '');
});

$('emptyBoardOpenSiteBtn')?.addEventListener('click', () => {
  openBoardOnWebsite(state.activeInspectBoard?.id || '');
});

$('saveCurrentToActiveBoardBtn')?.addEventListener('click', async () => {
  if (state.activeInspectBoard) {
    await saveToBoard(state.activeInspectBoard);
  }
});

// Interactive Element Picker buttons
$('pickElementGridBtn')?.addEventListener('click', () => {
  startElementPickerOnPage();
});

$('pickElementBoardBtn')?.addEventListener('click', () => {
  startElementPickerOnPage();
});

$('pickElementStudioBtn')?.addEventListener('click', () => {
  startElementPickerOnPage();
});

// Switch active element from dropdown inside Edit Studio
$('captureElementSelect')?.addEventListener('change', (e) => {
  const idx = Number(e.target.value);
  const chosen = state.pageMedia[idx];
  if (!chosen) return;
  highlightElementOnPage(chosen.id || chosen.domVideoId);
  selectSingleElementForEditing(chosen, true);
});

// Live-edit Reference Title
$('editClipTitleInput')?.addEventListener('input', (e) => {
  const val = e.target.value;
  if (state.context) state.context.title = val;
  const selectedList = Array.from(state.selectedMedia.values());
  if (selectedList.length === 1) selectedList[0].title = val;
  $('sourceTitle').textContent = val || 'Captured reference';
});

// Capture Mode Toggle: Video Clip vs Still Frame
$('modeVideoClipBtn')?.addEventListener('click', () => {
  state.captureMode = 'video';
  $('modeVideoClipBtn')?.classList.add('is-active');
  $('modeStillFrameBtn')?.classList.remove('is-active');
  if ($('videoRangeControls')) $('videoRangeControls').hidden = false;
  updateCropLabels();
});

$('modeStillFrameBtn')?.addEventListener('click', async () => {
  state.captureMode = 'frame';
  $('modeStillFrameBtn')?.classList.add('is-active');
  $('modeVideoClipBtn')?.classList.remove('is-active');
  updateCropLabels();
  const frameUrl = await grabCurrentVideoFrame();
  if (frameUrl && state.context) {
    state.context.thumbnailUrl = frameUrl;
    $('metaThumbnail').src = frameUrl;
    if ($('liveVideoFramePreview')) {
      $('liveVideoFramePreview').src = frameUrl;
      $('liveVideoFramePreview').hidden = false;
    }
  }
});

// Grab Current Frame button
$('grabVideoFrameBtn')?.addEventListener('click', async () => {
  const frameUrl = await grabCurrentVideoFrame();
  if (frameUrl && state.context) {
    state.context.thumbnailUrl = frameUrl;
    $('metaThumbnail').src = frameUrl;
    if ($('liveVideoFramePreview')) {
      $('liveVideoFramePreview').src = frameUrl;
      $('liveVideoFramePreview').hidden = false;
    }
    showFeedback('📸 Captured current video frame!', 'success');
  } else {
    showFeedback('Synced current video timestamp!', 'success');
  }
});

// Select All / Deselect All Toggle
$('toggleSelectAllBtn').addEventListener('click', () => {
  if (state.selectedMedia.size === state.pageMedia.length) {
    state.selectedMedia.clear();
  } else {
    state.selectedMedia.clear();
    state.pageMedia.slice(0, 20).forEach((item) => {
      state.selectedMedia.set(item.mediaUrl, item);
    });
  }
  renderMediaGrid();
});

// Search Filter Listener
$('boardSearchInput').addEventListener('input', (e) => {
  const val = e.target.value;
  $('clearSearchBtn').hidden = !val;
  renderBoards(val);
});

$('clearSearchBtn').addEventListener('click', () => {
  $('boardSearchInput').value = '';
  $('clearSearchBtn').hidden = true;
  renderBoards('');
  $('boardSearchInput').focus();
});

// Toggle Video Crop Studio
$('toggleCropBtn').addEventListener('click', () => {
  const studio = $('videoCropStudio');
  studio.hidden = !studio.hidden;
});

// Start Range Changed
$('cropStartRange').addEventListener('input', async (e) => {
  const val = parseFloat(e.target.value);
  if (val >= state.cropEndTime) {
    state.cropStartTime = Math.max(0, state.cropEndTime - 0.5);
    e.target.value = state.cropStartTime;
  } else {
    state.cropStartTime = val;
  }
  const player = $('cropVideoPlayer');
  if (player && !player.hidden) {
    player.currentTime = state.cropStartTime;
  } else if (state.context?.domVideoId) {
    const res = await seekPageVideoAndGrabFrame(state.context.domVideoId, state.cropStartTime);
    if (res?.frameDataUrl) {
      $('liveVideoFramePreview').src = res.frameDataUrl;
      $('metaThumbnail').src = res.frameDataUrl;
      state.context.thumbnailUrl = res.frameDataUrl;
    }
  }
  updateCropLabels();
});

// End Range Changed
$('cropEndRange').addEventListener('input', async (e) => {
  const val = parseFloat(e.target.value);
  if (val <= state.cropStartTime) {
    state.cropEndTime = Math.min(state.videoDuration, state.cropStartTime + 0.5);
    e.target.value = state.cropEndTime;
  } else {
    state.cropEndTime = val;
  }
  const player = $('cropVideoPlayer');
  if (player && !player.hidden) {
    player.currentTime = state.cropEndTime;
  } else if (state.context?.domVideoId) {
    const res = await seekPageVideoAndGrabFrame(state.context.domVideoId, state.cropEndTime);
    if (res?.frameDataUrl) {
      $('liveVideoFramePreview').src = res.frameDataUrl;
    }
  }
  updateCropLabels();
});

// Marker buttons (reads from popup video player OR live webpage video player!)
$('setStartBtn').addEventListener('click', async () => {
  const player = $('cropVideoPlayer');
  if (player && !player.hidden) {
    state.cropStartTime = player.currentTime;
  } else {
    const res = await seekPageVideoAndGrabFrame(state.context?.domVideoId || 'video_0', null);
    if (res) {
      state.cropStartTime = Number(res.currentTime.toFixed(1));
      if (res.frameDataUrl) {
        $('liveVideoFramePreview').src = res.frameDataUrl;
        $('metaThumbnail').src = res.frameDataUrl;
        if (state.context) state.context.thumbnailUrl = res.frameDataUrl;
      }
    }
  }
  if (state.cropEndTime <= state.cropStartTime) {
    state.cropEndTime = Math.min(state.videoDuration, state.cropStartTime + 5);
    $('cropEndRange').value = state.cropEndTime;
  }
  $('cropStartRange').value = state.cropStartTime;
  updateCropLabels();
});

$('setEndBtn').addEventListener('click', async () => {
  const player = $('cropVideoPlayer');
  if (player && !player.hidden) {
    state.cropEndTime = player.currentTime;
  } else {
    const res = await seekPageVideoAndGrabFrame(state.context?.domVideoId || 'video_0', null);
    if (res) {
      state.cropEndTime = Math.max(state.cropStartTime + 0.5, Number(res.currentTime.toFixed(1)));
      if (res.frameDataUrl) {
        $('liveVideoFramePreview').src = res.frameDataUrl;
      }
    }
  }
  $('cropEndRange').value = state.cropEndTime;
  updateCropLabels();
});

// Loop preview toggle (loops in popup player OR on webpage video player!)
$('previewCropBtn').addEventListener('click', async () => {
  const player = $('cropVideoPlayer');
  state.isCropping = !state.isCropping;
  if (player && !player.hidden) {
    if (state.isCropping) {
      player.currentTime = state.cropStartTime;
      player.play().catch(() => {});
      $('previewCropBtn').textContent = '⏹ Stop Loop';
    } else {
      player.pause();
      $('previewCropBtn').textContent = '▶ Loop Clip';
    }
  } else {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [state.context?.domVideoId || 'video_0', state.isCropping, state.cropStartTime, state.cropEndTime],
        func: (vidId, looping, startT, endT) => {
          const v = document.querySelector(`video[data-animref-vid="${vidId}"]`) || document.querySelector('video');
          if (!v) return;
          if (window.__animrefLoopTimer) {
            clearInterval(window.__animrefLoopTimer);
            window.__animrefLoopTimer = null;
          }
          if (looping) {
            v.currentTime = startT;
            v.play().catch(() => {});
            window.__animrefLoopTimer = setInterval(() => {
              if (v.currentTime >= endT || v.currentTime < startT) {
                v.currentTime = startT;
                v.play().catch(() => {});
              }
            }, 150);
          } else {
            v.pause();
          }
        },
      }).catch(() => {});
    }
    $('previewCropBtn').textContent = state.isCropping ? '⏹ Stop Loop' : '▶ Loop Clip';
  }
});

// Done Cropping button
$('applyCropBtn')?.addEventListener('click', () => {
  $('videoCropStudio').hidden = true;
  state.isCropping = false;
  $('cropVideoPlayer')?.pause();
});

// Direct "Save to Board" button inside Trim box
$('trimSaveToBoardBtn')?.addEventListener('click', async () => {
  const boardId = $('trimBoardSelect')?.value || '';
  const targetBoard = boardId
    ? (state.boards.find((b) => b.id === boardId) || { id: boardId, title: 'Board' })
    : { id: '', title: 'All Boards (Main collection)', isAllBoards: true };
  await saveToBoard(targetBoard);
});

// Inline Create Board Drawer
$('openCreateBoardBtn').addEventListener('click', () => {
  $('createBoardDrawer').hidden = false;
  $('newBoardNameInput').value = '';
  $('newBoardNameInput').focus();
});

$('closeDrawerBtn').addEventListener('click', () => {
  $('createBoardDrawer').hidden = true;
});

$('cancelCreateBtn').addEventListener('click', () => {
  $('createBoardDrawer').hidden = true;
});

$('createBoardForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = $('newBoardNameInput').value.trim();
  const isPrivate = $('newBoardPrivateInput').checked;
  if (!title) return;

  $('submitCreateBtn').disabled = true;
  $('submitCreateBtn').textContent = 'Creating…';

  try {
    const res = await api('/api/extension/boards', {
      method: 'POST',
      body: { title, isPrivate },
    });

    const newBoard = res?.data?.board || res?.board;
    if (res?.ok && newBoard) {
      state.boards.unshift(newBoard);
      $('createBoardDrawer').hidden = true;
      renderBoards();

      // Automatically save to the newly created board if media is selected
      if (state.selectedMedia.size > 0 || state.context) {
        await saveToBoard(newBoard);
      } else {
        showFeedback(`✨ Created board "${newBoard.title}"!`, 'success');
      }
    } else {
      throw new Error(res?.error || res?.data?.message || 'Could not create board');
    }
  } catch (err) {
    showFeedback(err?.message || 'Could not create board', 'error');
  } finally {
    $('submitCreateBtn').disabled = false;
    $('submitCreateBtn').textContent = 'Create';
  }
});

// Drag Pin card into any moodboard
const summaryCard = $('itemSummaryCard');
if (summaryCard) {
  summaryCard.addEventListener('dragstart', (e) => {
    summaryCard.classList.add('is-dragging');
    e.dataTransfer.effectAllowed = 'copyMove';
    const dragPayload = state.context?.mediaUrl || state.context?.url || window.location.href;
    e.dataTransfer.setData('text/plain', dragPayload);
    e.dataTransfer.setData('text/uri-list', dragPayload);
  });

  summaryCard.addEventListener('dragend', () => {
    summaryCard.classList.remove('is-dragging');
  });
}

// Settings / My Boards / User Pill buttons -> Open Boards on Website
$('settingsBtn')?.addEventListener('click', () => {
  openBoardOnWebsite('');
});

$('openWebsiteBoardsBtn')?.addEventListener('click', () => {
  openBoardOnWebsite('');
});

$('userPill')?.addEventListener('click', () => {
  openBoardOnWebsite('');
});

// Close button
$('closeBtn').addEventListener('click', () => {
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'AR_CLOSE_WIDGET' }, '*');
  } else {
    window.close();
  }
});

// Apply auth payload to storage (no recursive init call)
async function applyConnectPayload(payload) {
  if (!payload?.token) return false;
  const currentOrigin = (await chrome.storage.local.get('apiOrigin'))?.apiOrigin;
  const origin = payload.origin || currentOrigin || 'https://animationreference.org';
  await chrome.storage.local.set({
    firebaseIdToken: payload.token,
    ...(payload.refreshToken ? { firebaseRefreshToken: payload.refreshToken } : {}),
    firebaseApiKey: payload.firebaseApiKey || payload.apiKey || 'AIzaSyAnbGJpTKPNBzLMb81bU7e8AY5k0x6E5Kg',
    ...(payload.tokenExpiresAt || payload.expiresAt ? { firebaseTokenExpiresAt: Number(payload.tokenExpiresAt || payload.expiresAt) } : {}),
    apiOrigin: origin,
  });
  if (chrome.storage.session) {
    await chrome.storage.session.remove('quickBootstrap').catch(() => {});
  }
  return true;
}

// Direct In-Popup Email & Password Login
const directForm = $('directLoginForm');
if (directForm) {
  directForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('loginEmailInput').value.trim();
    const password = $('loginPasswordInput').value;
    if (!email || !password) return;

    const btn = $('directLoginSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Signing in…';
    $('connectMessage').textContent = 'Authenticating with Animation Reference…';

    try {
      const apiKey = 'AIzaSyAnbGJpTKPNBzLMb81bU7e8AY5k0x6E5Kg';
      const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.idToken) {
        throw new Error(data.error?.message === 'INVALID_LOGIN_CREDENTIALS' || data.error?.message === 'EMAIL_NOT_FOUND' ? 'Incorrect email or password.' : (data.error?.message || 'Login failed.'));
      }

      $('connectMessage').textContent = 'Loading boards…';
      const detectedOrigin = await getActiveAppOrigin();
      await applyConnectPayload({
        token: data.idToken,
        refreshToken: data.refreshToken,
        expiresAt: Date.now() + Number(data.expiresIn || 3600) * 1000,
        apiKey,
        origin: detectedOrigin,
      });

      await init();

      if (!state.bootstrap) {
        throw new Error('Authenticated with Firebase, but could not load profile. Please check network.');
      }
    } catch (err) {
      $('connectMessage').textContent = err.message || 'Login failed. Please check credentials.';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  });
}

// Connect via Browser Tab button
$('connectButton').addEventListener('click', async () => {
  $('connectMessage').textContent = 'Opening sign-in window… Once signed in, this will connect automatically.';
  await chrome.runtime.sendMessage({ type: 'AR_START_CONNECT' });
});

// Manual Token Drawer
$('togglePasteTokenBtn')?.addEventListener('click', () => {
  const drawer = $('pasteTokenDrawer');
  drawer.hidden = !drawer.hidden;
  if (!drawer.hidden) $('manualTokenInput').focus();
});

$('applyTokenBtn')?.addEventListener('click', async () => {
  const raw = $('manualTokenInput').value.trim();
  if (!raw) return;
  try {
    let parsed = null;
    try {
      parsed = JSON.parse(atob(raw));
    } catch {
      try { parsed = JSON.parse(raw); } catch {
        parsed = { token: raw };
      }
    }
    const ok = await applyConnectPayload(parsed);
    if (ok) {
      await init();
    } else {
      $('connectMessage').textContent = 'Invalid token code. Please copy fresh from the connect tab.';
    }
  } catch (err) {
    $('connectMessage').textContent = 'Could not parse connection code.';
  }
});

// Auto-scan open tabs for the auth bridge element
async function scanOpenTabsForAuth() {
  if (state.bootstrap || state.isInitializing) return false;
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
              expiresAt: Number(bridge.dataset.expiresAt),
              apiKey: bridge.dataset.apiKey,
              origin: location.origin,
            };
          }
          return null;
        },
      }).catch(() => [null]);

      if (res?.result?.token) {
        await applyConnectPayload(res.result);
        await init();
        return true;
      }
    }
  } catch {}
  return false;
}

// Auto-check connection every 2 seconds while on sign-in screen
setInterval(async () => {
  if (state.bootstrap || state.isInitializing) return;
  const connectEl = $('connect');
  if (connectEl && !connectEl.hidden) {
    await scanOpenTabsForAuth();
  }
}, 2000);

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'AR_AUTH_CONNECTED') init();
  if (message?.type === 'AR_ELEMENT_PICKED' && message.item) {
    const picked = message.item;
    state.pageMedia = [picked, ...state.pageMedia.filter((m) => m.id !== picked.id && m.mediaUrl !== picked.mediaUrl)];
    selectSingleElementForEditing(picked, true);
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.pendingPickedElement?.newValue?.item) {
    const picked = changes.pendingPickedElement.newValue.item;
    chrome.storage.local.remove('pendingPickedElement').catch(() => {});
    state.pageMedia = [picked, ...state.pageMedia.filter((m) => m.id !== picked.id && m.mediaUrl !== picked.mediaUrl)];
    selectSingleElementForEditing(picked, true);
  }
});

window.addEventListener('message', (event) => {
  if (event.data?.type === 'AR_SELECT_FOR_TRIM' && event.data.item) {
    const picked = event.data.item;
    state.pageMedia = [picked, ...state.pageMedia.filter((m) => m.id !== picked.id && m.mediaUrl !== picked.mediaUrl)];
    selectSingleElementForEditing(picked, true);
  }
});

window.addEventListener('focus', () => {
  if (!state.bootstrap) init();
});

// Run Init
init();
