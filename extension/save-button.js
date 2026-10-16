/*
 * Hover "Save" button and quick-save popover for videos and images on any page.
 * Rules (sizes, opt-outs, excluded sites, save mode) live in save-rules.js.
 * All UI is inside a closed shadow root so pages can neither restyle nor read it.
 * The host element mirrors state in data-* attributes for debugging and tests.
 */
(() => {
  if (window.__animrefSaveButtonInstalled) return;
  window.__animrefSaveButtonInstalled = true;

  const R = globalThis.AR_SAVE_RULES;
  if (!R || R.isHostExcluded(location.hostname)) return;

  const HOST_ID = 'animref-save-host';
  const HIDE_DELAY_MS = 160;
  const NEGATIVE_CACHE_MS = 1500;
  const PAGE_OPT_OUT_TTL_MS = 3000;

  let host = null;
  let ui = null;
  let current = null;
  let popoverOpen = false;
  let hideTimer = 0;
  let moveFrame = 0;
  let scrollFrame = 0;
  let toastTimer = 0;
  let lastContext = null;
  let pageOptOut = { value: false, at: 0 };
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
          if (chrome.runtime.lastError) resolve({ ok: false, status: 0, error: 'The extension was updated. Reload this page and try again.' });
          else resolve(response || { ok: false, status: 0, error: 'No response from the extension.' });
        });
      } catch {
        resolve({ ok: false, status: 0, error: 'The extension was updated. Reload this page and try again.' });
      }
    });
  }

  function storageGet(keys) {
    return new Promise((resolve) => {
      try { chrome.storage.local.get(keys, (value) => resolve(value || {})); } catch { resolve({}); }
    });
  }

  function storageSet(value) {
    try { chrome.storage.local.set(value); } catch { /* old content script after an extension reload */ }
  }

  function sourceHost() {
    return location.hostname.replace(/^www\./, '');
  }

  function isPageOptedOut() {
    const now = Date.now();
    if (now - pageOptOut.at < PAGE_OPT_OUT_TTL_MS) return pageOptOut.value;
    const metas = [...document.querySelectorAll('meta[name]')].map((meta) => ({ name: meta.getAttribute('name'), content: meta.getAttribute('content') }));
    pageOptOut = { value: R.pageOptsOut(metas), at: now };
    return pageOptOut.value;
  }

  // ---------------------------------------------------------------- candidates

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

      // Extract specific post / reel url if on feed or explore
      const postAnchor = article?.querySelector('a[href*="/p/"], a[href*="/reel/"]');
      if (postAnchor) {
        try { postUrl = new URL(postAnchor.href, location.href).href; } catch {}
      }
      if (!postUrl && (location.pathname.startsWith('/p/') || location.pathname.startsWith('/reel/'))) {
        postUrl = location.href;
      }

      // Extract author handle from profile link in header
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

  /** A qualifying image or video, or null. Right-click saves pass ignoreSize. */
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
    // data: and blob: images can't be fetched as files; videos may still save by page link.
    if (kind === 'image' && !/^https?:\/\//i.test(mediaUrl)) return null;
    return describe(element, kind, mediaUrl);
  }

  /** The event target, or media sitting under an overlay (players often cover their <video>). */
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

  // ---------------------------------------------------------------- UI

  const STYLES = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    /* The host reset wipes inherited font and color, so every top-level piece sets its own. */
    .save, .popover, .toast { font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; color: #f5f3fa; }
    button, input, select { font-family: inherit; }
    .save {
      position: fixed; top: 0; left: 0; z-index: 2147483646;
      display: inline-flex; align-items: center; gap: 7px; height: 36px; padding: 0 15px 0 11px;
      border: 0; border-radius: 999px; background: #7c3aed; color: #fff;
      font: 700 14px/1 Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
      box-shadow: 0 6px 18px rgba(20, 8, 40, .45), inset 0 1px rgba(255,255,255,.25);
      cursor: pointer; transition: background .15s ease, box-shadow .15s ease;
    }
    /* Position comes from left/top, so hover effects must not use transform. */
    .save:hover { background: #8b5cf6; box-shadow: 0 8px 22px rgba(20, 8, 40, .55), inset 0 1px rgba(255,255,255,.3); }
    .save:focus-visible, button:focus-visible, select:focus-visible, input:focus-visible { outline: 3px solid #c4b5fd; outline-offset: 2px; }
    .save img { width: 18px; height: 18px; border-radius: 50%; display: block; }
    .popover {
      position: fixed; top: 0; left: 0; z-index: 2147483647; width: 320px; max-width: calc(100vw - 16px);
      border: 1px solid rgba(255,255,255,.14); border-radius: 16px; background: #100c18;
      box-shadow: 0 24px 60px rgba(0,0,0,.55); overflow: hidden; animation: pop .14s ease-out;
    }
    .head { display: flex; align-items: center; gap: 8px; padding: 11px 10px 11px 14px; border-bottom: 1px solid rgba(255,255,255,.09); font: 700 13px/1.2 inherit; }
    .head img { width: 20px; height: 20px; border-radius: 50%; }
    .head strong { flex: 1; font-size: 13px; }
    .x { width: 28px; height: 28px; border: 0; border-radius: 8px; background: transparent; color: #a7a1b5; font: 400 20px/1 Arial, sans-serif; cursor: pointer; }
    .x:hover { background: rgba(255,255,255,.08); color: #fff; }
    .body { padding: 14px; display: grid; gap: 12px; font-size: 13px; line-height: 1.45; }
    .preview { display: flex; gap: 10px; align-items: center; }
    .thumb { width: 64px; height: 48px; flex: none; border-radius: 8px; object-fit: cover; background: #1d1729; }
    .meta { min-width: 0; display: grid; gap: 2px; }
    .kind { font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #c4b5fd; }
    .from { color: #a7a1b5; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    label.field { display: grid; gap: 5px; font-size: 12px; font-weight: 600; color: #cfc9db; }
    input[type="text"], select {
      width: 100%; height: 36px; padding: 0 10px; border: 1px solid rgba(255,255,255,.14); border-radius: 9px;
      background: #0a0810; color: #f5f3fa; font: 400 13px/1 inherit;
    }
    .note { margin: 0; color: #a7a1b5; font-size: 12px; }
    .rights { display: flex; gap: 8px; align-items: flex-start; font-size: 12px; color: #cfc9db; }
    .rights input { margin-top: 2px; accent-color: #7c3aed; }
    .rights a { color: #c4b5fd; }
    .actions { display: flex; gap: 8px; justify-content: flex-end; }
    .primary, .ghost { height: 36px; padding: 0 14px; border-radius: 9px; font: 700 13px/1 inherit; cursor: pointer; }
    .primary { border: 0; background: #7c3aed; color: #fff; }
    .primary:hover { background: #8b5cf6; }
    .primary:disabled { opacity: .55; cursor: default; }
    .ghost { border: 1px solid rgba(255,255,255,.16); background: transparent; color: #f5f3fa; }
    .error { margin: 0; color: #fca5a5; font-size: 12px; }
    .toast {
      position: fixed; right: 20px; bottom: 20px; z-index: 2147483647; display: flex; align-items: center; gap: 12px;
      padding: 10px 10px 10px 14px; border: 1px solid rgba(255,255,255,.14); border-radius: 12px; background: #100c18;
      box-shadow: 0 16px 40px rgba(0,0,0,.5); font-size: 13px; animation: pop .14s ease-out;
    }
    .toast .ok { width: 8px; height: 8px; border-radius: 50%; background: #4ade80; }
    [hidden] { display: none !important; }
    @keyframes pop { from { opacity: 0; transform: translateY(4px) scale(.98); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { .save, .popover, .toast { transition: none; animation: none; } }
  `;

  function ensureHost() {
    if (host && host.isConnected) return;
    // A host left by a previous version of the extension can't take a second shadow root.
    document.getElementById(HOST_ID)?.remove();
    host = document.createElement('div');
    host.id = HOST_ID;
    host.setAttribute('data-button', 'hidden');
    host.setAttribute('data-popover', 'closed');
    document.documentElement.appendChild(host);
    const root = host.attachShadow({ mode: 'closed' });
    const logo = chrome.runtime.getURL('icon-48.png');
    const style = h('style', { text: STYLES });
    const button = h('button', { className: 'save', type: 'button', title: 'Save to Animation Reference', 'aria-label': 'Save to Animation Reference', hidden: true },
      [h('img', { src: logo, alt: '' }), h('span', { text: 'Save' })]);
    const body = h('div', { className: 'body' });
    const close = h('button', { className: 'x', type: 'button', 'aria-label': 'Close', text: '×' });
    const popover = h('div', { className: 'popover', role: 'dialog', 'aria-label': 'Save to Animation Reference', hidden: true },
      [h('div', { className: 'head' }, [h('img', { src: logo, alt: '' }), h('strong', { text: 'Save to Animation Reference' }), close]), body]);
    const toast = h('div', { className: 'toast', role: 'status', hidden: true });
    root.append(style, button, popover, toast);
    ui = { root, button, popover, body, toast, close };

    button.addEventListener('pointerenter', cancelHide);
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (current) openPopover(current, button.getBoundingClientRect());
    });
    close.addEventListener('click', closePopover);
    popover.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { event.stopPropagation(); closePopover(); }
    });
  }

  // ---------------------------------------------------------------- button

  function positionButton() {
    if (!current?.element || !ui) return;
    const rect = current.element.getBoundingClientRect();
    const visible = current.element.isConnected && rect.width > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth;
    if (!visible) { hideButton(); return; }
    const left = Math.min(Math.max(rect.left, 0) + 10, innerWidth - 110);
    const top = Math.min(Math.max(rect.top, 0) + 10, innerHeight - 46);
    ui.button.style.left = `${Math.round(left)}px`;
    ui.button.style.top = `${Math.round(top)}px`;
  }

  function showButton(candidate) {
    ensureHost();
    cancelHide();
    current = candidate;
    positionButton();
    if (!current) return;
    ui.button.hidden = false;
    setState('button', 'visible');
    setState('kind', candidate.kind);
  }

  function hideButton() {
    if (!ui) return;
    ui.button.hidden = true;
    setState('button', 'hidden');
    if (!popoverOpen) current = null;
  }

  function scheduleHide() {
    if (hideTimer) return;
    hideTimer = window.setTimeout(() => { hideTimer = 0; hideButton(); }, HIDE_DELAY_MS);
  }

  function cancelHide() {
    if (hideTimer) { window.clearTimeout(hideTimer); hideTimer = 0; }
  }

  function pointerInside(rect, x, y, pad = 0) {
    return x >= rect.left - pad && x <= rect.right + pad && y >= rect.top - pad && y <= rect.bottom + pad;
  }

  // ---------------------------------------------------------------- popover

  function placePopover(anchor) {
    const width = Math.min(320, innerWidth - 16);
    const height = ui.popover.offsetHeight || 360;
    const left = Math.min(Math.max(8, anchor.left), innerWidth - width - 8);
    let top = anchor.bottom + 8;
    if (top + height > innerHeight - 8) top = Math.max(8, anchor.top - height - 8);
    // left/top rather than transform: the open animation owns transform.
    ui.popover.style.left = `${Math.round(left)}px`;
    ui.popover.style.top = `${Math.round(top)}px`;
  }

  function renderBody(children) {
    ui.body.replaceChildren(...[].concat(children).filter(Boolean));
  }

  function previewRow(candidate) {
    const thumbUrl = candidate.poster && /^https?:\/\//i.test(candidate.poster) ? candidate.poster : '';
    const creatorText = candidate.authorName
      ? `${candidate.authorName} • ${sourceHost()}`
      : `From ${sourceHost()}`;
    return h('div', { className: 'preview' }, [
      thumbUrl ? h('img', { className: 'thumb', src: thumbUrl, alt: '', referrerPolicy: 'no-referrer' }) : h('div', { className: 'thumb' }),
      h('div', { className: 'meta' }, [
        h('span', { className: 'kind', text: candidate.kind === 'video' ? 'Video' : 'Image' }),
        h('span', { className: 'from', text: creatorText }),
      ]),
    ]);
  }

  async function openPopover(candidate, anchor) {
    ensureHost();
    cancelHide();
    current = candidate;
    popoverOpen = true;
    ui.popover.hidden = false;
    setState('popover', 'open');
    ui.button.hidden = true;
    setState('button', 'hidden');

    const mode = candidate.mode || R.saveMode({ kind: candidate.kind, mediaUrl: candidate.mediaUrl, pageUrl: location.href });
    candidate.mode = mode;

    if (mode === 'unsupported') {
      setState('status', 'unsupported');
      renderBody([
        previewRow(candidate),
        h('p', { className: 'note', text: candidate.linkUrl
          ? 'Only links to video posts on YouTube, Instagram, TikTok, Vimeo, X, Facebook and Sakugabooru can be saved this way.'
          : 'This video streams in pieces, so it can’t be saved directly. Open the capture panel to save it from its post link.' }),
        h('div', { className: 'actions' }, [
          h('button', { className: 'ghost', type: 'button', text: 'Close', onClick: closePopover }),
          candidate.linkUrl ? null : h('button', { className: 'primary', type: 'button', text: 'Open capture panel', onClick: () => { send({ type: 'AR_OPEN_WIDGET' }); closePopover(); } }),
        ]),
      ]);
      placePopover(anchor);
      return;
    }

    setState('status', 'loading');
    renderBody([previewRow(candidate), h('p', { className: 'note', text: 'Loading your boards…' })]);
    placePopover(anchor);

    const [bootstrap, stored] = await Promise.all([send({ type: 'AR_QUICK_BOOTSTRAP' }), storageGet(['lastBoardId', 'saveRightsConfirmed'])]);
    if (!popoverOpen || current !== candidate) return;

    if (!bootstrap.ok) {
      if (bootstrap.status === 401) {
        setState('status', 'needs-connect');
        renderBody([
          previewRow(candidate),
          h('p', { className: 'note', text: 'Connect your Animation Reference account to save references from any site.' }),
          h('div', { className: 'actions' }, [
            h('button', { className: 'ghost', type: 'button', text: 'Not now', onClick: closePopover }),
            h('button', { className: 'primary', type: 'button', text: 'Connect account', onClick: async () => {
              await send({ type: 'AR_START_CONNECT' });
              renderBody([previewRow(candidate), h('p', { className: 'note', text: 'Finish signing in in the new tab, then click Save again.' })]);
            } }),
          ]),
        ]);
      } else {
        setState('status', 'error');
        renderBody([previewRow(candidate), h('p', { className: 'error', text: bootstrap.error || 'Animation Reference could not be reached. Try again in a moment.' })]);
      }
      placePopover(anchor);
      return;
    }

    renderForm(candidate, bootstrap.data || {}, stored, anchor);
  }

  function renderForm(candidate, data, stored, anchor) {
    const canPrivate = Boolean(data.capabilities?.privateBoards);
    const boards = (data.boards || []).filter((board) => canPrivate || !board.isPrivate);
    const initialBoard = boards.find((board) => board.id === stored.lastBoardId)?.id || boards[0]?.id || '';
    const needsRights = !stored.saveRightsConfirmed;

    const titleInput = h('input', { type: 'text', id: 'ar-title', value: candidate.title, maxLength: 120, autocomplete: 'off' });
    const boardSelect = h('select', { id: 'ar-board' }, [
      ...boards.map((board) => h('option', { value: board.id, text: board.isPrivate ? `${board.title} (private)` : board.title })),
      h('option', { value: '', text: 'No board' }),
    ]);
    boardSelect.value = initialBoard;
    const note = h('p', { className: 'note' });
    const rights = needsRights ? h('input', { type: 'checkbox', id: 'ar-rights' }) : null;
    const errorLine = h('p', { className: 'error', hidden: true, role: 'alert' });
    const saveButton = h('button', { className: 'primary', type: 'submit', text: 'Save' });

    const selectedBoard = () => boards.find((board) => board.id === boardSelect.value) || null;
    const updateNote = () => {
      const board = selectedBoard();
      note.textContent = board?.isPrivate
        ? 'Private board: only you can see this save.'
        : `Shared with the community and credited to ${sourceHost()}.`;
    };
    const updateSaveEnabled = () => { saveButton.disabled = Boolean(rights && !rights.checked); };
    boardSelect.addEventListener('change', updateNote);
    rights?.addEventListener('change', updateSaveEnabled);
    updateNote();
    updateSaveEnabled();

    const form = h('form', { className: 'body', style: 'padding:0' }, [
      previewRow(candidate),
      h('label', { className: 'field', htmlFor: 'ar-title' }, [h('span', { text: 'Title' }), titleInput]),
      h('label', { className: 'field', htmlFor: 'ar-board' }, [h('span', { text: 'Board' }), boardSelect]),
      note,
      rights ? h('label', { className: 'rights', htmlFor: 'ar-rights' }, [
        rights,
        h('span', {}, [
          document.createTextNode('I have the right to share this, and I agree to the '),
          h('a', { href: 'https://animationreference.org/terms', target: '_blank', rel: 'noopener', text: 'Terms' }),
          document.createTextNode(' and '),
          h('a', { href: 'https://animationreference.org/dmca', target: '_blank', rel: 'noopener', text: 'copyright policy' }),
          document.createTextNode('.'),
        ]),
      ]) : null,
      errorLine,
      h('div', { className: 'actions' }, [h('button', { className: 'ghost', type: 'button', text: 'Cancel', onClick: closePopover }), saveButton]),
    ]);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (rights && !rights.checked) return;
      const board = selectedBoard();
      saveButton.disabled = true;
      saveButton.textContent = candidate.mode === 'file' && candidate.kind === 'video' ? 'Uploading video…' : 'Saving…';
      errorLine.hidden = true;
      setState('status', 'saving');

      const result = await send({
        type: 'AR_QUICK_SAVE',
        payload: {
          mode: candidate.mode,
          kind: candidate.kind,
          mediaUrl: candidate.mediaUrl,
          sourceUrl: candidate.linkUrl || location.href,
          pageTitle: document.title,
          title: titleInput.value.trim() || candidate.title,
          boardId: board?.id || '',
          isPrivate: Boolean(board?.isPrivate),
          duration: candidate.duration,
          thumbnailUrl: candidate.poster || undefined,
          authorName: candidate.authorName || undefined,
          authorUrl: candidate.authorUrl || undefined,
          authorAvatar: candidate.authorAvatar || undefined,
        },
      });
      if (!popoverOpen) return;

      if (!result.ok) {
        setState('status', 'error');
        errorLine.textContent = result.error || 'The save didn’t go through. Try again.';
        errorLine.hidden = false;
        saveButton.disabled = false;
        saveButton.textContent = 'Save';
        return;
      }

      storageSet({ lastBoardId: board?.id || '', saveRightsConfirmed: true });
      setState('status', 'saved');
      closePopover();
      showToast(board ? `Saved to ${board.title}` : 'Saved to your references', result.data?.id || result.data?.clip?.id || '');
    });

    ui.body.replaceChildren(form);
    setState('status', 'ready');
    placePopover(anchor);
    titleInput.focus({ preventScroll: true });
    titleInput.select();
  }

  function closePopover() {
    if (!ui) return;
    popoverOpen = false;
    ui.popover.hidden = true;
    setState('popover', 'closed');
    current = null;
  }

  function showToast(message, clipId) {
    ensureHost();
    window.clearTimeout(toastTimer);
    ui.toast.replaceChildren(
      h('span', { className: 'ok' }),
      h('span', { text: message }),
      clipId ? h('button', { className: 'ghost', type: 'button', text: 'View', onClick: () => { send({ type: 'AR_OPEN_CLIP', clipId }); ui.toast.hidden = true; } }) : null,
    );
    ui.toast.hidden = false;
    setState('toast', message);
    toastTimer = window.setTimeout(() => { ui.toast.hidden = true; setState('toast', ''); }, 6000);
  }

  // ---------------------------------------------------------------- events

  document.addEventListener('pointerover', (event) => {
    if (popoverOpen || event.pointerType === 'touch') return;
    if (host && event.target === host) { cancelHide(); return; }
    if (isPageOptedOut()) return;
    const candidate = candidateAt(event.target, event.clientX, event.clientY);
    if (candidate) {
      if (current?.element !== candidate.element) showButton(candidate);
      else cancelHide();
    }
  }, { capture: true, passive: true });

  document.addEventListener('pointermove', (event) => {
    if (!current || popoverOpen || !ui || ui.button.hidden || moveFrame) return;
    const { clientX: x, clientY: y } = event;
    moveFrame = requestAnimationFrame(() => {
      moveFrame = 0;
      if (!current?.element) return;
      const inMedia = pointerInside(current.element.getBoundingClientRect(), x, y);
      const inButton = pointerInside(ui.button.getBoundingClientRect(), x, y, 4);
      if (inMedia || inButton) cancelHide();
      else scheduleHide();
    });
  }, { capture: true, passive: true });

  const reposition = () => {
    if (scrollFrame || !current || popoverOpen) return;
    scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; positionButton(); });
  };
  window.addEventListener('scroll', reposition, { capture: true, passive: true });
  window.addEventListener('resize', reposition, { passive: true });
  window.addEventListener('blur', () => { if (!popoverOpen) hideButton(); });

  document.addEventListener('pointerdown', (event) => {
    if (popoverOpen && !event.composedPath().includes(host)) closePopover();
  }, true);

  document.addEventListener('keydown', (event) => {
    if (popoverOpen && event.key === 'Escape') closePopover();
  }, true);

  // Remember what was right-clicked, so a context-menu save anchors to it.
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

  function contextAnchor(element) {
    if (element) {
      const rect = element.getBoundingClientRect();
      const top = Math.min(Math.max(rect.top, 0) + 10, innerHeight - 60);
      const left = Math.min(Math.max(rect.left, 0) + 10, innerWidth - 60);
      return { left, top, right: left, bottom: top };
    }
    const x = lastContext?.x ?? innerWidth / 2;
    const y = lastContext?.y ?? 80;
    return { left: x, top: y, right: x, bottom: y };
  }

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
        showToast('This site asked not to have this saved.', '');
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
      openPopover(candidate || fallback, contextAnchor(element));
      sendResponse({ ok: true });
      return false;
    }

    if (message.linkUrl) {
      openPopover({
        element: null,
        kind: 'video',
        mediaUrl: '',
        linkUrl: message.linkUrl,
        mode: R.linkSaveMode(message.linkUrl),
        poster: '',
        title: R.suggestedTitle({ pageTitle: recent?.target?.textContent || document.title }),
      }, contextAnchor(null));
      sendResponse({ ok: true });
      return false;
    }

    sendResponse({ ok: false });
    return false;
  });
})();
