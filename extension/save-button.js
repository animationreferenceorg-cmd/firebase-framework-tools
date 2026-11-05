/*
 * Pinterest-style Hover "Save" Pin and expandable board selector for videos and images.
 * Rules (sizes, opt-outs, excluded sites, save mode) live in save-rules.js.
 * All UI is inside a closed shadow root so host pages cannot alter or break it.
 *
 * Behaviors:
 * 1. Hovering over any reference media reveals the sleek Animation Reference Pin.
 * 2. Clicking "Save" instantly 1-click saves directly to "All Boards" (or active board) with zero popovers.
 * 3. Hovering over the pin / board selector smoothly expands the board flyout dropdown, allowing
 *    the user to choose a specific board (or create one) with 1-click save.
 */
(() => {
  if (window.__animrefSaveButtonInstalled) return;
  window.__animrefSaveButtonInstalled = true;

  const R = globalThis.AR_SAVE_RULES;
  if (!R || R.isHostExcluded(location.hostname)) return;

  const HOST_ID = 'animref-save-host';
  const HIDE_DELAY_MS = 220;
  const NEGATIVE_CACHE_MS = 1500;
  const PAGE_OPT_OUT_TTL_MS = 3000;

  let host = null;
  let ui = null;
  let current = null;
  let dropdownOpen = false;
  let hideTimer = 0;
  let moveFrame = 0;
  let scrollFrame = 0;
  let toastTimer = 0;
  let lastContext = null;
  let pageOptOut = { value: false, at: 0 };
  let cachedBoards = [];
  let activeBoard = { id: '', title: 'All Boards' };
  let isSaving = false;
  const rejected = new WeakMap();

  // ---------------------------------------------------------------- helpers

  function h(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (value === undefined || value === null || value === false) continue;
      if (key === 'className') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key === 'style') node.style.cssText = value;
      else if (/^on[A-Z]/.test(key)) node.addEventListener(key.slice(2).toLowerCase(), value);
      else if (key.includes('-') || key === 'role') node.setAttribute(key, value === true ? '' : String(value));
      else if (key in node) node[key] = value;
      else node.setAttribute(key, value === true ? '' : String(value));
    }
    for (const child of [].concat(children)) if (child) node.append(child);
    return node;
  }

  function setState(name, value) {
    if (host) host.setAttribute(`data-${name}`, value);
  }

  function send(message) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) resolve({ ok: false, status: 0, error: 'Extension updated. Reload page to reconnect.' });
          else resolve(response || { ok: false, status: 0, error: 'No response from extension.' });
        });
      } catch {
        resolve({ ok: false, status: 0, error: 'Extension updated. Reload page to reconnect.' });
      }
    });
  }

  function storageGet(keys) {
    return new Promise((resolve) => {
      try { chrome.storage.local.get(keys, (value) => resolve(value || {})); } catch { resolve({}); }
    });
  }

  function storageSet(value) {
    try { chrome.storage.local.set(value); } catch { /* ignore */ }
  }

  function sourceHost() {
    return location.hostname.replace(/^www\./, '');
  }

  function isPageOptedOut() {
    const now = Date.now();
    if (now - pageOptOut.at < PAGE_OPT_OUT_TTL_MS) return pageOptOut.value;
    const metas = [...document.querySelectorAll('meta[name]')].map((meta) => ({
      name: meta.getAttribute('name'),
      content: meta.getAttribute('content'),
    }));
    pageOptOut = { value: R.pageOptsOut(metas), at: now };
    return pageOptOut.value;
  }

  // ---------------------------------------------------------------- media extraction

  function mediaUrlOf(element, kind) {
    if (kind === 'image') return element.currentSrc || element.src || '';
    return element.currentSrc || element.src || element.querySelector('source[src]')?.src || '';
  }

  function extractCreatorContext(element) {
    let authorName = '';
    let authorUrl = '';
    let authorAvatar = '';
    let postUrl = '';

    const isInstagram = location.hostname.includes('instagram.com');
    if (isInstagram) {
      const article = element?.closest('article, main') || document.querySelector('article, main') || document.body;
      const header = article?.querySelector('header') || article;

      const postAnchor = article?.querySelector('a[href*="/p/"], a[href*="/reel/"]');
      if (postAnchor) {
        try { postUrl = new URL(postAnchor.href, location.href).href; } catch {}
      }
      if (!postUrl && (location.pathname.startsWith('/p/') || location.pathname.startsWith('/reel/'))) {
        postUrl = location.href;
      }

      const excluded = new Set(['p', 'reel', 'reels', 'explore', 'stories', 'direct', 'accounts']);
      const headerLinks = [...header.querySelectorAll('a[href]')];
      for (const anchor of headerLinks) {
        try {
          const u = new URL(anchor.href, location.href);
          const segs = u.pathname.split('/').filter(Boolean);
          if (segs.length === 1 && !excluded.has(segs[0].toLowerCase())) {
            authorName = `@${segs[0]}`;
            authorUrl = u.href;
            break;
          }
        } catch {}
      }

      if (!authorName) {
        const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
        const match = ogTitle.match(/\(@([a-zA-Z0-9._-]+)\)/) || ogTitle.match(/^([^:]+)\s+on\s+Instagram/i);
        if (match) authorName = `@${match[1].replace(/^@/, '')}`;
      }

      const avatarImg = header.querySelector('img[alt*="profile picture" i], img[data-e2e="user-avatar"]') ||
                        article.querySelector('img[alt*="profile picture" i]');
      authorAvatar = avatarImg?.currentSrc || avatarImg?.src || '';
    } else {
      const metaAuthor = document.querySelector('meta[name="author"]')?.getAttribute('content') ||
                         document.querySelector('meta[name="twitter:creator"]')?.getAttribute('content') || '';
      if (metaAuthor) authorName = metaAuthor.startsWith('@') ? metaAuthor : `@${metaAuthor}`;
    }

    return { authorName, authorUrl, authorAvatar, postUrl };
  }

  function describe(element, kind, mediaUrl) {
    const creator = extractCreatorContext(element);
    return {
      element,
      kind,
      mediaUrl,
      linkUrl: creator.postUrl || '',
      authorName: creator.authorName || '',
      authorUrl: creator.authorUrl || '',
      authorAvatar: creator.authorAvatar || '',
      poster: kind === 'video' ? element.poster || '' : mediaUrl,
      duration: kind === 'video' && Number.isFinite(element.duration) ? element.duration : undefined,
      title: R.suggestedTitle({
        alt: element.getAttribute('alt'),
        titleAttribute: element.getAttribute('title'),
        ariaLabel: element.getAttribute('aria-label'),
        pageTitle: document.title,
      }),
    };
  }

  function evaluate(element, { ignoreSize = false } = {}) {
    const kind = R.mediaKind(element);
    if (!kind || element === host) return null;
    if (!ignoreSize) {
      const seen = rejected.get(element);
      if (seen && Date.now() - seen < NEGATIVE_CACHE_MS) return null;
      const rect = element.getBoundingClientRect();
      const big = R.meetsSize({
        kind,
        renderedWidth: rect.width,
        renderedHeight: rect.height,
        naturalWidth: kind === 'image' ? element.naturalWidth : element.videoWidth,
        naturalHeight: kind === 'image' ? element.naturalHeight : element.videoHeight,
      });
      if (!big) { rejected.set(element, Date.now()); return null; }
    }
    if (R.elementOptsOut(element)) return null;
    const mediaUrl = mediaUrlOf(element, kind);
    if (kind === 'image' && !/^https?:\/\//i.test(mediaUrl)) return null;
    return describe(element, kind, mediaUrl);
  }

  function candidateAt(target, x, y) {
    const direct = target instanceof Element ? evaluate(target) : null;
    if (direct) return direct;
    if (typeof document.elementsFromPoint !== 'function') return null;
    for (const element of document.elementsFromPoint(x, y).slice(0, 8)) {
      if (element === host || !R.mediaKind(element)) continue;
      const found = evaluate(element);
      if (found) return found;
    }
    return null;
  }

  // ---------------------------------------------------------------- UI STYLES

  const STYLES = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    .pin-wrap, .pin-dropdown, .toast, .auth-tooltip {
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #f8f7fb;
      -webkit-font-smoothing: antialiased;
    }
    button, input { font-family: inherit; }

    /* The Pinterest Pin Widget */
    .pin-wrap {
      position: fixed;
      top: 0;
      left: 0;
      z-index: 2147483646;
      display: inline-flex;
      flex-direction: column;
      align-items: flex-start;
      filter: drop-shadow(0 8px 24px rgba(10, 6, 20, 0.55));
      animation: pinFadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* Dual-segment Pill Container */
    .pin-pill {
      display: inline-flex;
      align-items: center;
      height: 38px;
      background: #110e19;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15);
      transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
    }

    .pin-pill:hover {
      border-color: rgba(139, 92, 246, 0.6);
      box-shadow: 0 6px 20px rgba(124, 58, 237, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2);
    }

    /* Board Trigger (Left Segment) */
    .pin-board-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      height: 100%;
      padding: 0 11px 0 10px;
      background: transparent;
      border: 0;
      color: #f5f3fa;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      user-select: none;
      transition: background 0.12s ease;
      max-width: 175px;
    }

    .pin-board-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
    }

    .pin-brand-icon {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      flex-shrink: 0;
      display: block;
    }

    .pin-board-name {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      letter-spacing: -0.01em;
    }

    .pin-chevron-icon {
      width: 13px;
      height: 13px;
      color: #c4b5fd;
      flex-shrink: 0;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .pin-wrap.is-expanded .pin-chevron-icon {
      transform: rotate(180deg);
    }

    /* Vertical Divider */
    .pin-divider {
      width: 1px;
      height: 20px;
      background: rgba(255, 255, 255, 0.12);
      flex-shrink: 0;
    }

    /* Edit / Trim Video Segment (Middle Segment) */
    .pin-edit-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 0 11px;
      background: transparent;
      border: 0;
      color: #20d8ec;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.12s ease, color 0.12s ease;
    }

    .pin-edit-btn:hover {
      background: rgba(32, 216, 236, 0.16);
      color: #ffffff;
    }

    /* Save Button (Right Segment) */
    .pin-save-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 0 16px;
      background: #7c3aed;
      border: 0;
      color: #ffffff;
      font-size: 13.5px;
      font-weight: 800;
      letter-spacing: 0.01em;
      cursor: pointer;
      transition: background 0.15s ease, opacity 0.15s ease;
      white-space: nowrap;
    }

    .pin-save-btn:hover {
      background: #8b5cf6;
    }

    .pin-save-btn.is-saved {
      background: #16a34a !important;
      color: #ffffff;
    }

    .pin-save-btn:disabled {
      opacity: 0.85;
      cursor: default;
    }

    /* Small spinner */
    .pin-spinner {
      width: 13px;
      height: 13px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: pinSpin 0.7s linear infinite;
      margin-right: 5px;
    }

    /* Inline Video Trim Box inside Hover Dropdown */
    .pin-trim-box {
      padding: 10px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(124, 58, 237, 0.1);
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    .pin-trim-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11.5px;
      font-weight: 800;
      color: #e9d5ff;
    }
    .pin-trim-badge {
      font-size: 10.5px;
      font-weight: 700;
      color: #20d8ec;
      background: rgba(32, 216, 236, 0.14);
      padding: 2px 7px;
      border-radius: 99px;
    }
    .pin-trim-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: #cfc9db;
    }
    .pin-trim-label {
      width: 34px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .pin-trim-range {
      flex: 1;
      accent-color: #8b5cf6;
      cursor: pointer;
    }
    .pin-trim-set-btn {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.18);
      color: #fff;
      border-radius: 6px;
      padding: 2px 6px;
      font-size: 10px;
      font-weight: 700;
      cursor: pointer;
      flex-shrink: 0;
    }
    .pin-trim-set-btn:hover {
      background: #7c3aed;
    }
    .pin-trim-save-cta {
      width: 100%;
      height: 32px;
      background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
      border: 0;
      border-radius: 16px;
      color: #ffffff;
      font-size: 12px;
      font-weight: 800;
      cursor: pointer;
      margin-top: 2px;
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.45);
    }
    .pin-trim-save-cta:hover {
      background: linear-gradient(135deg, #8b5cf6 0%, #4f46e5 100%);
    }

    /* Expandable Dropdown Flyout (Pinterest Style) */
    .pin-dropdown {
      position: absolute;
      top: 44px;
      left: 0;
      width: 290px;
      max-height: 380px;
      background: #0f0b18;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 16px;
      box-shadow: 0 18px 48px rgba(0, 0, 0, 0.65), 0 0 24px rgba(124, 58, 237, 0.2);
      backdrop-filter: blur(20px);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: dropdownPop 0.16s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 2147483647;
    }

    /* Search input inside dropdown */
    .pin-dropdown-search {
      padding: 10px 10px 6px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      position: relative;
    }

    .pin-search-input {
      width: 100%;
      height: 34px;
      padding: 0 10px 0 30px;
      background: #181324;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 9px;
      color: #f8f7fb;
      font-size: 12.5px;
      outline: none;
      transition: border-color 0.15s ease;
    }

    .pin-search-input:focus {
      border-color: #8b5cf6;
      background: #1c162b;
    }

    .pin-search-icon {
      position: absolute;
      left: 19px;
      top: 19px;
      width: 14px;
      height: 14px;
      color: #9d94ab;
      pointer-events: none;
    }

    /* Boards scroll list */
    .pin-dropdown-scroll {
      flex: 1;
      overflow-y: auto;
      max-height: 260px;
      padding: 6px 4px 6px 6px;
    }

    .pin-dropdown-scroll::-webkit-scrollbar {
      width: 5px;
    }
    .pin-dropdown-scroll::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.18);
      border-radius: 4px;
    }

    .pin-section-title {
      font-size: 11px;
      font-weight: 700;
      color: #9d94ab;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 6px 8px 3px;
    }

    /* Board Row Item */
    .pin-board-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 6px 8px;
      border-radius: 10px;
      cursor: pointer;
      user-select: none;
      transition: background 0.12s ease;
    }

    .pin-board-row:hover {
      background: rgba(124, 58, 237, 0.22);
    }

    .pin-row-left {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex: 1;
    }

    .pin-row-icon {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: #1c162b;
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      flex-shrink: 0;
      overflow: hidden;
    }

    .pin-row-thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .pin-row-title {
      font-size: 13px;
      font-weight: 600;
      color: #f8f7fb;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Board save button on row */
    .pin-row-save-btn {
      height: 28px;
      padding: 0 12px;
      background: #7c3aed;
      border: 0;
      border-radius: 14px;
      color: #ffffff;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      flex-shrink: 0;
      transition: background 0.12s ease, transform 0.1s ease;
      opacity: 0.9;
    }

    .pin-board-row:hover .pin-row-save-btn {
      background: #8b5cf6;
      opacity: 1;
      transform: scale(1.03);
    }

    .pin-row-save-btn.is-saved {
      background: #16a34a !important;
    }

    /* Footer / Create Board */
    .pin-dropdown-footer {
      padding: 8px 10px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(15, 11, 24, 0.9);
    }

    .pin-create-btn {
      width: 100%;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px dashed rgba(255, 255, 255, 0.18);
      border-radius: 9px;
      color: #c4b5fd;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .pin-create-btn:hover {
      background: rgba(124, 58, 237, 0.18);
      border-color: #8b5cf6;
      color: #ffffff;
    }

    /* Sign-in required tooltip */
    .auth-tooltip {
      position: absolute;
      top: 44px;
      left: 0;
      width: 250px;
      padding: 12px 14px;
      background: #110e19;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 12px;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.55);
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .auth-tooltip-title {
      font-size: 13px;
      font-weight: 700;
      color: #ffffff;
    }

    .auth-tooltip-sub {
      font-size: 11.5px;
      color: #a7a1b5;
      line-height: 1.4;
    }

    .auth-connect-btn {
      height: 30px;
      background: #7c3aed;
      border: 0;
      border-radius: 8px;
      color: #ffffff;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .auth-connect-btn:hover { background: #8b5cf6; }

    /* Toast */
    .toast {
      position: fixed;
      right: 20px;
      bottom: 20px;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 12px;
      background: #100c18;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
      font-size: 13px;
      animation: pinFadeIn 0.16s ease-out;
    }

    .toast-ok {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #4ade80;
      flex-shrink: 0;
    }

    .toast-view-btn {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 6px;
      color: #c4b5fd;
      font-size: 11.5px;
      font-weight: 700;
      padding: 3px 8px;
      cursor: pointer;
    }

    .toast-view-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
    }

    [hidden] { display: none !important; }

    @keyframes pinFadeIn {
      from { opacity: 0; transform: translateY(-4px) scale(0.97); }
      to { opacity: 1; transform: none; }
    }

    @keyframes dropdownPop {
      from { opacity: 0; transform: translateY(-6px) scale(0.98); }
      to { opacity: 1; transform: none; }
    }

    @keyframes pinSpin {
      to { transform: rotate(360deg); }
    }
  `;

  // ---------------------------------------------------------------- Host & UI Init

  function ensureHost() {
    if (host && host.isConnected) return;
    document.getElementById(HOST_ID)?.remove();

    host = document.createElement('div');
    host.id = HOST_ID;
    host.setAttribute('data-pin', 'hidden');
    document.documentElement.appendChild(host);

    const root = host.attachShadow({ mode: 'closed' });
    const logoUrl = chrome.runtime.getURL('brand-mark.svg');
    const style = h('style', { text: STYLES });

    // Main Pin Elements
    const brandIcon = h('img', { className: 'pin-brand-icon', src: logoUrl, alt: '' });
    const boardLabel = h('span', { className: 'pin-board-name', text: 'All Boards' });
    const chevronSvg = h('svg', { className: 'pin-chevron-icon', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.5' }, [
      h('polyline', { points: '6 9 12 15 18 9' }),
    ]);

    const boardTrigger = h('button', {
      className: 'pin-board-btn',
      type: 'button',
      title: 'Choose a specific board',
      'aria-label': 'Choose a specific board',
    }, [brandIcon, boardLabel, chevronSvg]);

    const divider = h('div', { className: 'pin-divider' });
    const editBtn = h('button', {
      className: 'pin-edit-btn',
      type: 'button',
      title: 'Edit element, trim video, or capture frame',
      text: '✂️ Trim',
    });
    const divider2 = h('div', { className: 'pin-divider' });

    const saveText = h('span', { className: 'pin-save-text', text: 'Save' });
    const saveBtn = h('button', {
      className: 'pin-save-btn',
      type: 'button',
      title: 'Save to All Boards',
      'aria-label': 'Save to All Boards',
    }, [saveText]);

    const pinPill = h('div', { className: 'pin-pill' }, [boardTrigger, divider, editBtn, divider2, saveBtn]);

    // Dropdown Elements
    const searchIcon = h('svg', { className: 'pin-search-icon', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.5' }, [
      h('circle', { cx: '11', cy: '11', r: '8' }),
      h('line', { x1: '21', y1: '21', x2: '16.65', y2: '16.65' }),
    ]);
    const searchInput = h('input', {
      type: 'text',
      className: 'pin-search-input',
      placeholder: 'Search boards…',
      autocomplete: 'off',
    });
    const searchHeader = h('div', { className: 'pin-dropdown-search' }, [searchIcon, searchInput]);
    const scrollArea = h('div', { className: 'pin-dropdown-scroll' });
    const createBtn = h('button', { className: 'pin-create-btn', type: 'button', text: '+ Create board' });
    const dropdownFooter = h('div', { className: 'pin-dropdown-footer' }, [createBtn]);

    const dropdown = h('div', { className: 'pin-dropdown', hidden: true }, [
      searchHeader,
      scrollArea,
      dropdownFooter,
    ]);

    // Auth Tooltip
    const authTooltip = h('div', { className: 'auth-tooltip', hidden: true }, [
      h('div', { className: 'auth-tooltip-title', text: 'Sign in to save references' }),
      h('div', { className: 'auth-tooltip-sub', text: 'Connect your Animation Reference account to save references from any site.' }),
      h('button', { className: 'auth-connect-btn', type: 'button', text: 'Sign In' }),
    ]);

    const pinWrap = h('div', { className: 'pin-wrap', hidden: true }, [
      pinPill,
      dropdown,
      authTooltip,
    ]);

    const toast = h('div', { className: 'toast', role: 'status', hidden: true });

    root.append(style, pinWrap, toast);
    ui = {
      root,
      pinWrap,
      pinPill,
      boardTrigger,
      boardLabel,
      editBtn,
      saveBtn,
      saveText,
      dropdown,
      searchInput,
      scrollArea,
      createBtn,
      authTooltip,
      toast,
    };

    // Keep active on hover
    pinWrap.addEventListener('pointerenter', cancelHide);
    pinWrap.addEventListener('pointerleave', scheduleHide);

    // 1-Click Save button direct click: immediately saves to All Boards
    saveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      executeSave(activeBoard);
    });

    // Edit / Trim button click: opens the main plugin panel (off the video!) with the timeline ready
    editBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!current) return;
      closeDropdown();

      const el = current.element;
      let thumb = current.poster || (current.kind === 'image' ? current.mediaUrl : '');
      let domVideoId = '';

      if (current.kind === 'video' && el instanceof HTMLVideoElement) {
        domVideoId = el.getAttribute('data-animref-vid') || `video_pin_${Date.now()}`;
        el.setAttribute('data-animref-vid', domVideoId);
        el.setAttribute('data-animref-el', domVideoId);
        if (!thumb || String(thumb).startsWith('blob:')) {
          try {
            const vw = el.videoWidth || 320;
            const vh = el.videoHeight || 180;
            if (vw > 0 && vh > 0) {
              const canvas = document.createElement('canvas');
              const scale = Math.min(1, 480 / vw);
              canvas.width = Math.round(vw * scale);
              canvas.height = Math.round(vh * scale);
              canvas.getContext('2d').drawImage(el, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
              if (dataUrl && dataUrl.length > 1000) thumb = dataUrl;
            }
          } catch {}
        }
      } else if (el instanceof Element) {
        const elId = el.getAttribute('data-animref-el') || `el_pin_${Date.now()}`;
        el.setAttribute('data-animref-el', elId);
      }

      const v = el instanceof HTMLVideoElement ? el : null;
      const dur = v && Number.isFinite(v.duration) && v.duration > 0 ? Math.round(v.duration * 10) / 10 : (current.duration || 15);
      const curTime = v && Number.isFinite(v.currentTime) ? Number(v.currentTime.toFixed(1)) : 0;
      const rawUrl = current.mediaUrl || '';
      const isDirectVideoUrl = current.kind === 'video' && Boolean(rawUrl && !rawUrl.startsWith('blob:') && /\.(mp4|webm|mov)(\?|$)/i.test(rawUrl));

      const pickedItem = {
        id: domVideoId || `pin_${Date.now()}`,
        domVideoId: domVideoId || 'video_0',
        mediaUrl: rawUrl && !rawUrl.startsWith('blob:') ? rawUrl : (current.linkUrl || location.href),
        thumbnailUrl: thumb || rawUrl || '',
        sourceUrl: current.linkUrl || location.href,
        title: current.title || document.title || 'Selected Video Reference',
        isVideo: current.kind === 'video',
        isDirectVideoUrl,
        duration: dur,
        currentTime: curTime,
        elementLabel: current.kind === 'video' ? '🎬 Video (Trim in Plugin)' : '🖼️ Selected Image',
        authorName: current.authorName || '',
        authorUrl: current.authorUrl || '',
        authorAvatar: current.authorAvatar || '',
      };

      try {
        await chrome.storage.local.set({
          pendingPickedElement: { item: pickedItem, at: Date.now() },
          floatingPanelOpen: true,
        });
      } catch {}

      hidePin();
      await send({ type: 'AR_OPEN_WIDGET', item: pickedItem });
    });

    // Hover or Click on the pin board selector expands the Pinterest board dropdown
    boardTrigger.addEventListener('mouseenter', () => {
      openDropdown();
    });
    boardTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (dropdownOpen) closeDropdown();
      else openDropdown();
    });

    // Filtering boards in dropdown
    searchInput.addEventListener('input', (e) => {
      renderDropdownBoards(e.target.value);
    });

    // Create board action
    createBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const boardName = prompt('Enter a name for your new reference board:');
      if (!boardName || !boardName.trim()) return;

      createBtn.textContent = 'Creating…';
      try {
        const res = await send({
          type: 'AR_API',
          path: '/api/extension/boards',
          method: 'POST',
          body: { title: boardName.trim(), isPrivate: false },
        });
        createBtn.textContent = '+ Create board';
        const created = res?.data?.board || res?.board;
        if (res?.ok && created?.id) {
          const newBoard = { id: created.id, title: created.title || boardName.trim(), isPrivate: Boolean(created.isPrivate) };
          cachedBoards.unshift(newBoard);
          executeSave(newBoard);
        } else {
          // Fallback save with title
          executeSave({ id: '', title: boardName.trim() });
        }
      } catch {
        createBtn.textContent = '+ Create board';
      }
    });

    // Auth connect click
    authTooltip.querySelector('.auth-connect-btn')?.addEventListener('click', async () => {
      authTooltip.hidden = true;
      await send({ type: 'AR_START_CONNECT' });
    });
  }

  // ---------------------------------------------------------------- Dropdown Logic

  async function openDropdown() {
    if (!ui || dropdownOpen) return;
    dropdownOpen = true;
    ui.dropdown.hidden = false;
    ui.pinWrap.classList.add('is-expanded');
    setState('dropdown', 'open');

    // Pre-fill or fetch boards
    if (cachedBoards.length === 0) {
      ui.scrollArea.replaceChildren(h('div', { className: 'pin-section-title', text: 'Loading boards…' }));
      const [bootstrap, stored] = await Promise.all([
        send({ type: 'AR_QUICK_BOOTSTRAP' }),
        storageGet(['lastBoardId', 'lastBoardTitle']),
      ]);

      if (!bootstrap.ok) {
        if (bootstrap.status === 401) {
          ui.dropdown.hidden = true;
          ui.authTooltip.hidden = false;
          return;
        }
        ui.scrollArea.replaceChildren(h('div', { className: 'pin-section-title', text: 'Could not load boards.' }));
        return;
      }

      cachedBoards = bootstrap.data?.boards || [];
      if (stored?.lastBoardId && stored?.lastBoardTitle) {
        activeBoard = { id: stored.lastBoardId, title: stored.lastBoardTitle };
        ui.boardLabel.textContent = stored.lastBoardTitle;
      }
    }

    renderDropdownBoards(ui.searchInput.value);
  }

  function closeDropdown() {
    if (!ui) return;
    dropdownOpen = false;
    ui.dropdown.hidden = true;
    ui.authTooltip.hidden = true;
    ui.pinWrap.classList.remove('is-expanded');
    setState('dropdown', 'closed');
  }

  function renderDropdownBoards(filterText = '') {
    if (!ui) return;
    const q = filterText.toLowerCase().trim();
    ui.scrollArea.replaceChildren();

    // 1. Pinned Option: "📁 All Boards (Main collection)"
    const allRow = createBoardRow({ id: '', title: 'All Boards', isAll: true });
    ui.scrollArea.appendChild(allRow);

    const filtered = q
      ? cachedBoards.filter((b) => (b.title || '').toLowerCase().includes(q))
      : cachedBoards;

    if (filtered.length === 0 && q) {
      ui.scrollArea.appendChild(h('div', { className: 'pin-section-title', text: 'No matching boards.' }));
      return;
    }

    // Top Choices Section (Top 3)
    const topChoices = q ? [] : filtered.slice(0, 3);
    const remaining = q ? filtered : filtered.slice(3);

    if (topChoices.length > 0) {
      ui.scrollArea.appendChild(h('div', { className: 'pin-section-title', text: 'Top choices' }));
      topChoices.forEach((board) => ui.scrollArea.appendChild(createBoardRow(board)));
    }

    // All Boards Section
    if (remaining.length > 0) {
      ui.scrollArea.appendChild(h('div', { className: 'pin-section-title', text: 'All boards' }));
      remaining.forEach((board) => ui.scrollArea.appendChild(createBoardRow(board)));
    }
  }

  function createBoardRow(board) {
    const isAll = Boolean(board.isAll || !board.id);
    const titleText = isAll ? 'All Boards (Main collection)' : (board.isPrivate ? `🔒 ${board.title}` : board.title);

    // Thumbnail icon
    let iconEl;
    if (isAll) {
      iconEl = h('div', { className: 'pin-row-icon', text: '📁' });
    } else if (board.thumbnails?.[0]) {
      iconEl = h('div', { className: 'pin-row-icon' }, [
        h('img', { className: 'pin-row-thumb', src: board.thumbnails[0], alt: '' }),
      ]);
    } else {
      iconEl = h('div', { className: 'pin-row-icon', text: '🎨' });
    }

    const rowTitle = h('span', { className: 'pin-row-title', text: titleText });
    const rowLeft = h('div', { className: 'pin-row-left' }, [iconEl, rowTitle]);

    const saveBtn = h('button', {
      className: 'pin-row-save-btn',
      type: 'button',
      text: 'Save',
    });

    const row = h('div', { className: 'pin-board-row' }, [rowLeft, saveBtn]);

    row.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      executeSave(board, saveBtn);
    });

    return row;
  }

  // ---------------------------------------------------------------- Save Execution

  async function executeSave(board, targetBtn) {
    if (!current || isSaving) return;
    isSaving = true;

    const boardId = board?.id || '';
    const boardTitle = board?.title || 'All Boards';

    // Update active label and storage
    activeBoard = { id: boardId, title: boardTitle };
    if (ui) ui.boardLabel.textContent = boardTitle;
    storageSet({ lastBoardId: boardId, lastBoardTitle: boardTitle });

    // INSTANT 0ms OPTIMISTIC UI: immediately mark as Saved ✓ and show toast!
    if (ui) {
      ui.saveBtn.classList.add('is-saved');
      ui.saveText.textContent = 'Saved ✓';
    }
    if (targetBtn) {
      targetBtn.classList.add('is-saved');
      targetBtn.textContent = 'Saved ✓';
    }
    closeDropdown();
    showToast(boardId ? `✨ Saved to "${boardTitle}"` : '✨ Saved to All Boards', '', boardId);

    const rawMode = current.mode || R.saveMode({ kind: current.kind, mediaUrl: current.mediaUrl, pageUrl: location.href });
    const mode = rawMode === 'unsupported' ? 'link' : rawMode;

    let thumbToSend = current.poster || (current.kind === 'image' ? current.mediaUrl : undefined);
    if (current.kind === 'video' && (!thumbToSend || String(thumbToSend).startsWith('blob:')) && current.element instanceof HTMLVideoElement) {
      try {
        const vw = current.element.videoWidth || 320;
        const vh = current.element.videoHeight || 180;
        if (vw > 0 && vh > 0) {
          const canvas = document.createElement('canvas');
          const scale = Math.min(1, 480 / vw);
          canvas.width = Math.round(vw * scale);
          canvas.height = Math.round(vh * scale);
          canvas.getContext('2d').drawImage(current.element, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.84);
          if (dataUrl && dataUrl.length > 1000) thumbToSend = dataUrl;
        }
      } catch {}
    }

    const result = await send({
      type: 'AR_QUICK_SAVE',
      payload: {
        mode,
        kind: current.kind,
        mediaUrl: current.mediaUrl && !String(current.mediaUrl).startsWith('blob:') ? current.mediaUrl : undefined,
        sourceUrl: current.linkUrl || location.href,
        pageTitle: document.title,
        title: current.title,
        boardId,
        isPrivate: Boolean(board?.isPrivate),
        duration: current.duration,
        startTime: Number.isFinite(current.startTime) ? current.startTime : 0,
        endTime: Number.isFinite(current.endTime) ? current.endTime : current.duration,
        thumbnailUrl: thumbToSend,
        authorName: current.authorName || undefined,
        authorUrl: current.authorUrl || undefined,
        authorAvatar: current.authorAvatar || undefined,
      },
    });

    isSaving = false;

    if (!result.ok) {
      if (ui) {
        ui.saveBtn.classList.remove('is-saved');
        ui.saveBtn.disabled = false;
        ui.saveText.textContent = 'Save';
      }
      if (targetBtn) {
        targetBtn.classList.remove('is-saved');
        targetBtn.disabled = false;
        targetBtn.textContent = 'Save';
      }
      if (result.status === 401) {
        if (ui) ui.authTooltip.hidden = false;
      } else {
        showToast(result.error || 'Could not save reference. Try again.', '', boardId);
      }
      return;
    }

    setTimeout(() => {
      if (ui) {
        ui.saveBtn.classList.remove('is-saved');
        ui.saveBtn.disabled = false;
        ui.saveText.textContent = 'Save';
      }
    }, 2500);
  }

  // ---------------------------------------------------------------- Positioning & Visibility

  function positionPin() {
    if (!current?.element || !ui) return;
    const rect = current.element.getBoundingClientRect();
    const visible = current.element.isConnected && rect.width > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth;
    if (!visible) { hidePin(); return; }

    const left = Math.min(Math.max(rect.left, 0) + 12, innerWidth - 220);
    const top = Math.min(Math.max(rect.top, 0) + 12, innerHeight - 50);

    ui.pinWrap.style.left = `${Math.round(left)}px`;
    ui.pinWrap.style.top = `${Math.round(top)}px`;
  }

  function showPin(candidate) {
    ensureHost();
    cancelHide();
    current = candidate;
    positionPin();
    if (!current) return;

    ui.pinWrap.hidden = false;
    if (ui.editBtn) {
      ui.editBtn.textContent = candidate.kind === 'video' ? '✂️ Trim' : '✏️ Edit';
    }
    setState('pin', 'visible');
    setState('kind', candidate.kind);

    // Silently prefetch bootstrap in background so boards are ready instantly
    if (cachedBoards.length === 0) {
      send({ type: 'AR_QUICK_BOOTSTRAP' }).then((res) => {
        if (res?.ok && res.data?.boards) {
          cachedBoards = res.data.boards;
        }
      }).catch(() => {});
    }
  }

  function hidePin() {
    if (!ui || dropdownOpen) return;
    ui.pinWrap.hidden = true;
    setState('pin', 'hidden');
    current = null;
  }

  function scheduleHide() {
    if (hideTimer || dropdownOpen) return;
    hideTimer = window.setTimeout(() => {
      hideTimer = 0;
      hidePin();
    }, HIDE_DELAY_MS);
  }

  function cancelHide() {
    if (hideTimer) {
      window.clearTimeout(hideTimer);
      hideTimer = 0;
    }
  }

  function pointerInside(rect, x, y, pad = 0) {
    return x >= rect.left - pad && x <= rect.right + pad && y >= rect.top - pad && y <= rect.bottom + pad;
  }

  function showToast(message, clipId, boardId = '') {
    ensureHost();
    window.clearTimeout(toastTimer);
    ui.toast.replaceChildren(
      h('span', { className: 'toast-ok' }),
      h('span', { text: message }),
      h('button', {
        className: 'toast-view-btn',
        type: 'button',
        text: 'View Board ↗',
        onClick: () => {
          send({ type: 'AR_OPEN_BOARD', boardId: boardId || '' });
          ui.toast.hidden = true;
        },
      }),
    );
    ui.toast.hidden = false;
    setState('toast', message);
    toastTimer = window.setTimeout(() => {
      ui.toast.hidden = true;
      setState('toast', '');
    }, 5000);
  }

  // ---------------------------------------------------------------- Event Listeners

  document.addEventListener('pointerover', (event) => {
    if (dropdownOpen || event.pointerType === 'touch') return;
    if (host && event.target === host) { cancelHide(); return; }
    if (isPageOptedOut()) return;

    const candidate = candidateAt(event.target, event.clientX, event.clientY);
    if (candidate) {
      if (current?.element !== candidate.element) showPin(candidate);
      else cancelHide();
    }
  }, { capture: true, passive: true });

  document.addEventListener('pointermove', (event) => {
    if (!current || dropdownOpen || !ui || ui.pinWrap.hidden || moveFrame) return;
    const { clientX: x, clientY: y } = event;
    moveFrame = requestAnimationFrame(() => {
      moveFrame = 0;
      if (!current?.element) return;
      const inMedia = pointerInside(current.element.getBoundingClientRect(), x, y);
      const inPin = pointerInside(ui.pinWrap.getBoundingClientRect(), x, y, 6);
      if (inMedia || inPin) cancelHide();
      else scheduleHide();
    });
  }, { capture: true, passive: true });

  const reposition = () => {
    if (scrollFrame || !current || dropdownOpen) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      positionPin();
    });
  };
  window.addEventListener('scroll', reposition, { capture: true, passive: true });
  window.addEventListener('resize', reposition, { passive: true });
  window.addEventListener('blur', () => { if (!dropdownOpen) hidePin(); });

  document.addEventListener('pointerdown', (event) => {
    if (dropdownOpen && !event.composedPath().includes(host)) {
      closeDropdown();
    }
  }, true);

  document.addEventListener('keydown', (event) => {
    if (dropdownOpen && event.key === 'Escape') {
      closeDropdown();
    }
  }, true);

  // Remember context menu target
  document.addEventListener('contextmenu', (event) => {
    lastContext = { target: event.target, x: event.clientX, y: event.clientY, at: Date.now() };
  }, true);

  function findBySource(srcUrl) {
    if (!srcUrl) return null;
    for (const element of document.querySelectorAll('img, video')) {
      const kind = R.mediaKind(element);
      if (mediaUrlOf(element, kind) === srcUrl || element.getAttribute('src') === srcUrl) return element;
    }
    return null;
  }

  // Handle Right-Click Context Menu "Save to Animation Reference"
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'AR_SAVE_TARGET') return false;
    const recent = lastContext && Date.now() - lastContext.at < 15000 ? lastContext : null;

    if (message.mediaType === 'image' || message.mediaType === 'video') {
      let element = null;
      if (recent) {
        const near = recent.target instanceof Element && R.mediaKind(recent.target) ? recent.target
          : (document.elementsFromPoint?.(recent.x, recent.y) || []).find((node) => node !== host && R.mediaKind(node));
        if (near) element = near;
      }
      if (!element) element = findBySource(message.srcUrl);
      if (element && R.elementOptsOut(element)) {
        sendResponse({ ok: false, reason: 'opted-out' });
        showToast('Site asked not to save this item.', '');
        return false;
      }
      const candidate = element ? evaluate(element, { ignoreSize: true }) : null;
      const fallback = {
        element: null,
        kind: message.mediaType,
        mediaUrl: message.srcUrl || '',
        linkUrl: '',
        poster: message.mediaType === 'image' ? message.srcUrl || '' : '',
        title: R.suggestedTitle({ pageTitle: document.title }),
      };
      showPin(candidate || fallback);
      openDropdown();
      sendResponse({ ok: true });
      return false;
    }

    if (message.linkUrl) {
      showPin({
        element: null,
        kind: 'video',
        mediaUrl: '',
        linkUrl: message.linkUrl,
        mode: R.linkSaveMode(message.linkUrl),
        poster: '',
        title: R.suggestedTitle({ pageTitle: recent?.target?.textContent || document.title }),
      });
      openDropdown();
      sendResponse({ ok: true });
      return false;
    }

    sendResponse({ ok: false });
    return false;
  });
})();
