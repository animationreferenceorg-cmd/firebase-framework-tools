"""
Asynchronous thumbnail downloader & bpy.utils.previews cache for Blender Studio Window.

Downloads reference thumbnails in background threads without blocking Blender's UI,
caches them locally, and exposes Blender icon_id handles for visual card grids.
"""

from __future__ import annotations

import hashlib
import os
import threading
import urllib.request

try:
    import bpy
    import bpy.utils.previews
except ImportError:
    bpy = None

from . import animref_auth

USER_AGENT = "AnimRefBlender/2.0"

_pcoll = None
_inflight: set[str] = set()
_failed: set[str] = set()
_lock = threading.Lock()


def get_thumb_dir() -> str:
    d = os.path.join(animref_auth.get_storage_dir(), "thumbs")
    os.makedirs(d, exist_ok=True)
    return d


def _ensure_pcoll():
    global _pcoll
    if bpy is None:
        return None
    if _pcoll is None:
        _pcoll = bpy.utils.previews.new()
    return _pcoll


def _thumb_key(url: str) -> str:
    return hashlib.sha1(url.encode("utf-8")).hexdigest()[:16]


def _thumb_path(url: str) -> str:
    ext = ".jpg"
    lower = url.lower().split("?")[0]
    if lower.endswith(".png"):
        ext = ".png"
    elif lower.endswith(".webp"):
        ext = ".webp"
    return os.path.join(get_thumb_dir(), f"{_thumb_key(url)}{ext}")


def _schedule_redraw() -> None:
    if bpy is None:
        return

    def _do():
        try:
            for win in bpy.context.window_manager.windows:
                for area in win.screen.areas:
                    area.tag_redraw()
        except Exception:
            pass
        return None

    try:
        bpy.app.timers.register(_do, first_interval=0.1)
    except Exception:
        pass


def _download_worker(url: str, dest: str) -> None:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        tmp = dest + ".part"
        with urllib.request.urlopen(req, timeout=12) as resp, open(tmp, "wb") as out:
            out.write(resp.read())
        if os.path.getsize(tmp) > 128:
            os.replace(tmp, dest)
            _schedule_redraw()
        else:
            try:
                os.remove(tmp)
            except Exception:
                pass
            with _lock:
                _failed.add(url)
    except Exception:
        with _lock:
            _failed.add(url)
    finally:
        with _lock:
            _inflight.discard(url)


def get_icon_id(thumbnail_url: str) -> int:
    """
    Return a Blender icon_id for `thumbnail_url`.
    If not cached yet, starts a background download and returns 0 until ready.
    """
    if bpy is None or not thumbnail_url:
        return 0
    url = thumbnail_url.strip()
    if not url.startswith(("http://", "https://")):
        return 0

    pcoll = _ensure_pcoll()
    if pcoll is None:
        return 0

    key = _thumb_key(url)
    if key in pcoll:
        return int(pcoll[key].icon_id)

    path = _thumb_path(url)
    if os.path.isfile(path) and os.path.getsize(path) > 128:
        try:
            pcoll.load(key, path, "IMAGE")
            return int(pcoll[key].icon_id)
        except Exception:
            with _lock:
                _failed.add(url)
            return 0

    with _lock:
        if url in _inflight or url in _failed:
            return 0
        _inflight.add(url)

    t = threading.Thread(target=_download_worker, args=(url, path), daemon=True)
    t.start()
    return 0


def prefetch_thumbnails(urls: list[str], limit: int = 12) -> None:
    for url in urls[:limit]:
        if url:
            get_icon_id(url)


def clear_previews() -> None:
    global _pcoll
    if bpy is not None and _pcoll is not None:
        try:
            bpy.utils.previews.remove(_pcoll)
        except Exception:
            pass
    _pcoll = None
    with _lock:
        _inflight.clear()
        _failed.clear()
