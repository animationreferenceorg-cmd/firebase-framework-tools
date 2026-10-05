/**
 * Decides which mounted VideoPlayer receives keyboard shortcuts.
 *
 * Players listen on `window`, and a page can mount many (every clip card has
 * one). Only one should react to a key: the player in native fullscreen, else
 * the one under the pointer, else the largest one visible in the viewport.
 */

const players = new Map<symbol, () => HTMLElement | null>();
let hovered: symbol | null = null;

export function registerPlayer(id: symbol, getElement: () => HTMLElement | null): () => void {
  players.set(id, getElement);
  return () => {
    players.delete(id);
    if (hovered === id) hovered = null;
  };
}

export function setHoveredPlayer(id: symbol, isHovered: boolean): void {
  if (isHovered) hovered = id;
  else if (hovered === id) hovered = null;
}

function visibleArea(el: HTMLElement): number {
  const r = el.getBoundingClientRect();
  const w = Math.max(0, Math.min(r.right, window.innerWidth) - Math.max(r.left, 0));
  const h = Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0));
  return w * h;
}

export function isKeyboardTarget(id: symbol): boolean {
  const el = players.get(id)?.();
  if (!el || !el.isConnected) return false;

  const fullscreen = document.fullscreenElement;
  if (fullscreen) return fullscreen.contains(el);

  if (hovered && players.get(hovered)?.()?.isConnected) return hovered === id;

  let best: symbol | null = null;
  let bestArea = 0;
  players.forEach((getEl, key) => {
    const candidate = getEl();
    if (!candidate?.isConnected) return;
    const area = visibleArea(candidate);
    if (area > bestArea) {
      bestArea = area;
      best = key;
    }
  });
  return best === id;
}

/**
 * True when a key event belongs to a text field, or to a dialog/menu that the
 * player is not part of (a player inside a modal still gets its shortcuts).
 */
export function isForeignKeyTarget(target: EventTarget | null, playerEl: HTMLElement | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.closest('input, textarea, select')) return true;
  const overlay = target.closest('[role="dialog"], [role="menu"], [role="listbox"]');
  return Boolean(overlay && !(playerEl && overlay.contains(playerEl)));
}
