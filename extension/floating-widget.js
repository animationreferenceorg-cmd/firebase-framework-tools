(() => {
  const HOST_ID = 'animation-reference-floating-widget';
  const OPEN_KEY = 'floatingPanelOpen';
  const POSITION_KEY = 'floatingWidgetPosition';

  const existingHost = document.getElementById(HOST_ID);
  if (existingHost) existingHost.remove();

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.setAttribute('aria-label', 'Animation Reference capture widget');
  document.documentElement.appendChild(host);

  const root = host.attachShadow({ mode: 'closed' });
  root.innerHTML = `
    <style>
      :host { all: initial; }
      * { box-sizing: border-box; }
      .launcher-wrap {
        position: fixed; top: 18px; right: 18px; z-index: 2147483647;
        width: 64px; height: 64px;
        transition: transform .18s ease;
      }
      .launcher-wrap:hover { transform: translateY(-2px); }
      .launcher {
        width: 100%; height: 100%; display: grid; place-items: center;
        overflow: hidden; border: 1px solid rgba(255,255,255,.28); border-radius: 999px;
        background: #08070d; color: white;
        box-shadow: 0 12px 30px rgba(34,16,63,.4), inset 0 1px rgba(255,255,255,.22), 0 0 0 2px rgba(124,58,237,.7);
        font: 900 14px/1 Inter, ui-sans-serif, system-ui, sans-serif;
        letter-spacing: -.02em; cursor: pointer;
        transition: box-shadow .18s ease;
      }
      .launcher-wrap:hover .launcher { box-shadow: 0 16px 34px rgba(34,16,63,.5), 0 0 0 6px rgba(139,92,246,.15); }
      .bubble-close-btn {
        position: absolute;
        top: -3px;
        right: -3px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #000000;
        color: #ffffff;
        border: 1.5px solid rgba(255, 255, 255, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        padding: 0;
        z-index: 10;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
        transition: transform .15s ease, background-color .15s ease, border-color .15s ease;
      }
      .bubble-close-btn:hover {
        background: #1c1629;
        border-color: #ffffff;
        transform: scale(1.18);
        color: #ff6b81;
      }
      .bubble-close-btn:active {
        transform: scale(0.92);
      }
      .bubble-close-svg {
        width: 10px;
        height: 10px;
        stroke: currentColor;
        stroke-width: 3;
        fill: none;
      }
      .launcher:focus-visible, .close:focus-visible, .bubble-close-btn:focus-visible { outline: 3px solid rgba(196,181,253,.9); outline-offset: 3px; }
      .panel {
        position: fixed; top: 18px; right: 18px; z-index: 2147483647;
        width: min(400px, calc(100vw - 36px)); height: min(720px, calc(100vh - 36px));
        overflow: hidden; border: 1px solid rgba(255,255,255,.18); border-radius: 18px;
        background: #09070d; box-shadow: 0 24px 70px rgba(0,0,0,.52);
        font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        transform-origin: top right; animation: appear .18s ease-out;
      }
      .panel[hidden], .launcher-wrap[hidden] { display: none; }
      .panel-header { height: 48px; display: flex; align-items: center; gap: 9px; padding: 0 10px 0 14px; border-bottom: 1px solid rgba(255,255,255,.1); background: #100c17; color: #f8f7fb; cursor: grab; touch-action: none; user-select: none; }
      .panel-header:active { cursor: grabbing; }
      .brand-logo { width: 100%; height: 100%; display: block; object-fit: cover; transform: scale(1.15); pointer-events: none; }
      .mini-mark { width: 25px; height: 25px; display: grid; place-items: center; border-radius: 50%; background: #08070d; overflow: hidden; }
      .mini-mark img { width: 100%; height: 100%; display: block; object-fit: cover; }
      .mini-mark .mini-logo { transform: scale(1.15); }
      .mini-mark .profile-avatar[hidden] { display: none; }
      .mini-mark.has-avatar .mini-logo { display: none; }
      .title { flex: 1; font: 750 12px/1 Inter, ui-sans-serif, system-ui, sans-serif; }
      .close { width: 30px; height: 30px; display: grid; place-items: center; border: 0; border-radius: 9px; background: transparent; color: #aaa3b2; font: 400 22px/1 Arial, sans-serif; cursor: pointer; }
      .close:hover { background: rgba(255,255,255,.09); color: white; }
      iframe { display: block; width: 100%; height: calc(100% - 48px); border: 0; background: #09070d; }
      @keyframes appear { from { opacity: 0; transform: translateY(-5px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @media (max-width: 460px) {
        .launcher-wrap { top: 10px; right: 10px; width: 58px; height: 58px; }
        .bubble-close-btn { width: 18px; height: 18px; top: -2px; right: -2px; }
        .panel { top: 8px; right: 8px; width: calc(100vw - 16px); height: calc(100vh - 16px); }
      }
      @media (prefers-reduced-motion: reduce) { .launcher-wrap { transition: none; } .panel { animation: none; } }
    </style>
    <div class="launcher-wrap" title="Animation Reference">
      <button class="launcher" type="button" title="Open Animation Reference" aria-label="Open Animation Reference capture panel">
        <img class="brand-logo" src="${chrome.runtime.getURL('icon-128.png')}" alt="" />
      </button>
      <button class="bubble-close-btn" type="button" title="Delete / Hide Bubble" aria-label="Hide Animation Reference bubble">
        <svg class="bubble-close-svg" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
    <aside class="panel" hidden aria-label="Animation Reference capture panel">
      <div class="panel-header">
        <span class="mini-mark" title="Your Animation Reference account">
          <img class="mini-logo" src="${chrome.runtime.getURL('icon-128.png')}" alt="" />
          <img class="profile-avatar" hidden alt="" referrerpolicy="no-referrer" />
        </span>
        <span class="title">Animation Reference</span>
        <button class="close" type="button" title="Collapse to bubble" aria-label="Collapse to Animation Reference bubble">−</button>
      </div>
      <iframe title="Animation Reference Clip & Save" src="${chrome.runtime.getURL('popup.html?embedded=1&t=' + Date.now())}"></iframe>
    </aside>
  `;

  const launcherWrap = root.querySelector('.launcher-wrap');
  const launcher = root.querySelector('.launcher');
  const bubbleCloseBtn = root.querySelector('.bubble-close-btn');
  const panel = root.querySelector('.panel');
  const closeButton = root.querySelector('.close');
  const panelHeader = root.querySelector('.panel-header');
  const miniMark = root.querySelector('.mini-mark');
  const profileAvatar = root.querySelector('.profile-avatar');
  const iframe = root.querySelector('iframe');
  let hasDragged = false;
  let currentPosition = null;
  let isDismissed = false;
  try {
    isDismissed = sessionStorage.getItem('animref_bubble_dismissed') === '1';
  } catch {}

  function writeStorage(value) {
    try {
      chrome.storage.local.set(value);
    } catch {
      // A page can retain an old content script briefly after the extension reloads.
    }
  }

  function applyPosition(position) {
    if (!position || !Number.isFinite(position.right) || !Number.isFinite(position.top)) return;
    const maxRight = Math.max(8, window.innerWidth - 64);
    const right = Math.min(Math.max(8, position.right), maxRight);
    const maxTop = Math.max(8, window.innerHeight - 64);
    const top = Math.min(Math.max(8, position.top), maxTop);
    currentPosition = { right, top };
    const panelWidth = Math.min(400, Math.max(0, window.innerWidth - 36));
    const panelRight = Math.min(right, Math.max(8, window.innerWidth - panelWidth - 8));
    launcherWrap.style.left = 'auto';
    launcherWrap.style.top = `${top}px`;
    launcherWrap.style.right = `${right}px`;
    panel.style.left = 'auto';
    panel.style.top = `${top}px`;
    panel.style.right = `${panelRight}px`;
  }

  function makeDraggable(handle) {
    handle.addEventListener('pointerdown', (event) => {
      const targetElement = event.target instanceof Element ? event.target : null;
      if (event.button !== 0 || targetElement?.closest('button.close') || targetElement?.closest('.bubble-close-btn')) return;
      const target = panel.hidden ? launcherWrap : panel;
      const bounds = target.getBoundingClientRect();
      const offsetX = event.clientX - bounds.left;
      const offsetY = event.clientY - bounds.top;
      let moved = false;
      try {
        if (typeof handle.setPointerCapture === 'function') handle.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture is optional; dragging still works with the event listeners below.
      }

      const move = (moveEvent) => {
        const left = Math.min(Math.max(8, moveEvent.clientX - offsetX), Math.max(8, window.innerWidth - bounds.width - 8));
        const top = Math.min(Math.max(8, moveEvent.clientY - offsetY), Math.max(8, window.innerHeight - bounds.height - 8));
        applyPosition({ right: window.innerWidth - left - bounds.width, top });
        moved = true;
      };
      const stop = () => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', stop);
        handle.removeEventListener('pointercancel', stop);
        if (!moved) return;
        hasDragged = true;
        writeStorage({ [POSITION_KEY]: currentPosition });
        setTimeout(() => { hasDragged = false; }, 0);
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', stop);
      handle.addEventListener('pointercancel', stop);
    });
  }

  function render(isOpen) {
    panel.hidden = !isOpen;
    launcherWrap.hidden = isOpen || isDismissed;
  }

  function setOpen(isOpen) {
    if (isOpen) isDismissed = false;
    render(isOpen);
    writeStorage({ [OPEN_KEY]: isOpen });
  }

  function setProfileAvatar(avatarUrl, displayName) {
    if (!avatarUrl) return;
    profileAvatar.alt = displayName ? `${displayName}'s profile picture` : 'Your profile picture';
    profileAvatar.onload = () => {
      profileAvatar.hidden = false;
      miniMark.classList.add('has-avatar');
    };
    profileAvatar.onerror = () => {
      profileAvatar.hidden = true;
      miniMark.classList.remove('has-avatar');
    };
    profileAvatar.src = avatarUrl;
  }

  launcher.addEventListener('click', (e) => {
    if (hasDragged) return;
    setOpen(true);
  });

  bubbleCloseBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    isDismissed = true;
    launcherWrap.hidden = true;
    try {
      sessionStorage.setItem('animref_bubble_dismissed', '1');
    } catch {}
  });

  closeButton.addEventListener('click', () => {
    isDismissed = false;
    try {
      sessionStorage.removeItem('animref_bubble_dismissed');
    } catch {}
    setOpen(false);
  });
  makeDraggable(launcher);
  makeDraggable(panelHeader);
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === 'AR_WIDGET_OPEN') {
      isDismissed = false;
      try {
        sessionStorage.removeItem('animref_bubble_dismissed');
      } catch {}
      setOpen(true);
      if (message.item && iframe?.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'AR_SELECT_FOR_TRIM', item: message.item }, '*');
      }
    }
    if (message?.type === 'AR_PROFILE_UPDATED') setProfileAvatar(message.avatarUrl, message.displayName);
  });
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'AR_CLOSE_WIDGET') setOpen(false);
    if (event.data?.type === 'AR_CONNECT_POST_MESSAGE') {
      try {
        chrome.runtime.sendMessage({
          type: 'AR_CONNECT',
          token: event.data.token,
          refreshToken: event.data.refreshToken,
          tokenExpiresAt: event.data.tokenExpiresAt,
          firebaseApiKey: event.data.firebaseApiKey,
          origin: window.location.origin,
        }, (res) => {
          window.postMessage({ type: 'AR_CONNECT_POST_MESSAGE_ACK', ok: res?.ok ?? true }, '*');
        });
      } catch (err) {
        // ignore bridge dispatch error
      }
    }
  });
  try {
    chrome.storage.local.get({ [OPEN_KEY]: false, [POSITION_KEY]: null }, (value = {}) => {
      applyPosition(value[POSITION_KEY]);
      render(Boolean(value[OPEN_KEY]));
    });
  } catch {
    render(false);
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[OPEN_KEY]) render(Boolean(changes[OPEN_KEY].newValue));
  });
})();
