from __future__ import absolute_import, division, print_function

import os
import sys
import json
import time
import re
import shutil
import threading

try:
    import queue
except ImportError:
    import Queue as queue

try:
    import urllib.request as urllib_request
    import urllib.parse as urllib_parse
    import urllib.error as urllib_error
except ImportError:
    import urllib2 as urllib_request
    import urlparse as urllib_parse
    import urllib2 as urllib_error

BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Referer": "https://animationreference.org/",
    "Accept": "*/*",
}

SNAPSHOT_URL = "https://animationreference.org/data/videos-snapshot.json"
LOCAL_SNAPSHOT_FALLBACK = os.path.normpath(
    os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "..", "..", "..", "public", "data", "videos-snapshot.json"
    )
)

_cached_catalog = None
_cached_tags = None
_lock = threading.Lock()


def get_animo_data_path():
    try:
        import maya.cmds as cmds
        version_script_dir = cmds.internalVar(userScriptDir=True)
        script_dir = os.path.normpath(os.path.join(version_script_dir, "..", "..", "scripts"))
        candidate = os.path.join(script_dir, "Animo_Data")
        if os.path.isdir(candidate):
            return candidate
    except Exception:
        pass

    module_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.normpath(os.path.join(module_dir, ".."))
    if os.path.basename(parent_dir) == "Animo_Data":
        return parent_dir

    return os.path.join(os.path.expanduser("~"), "maya", "scripts", "Animo_Data")


def get_cache_dir():
    animo_data = get_animo_data_path()
    cache_dir = os.path.join(animo_data, "Animo_Prefs", "animref_cache")
    os.makedirs(cache_dir, exist_ok=True)
    os.makedirs(os.path.join(cache_dir, "thumbnails"), exist_ok=True)
    os.makedirs(os.path.join(cache_dir, "videos"), exist_ok=True)
    return cache_dir


def get_cached_snapshot_path():
    return os.path.join(get_cache_dir(), "videos-snapshot.json")


def load_catalog(force_refresh=False):
    global _cached_catalog, _cached_tags

    with _lock:
        if _cached_catalog is not None and not force_refresh:
            return _cached_catalog

        cache_path = get_cached_snapshot_path()
        catalog_data = None

        # Check local cache first
        if not force_refresh and os.path.isfile(cache_path) and os.path.getsize(cache_path) > 1000:
            try:
                with open(cache_path, "r", encoding="utf-8") as f:
                    catalog_data = json.load(f)
            except Exception:
                catalog_data = None

        # Fallback to local repo public data if available
        if catalog_data is None and os.path.isfile(LOCAL_SNAPSHOT_FALLBACK):
            try:
                with open(LOCAL_SNAPSHOT_FALLBACK, "r", encoding="utf-8") as f:
                    catalog_data = json.load(f)
                try:
                    shutil.copy2(LOCAL_SNAPSHOT_FALLBACK, cache_path)
                except Exception:
                    pass
            except Exception:
                catalog_data = None

        # If still None or forced refresh, fetch from remote
        if catalog_data is None or force_refresh:
            try:
                req = urllib_request.Request(
                    SNAPSHOT_URL,
                    headers={"User-Agent": "AnimRef-Animo-Plugin/1.0 (Maya; Autodesk)"}
                )
                with urllib_request.urlopen(req, timeout=15) as resp:
                    raw_data = resp.read().decode("utf-8")
                    catalog_data = json.loads(raw_data)
                    with open(cache_path, "w", encoding="utf-8") as f:
                        f.write(raw_data)
            except Exception as e:
                if catalog_data is None:
                    # Return empty if totally unreachable
                    catalog_data = []

        _cached_catalog = catalog_data or []
        _cached_tags = None
        return _cached_catalog


def get_popular_tags(limit=35):
    global _cached_tags
    if _cached_tags is not None:
        return _cached_tags[:limit]

    catalog = load_catalog()
    tag_counts = {}
    for item in catalog:
        for t in item.get("tags", []):
            if not t or len(t) < 2:
                continue
            norm = t.strip()
            tag_counts[norm] = tag_counts.get(norm, 0) + 1

    sorted_tags = sorted(tag_counts.items(), key=lambda kv: kv[1], reverse=True)
    _cached_tags = [tag for tag, count in sorted_tags]
    return _cached_tags[:limit]


def search_videos(query=None, tag=None, sort="newest", limit=60, offset=0):
    catalog = load_catalog()
    if not catalog:
        return {"items": [], "total": 0}

    needle_words = [w.lower() for w in query.strip().split()] if query and query.strip() else []
    target_tag = tag.lower().strip() if tag and tag.strip() else None

    matches = []
    for video in catalog:
        # Tag match
        if target_tag:
            item_tags = [t.lower() for t in video.get("tags", [])]
            if target_tag not in item_tags:
                continue

        # Text query match
        if needle_words:
            title = (video.get("title") or "").lower()
            desc = (video.get("description") or "").lower()
            tags_str = " ".join([t.lower() for t in video.get("tags", [])])
            author = (video.get("author_name") or video.get("uploader") or "").lower()
            haystack = title + " " + desc + " " + tags_str + " " + author

            if not all(w in haystack for w in needle_words):
                continue

        matches.append(video)

    # Sort
    if sort == "oldest":
        matches.sort(key=lambda x: x.get("createdAt") or 0)
    elif sort == "duration_desc":
        matches.sort(key=lambda x: x.get("duration") or 0, reverse=True)
    elif sort == "duration_asc":
        matches.sort(key=lambda x: x.get("duration") or 0)
    else:  # newest
        matches.sort(key=lambda x: x.get("createdAt") or 0, reverse=True)

    total = len(matches)
    paged = matches[offset: offset + limit]

    return {
        "items": paged,
        "total": total,
        "offset": offset,
        "limit": limit
    }


def get_thumbnail_local_path(video_id):
    clean_id = re.sub(r"[^A-Za-z0-9_-]", "_", str(video_id))
    return os.path.join(get_cache_dir(), "thumbnails", clean_id + ".jpg")


_THUMB_QUEUE = queue.Queue()
_THUMB_WORKERS_STARTED = False
_WORKER_LOCK = threading.Lock()


def _thumb_worker_loop():
    while True:
        task = _THUMB_QUEUE.get()
        if task is None:
            break
        video_id, url, local_path, callback = task
        try:
            if not (os.path.isfile(local_path) and os.path.getsize(local_path) > 0):
                req = urllib_request.Request(url, headers=BROWSER_HEADERS)
                with urllib_request.urlopen(req, timeout=10) as resp:
                    data = resp.read()
                    if len(data) > 0:
                        with open(local_path, "wb") as out_f:
                            out_f.write(data)
            if os.path.isfile(local_path) and os.path.getsize(local_path) > 0:
                callback(video_id, local_path)
            else:
                callback(video_id, None)
        except Exception:
            try:
                callback(video_id, None)
            except Exception:
                pass
        finally:
            _THUMB_QUEUE.task_done()


def _ensure_thumb_workers():
    global _THUMB_WORKERS_STARTED
    with _WORKER_LOCK:
        if not _THUMB_WORKERS_STARTED:
            _THUMB_WORKERS_STARTED = True
            for _ in range(4):
                t = threading.Thread(target=_thumb_worker_loop)
                t.daemon = True
                t.start()


def get_thumbnail(video, callback=None):
    video_id = video.get("id")
    if not video_id:
        if callback:
            callback(None, None)
        return None

    local_path = get_thumbnail_local_path(video_id)
    if os.path.isfile(local_path) and os.path.getsize(local_path) > 0:
        return local_path

    url = video.get("thumbnailUrl") or video.get("posterUrl")
    if not url:
        if callback:
            callback(video_id, None)
        return None

    if callback:
        _ensure_thumb_workers()
        _THUMB_QUEUE.put((video_id, url, local_path, callback))
        return None
    else:
        try:
            req = urllib_request.Request(url, headers=BROWSER_HEADERS)
            with urllib_request.urlopen(req, timeout=8) as resp:
                data = resp.read()
                if len(data) > 0:
                    with open(local_path, "wb") as out_f:
                        out_f.write(data)
                    return local_path
        except Exception:
            return None
        return None


def resolve_media_url(video):
    """
    Normalizes video media URLs:
    - Resolves Bunny CDN HLS playlist.m3u8 into direct MP4 (original / play_720p.mp4)
    - Strips iframe embed wrappers
    - Detects un-downloadable YouTube links and gives friendly warnings
    """
    url = video.get("videoUrl") or video.get("streamUrl")
    if not url:
        raise ValueError("Video clip does not have a downloadable media URL.")
    url = url.strip()

    # Extract src from raw <iframe> tags
    if url.startswith("<iframe"):
        match = re.search(r'src=["\']([^"\']+)["\']', url, re.IGNORECASE)
        if match:
            url = match.group(1)

    # Detect YouTube
    if "youtu.be" in url or "youtube.com" in url:
        raise ValueError(
            "This clip is hosted on YouTube and cannot be downloaded as raw MP4 in Maya. "
            "Please click the clip link to view it in your browser."
        )

    # Resolve Bunny CDN playlist.m3u8 to direct playable MP4
    if "b-cdn.net" in url and "playlist.m3u8" in url:
        base = url.rsplit("/", 1)[0] + "/"
        for candidate in ["play_720p.mp4", "original", "play_480p.mp4"]:
            cand_url = base + candidate
            try:
                req = urllib_request.Request(cand_url, headers=BROWSER_HEADERS)
                req.get_method = lambda: "HEAD"
                with urllib_request.urlopen(req, timeout=4) as resp:
                    if resp.status == 200:
                        return cand_url
            except Exception:
                pass
        return base + "original"

    return url


def download_video_file(video, progress_callback=None):
    video_id = video.get("id")
    resolved_url = resolve_media_url(video)

    clean_id = re.sub(r"[^A-Za-z0-9_-]", "_", str(video_id))
    local_path = os.path.join(get_cache_dir(), "videos", clean_id + ".mp4")

    if os.path.isfile(local_path) and os.path.getsize(local_path) > 1024:
        if progress_callback:
            progress_callback(100, 100)
        return local_path

    temp_path = local_path + ".tmp"
    req = urllib_request.Request(resolved_url, headers=BROWSER_HEADERS)

    with urllib_request.urlopen(req, timeout=35) as resp:
        total_size = int(resp.headers.get("Content-Length", 0))
        chunk_size = 1024 * 64
        downloaded = 0
        with open(temp_path, "wb") as f:
            while True:
                chunk = resp.read(chunk_size)
                if not chunk:
                    break
                f.write(chunk)
                downloaded += len(chunk)
                if progress_callback:
                    if total_size > 0:
                        pct = int((downloaded / total_size) * 100)
                        progress_callback(pct, 100)
                    else:
                        # Estimate progress if chunked
                        pct = min(95, int(downloaded / (1024 * 1024 * 2) * 20))
                        progress_callback(pct, 100)

    if os.path.isfile(local_path):
        try:
            os.remove(local_path)
        except Exception:
            pass

    os.rename(temp_path, local_path)
    if progress_callback:
        progress_callback(100, 100)
    return local_path
