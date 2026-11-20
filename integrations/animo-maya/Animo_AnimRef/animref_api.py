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
_cached_catalog_at = 0
CATALOG_CACHE_SECONDS = 3600
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


def peek_cached_catalog():
    """Fast non-blocking catalog lookup from RAM or local disk snapshot (never makes HTTP requests)."""
    global _cached_catalog, _cached_catalog_at
    if _cached_catalog is not None:
        return _cached_catalog
    for candidate in (get_cached_snapshot_path(), LOCAL_SNAPSHOT_FALLBACK):
        if candidate and os.path.isfile(candidate):
            try:
                with open(candidate, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if isinstance(data, list) and data:
                    _cached_catalog = data
                    _cached_catalog_at = os.path.getmtime(candidate)
                    return _cached_catalog
            except Exception:
                pass
    return []


def load_catalog(force_refresh=False):
    global _cached_catalog, _cached_catalog_at, _cached_tags

    with _lock:
        now = time.time()
        if _cached_catalog is not None and not force_refresh and now - _cached_catalog_at < CATALOG_CACHE_SECONDS:
            return _cached_catalog

        cache_path = get_cached_snapshot_path()
        fallback = _cached_catalog
        cache_fresh = False
        if os.path.isfile(cache_path):
            try:
                with open(cache_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if isinstance(data, list):
                    fallback = data
                    cache_fresh = now - os.path.getmtime(cache_path) < CATALOG_CACHE_SECONDS
            except (OSError, ValueError):
                pass
        if cache_fresh and not force_refresh:
            _cached_catalog = fallback
            _cached_catalog_at = now
            _cached_tags = None
            return _cached_catalog

        try:
            req = urllib_request.Request(SNAPSHOT_URL, headers={"User-Agent": "AnimRef-Animo-Plugin/1.0 (Maya; Autodesk)"})
            with urllib_request.urlopen(req, timeout=15) as resp:
                raw_data = resp.read().decode("utf-8")
            data = json.loads(raw_data)
            if not isinstance(data, list):
                raise ValueError("Invalid catalogue response")
            with open(cache_path, "w", encoding="utf-8") as f:
                f.write(raw_data)
            fallback = data
        except (OSError, ValueError, urllib_error.URLError):
            if fallback is None and os.path.isfile(LOCAL_SNAPSHOT_FALLBACK):
                try:
                    with open(LOCAL_SNAPSHOT_FALLBACK, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    if isinstance(data, list):
                        fallback = data
                except (OSError, ValueError):
                    pass

        _cached_catalog = fallback or []
        # A failed initial fetch must be retried next time rather than cached forever.
        _cached_catalog_at = now if fallback is not None else 0
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
_THUMB_VERIFIED_PATHS = {}
_THUMB_IN_FLIGHT = {}


def _thumb_worker_loop():
    while True:
        task = _THUMB_QUEUE.get()
        if task is None:
            break
        video_id, url, local_path = task
        result_path = None
        try:
            if not (os.path.isfile(local_path) and os.path.getsize(local_path) > 0):
                req = urllib_request.Request(url, headers=BROWSER_HEADERS)
                with urllib_request.urlopen(req, timeout=10) as resp:
                    data = resp.read()
                    if len(data) > 0:
                        temp_thumb = local_path + ".tmp"
                        with open(temp_thumb, "wb") as out_f:
                            out_f.write(data)
                        if os.path.isfile(local_path):
                            try:
                                os.remove(local_path)
                            except Exception:
                                pass
                        os.rename(temp_thumb, local_path)
            if os.path.isfile(local_path) and os.path.getsize(local_path) > 0:
                _THUMB_VERIFIED_PATHS[video_id] = local_path
                result_path = local_path
        except Exception:
            result_path = None
        finally:
            with _WORKER_LOCK:
                callbacks = _THUMB_IN_FLIGHT.pop(video_id, [])
            for cb in callbacks:
                if cb:
                    try:
                        cb(video_id, result_path)
                    except Exception:
                        pass
            _THUMB_QUEUE.task_done()


def _ensure_thumb_workers():
    global _THUMB_WORKERS_STARTED
    with _WORKER_LOCK:
        if not _THUMB_WORKERS_STARTED:
            _THUMB_WORKERS_STARTED = True
            for _ in range(8):
                t = threading.Thread(target=_thumb_worker_loop)
                t.daemon = True
                t.start()


def get_thumbnail(video, callback=None):
    video_id = video.get("id")
    if not video_id:
        if callback:
            callback(None, None)
        return None

    cached_mem = _THUMB_VERIFIED_PATHS.get(video_id)
    if cached_mem and os.path.isfile(cached_mem):
        return cached_mem

    local_path = get_thumbnail_local_path(video_id)
    if os.path.isfile(local_path) and os.path.getsize(local_path) > 0:
        _THUMB_VERIFIED_PATHS[video_id] = local_path
        return local_path

    url = video.get("thumbnailUrl") or video.get("posterUrl") or video.get("imageUrl")
    if not url:
        if callback:
            callback(video_id, None)
        return None

    if callback:
        _ensure_thumb_workers()
        with _WORKER_LOCK:
            if video_id in _THUMB_IN_FLIGHT:
                _THUMB_IN_FLIGHT[video_id].append(callback)
                return None
            _THUMB_IN_FLIGHT[video_id] = [callback]
        _THUMB_QUEUE.put((video_id, url, local_path))
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


def _is_valid_cached_video(path):
    if not path or not os.path.isfile(path) or os.path.getsize(path) <= 1024:
        return False
    try:
        with open(path, "rb") as f:
            head = f.read(64).lstrip()
        if head.startswith((b"<", b"#EXTM3U", b"{")):
            return False
    except Exception:
        return False
    return True


def get_cached_video_file(video):
    video_id = video.get("id")
    if not video_id:
        return None
    clean_id = re.sub(r"[^A-Za-z0-9_-]", "_", str(video_id))
    local_path = os.path.join(get_cache_dir(), "videos", clean_id + ".mp4")
    if _is_valid_cached_video(local_path):
        return local_path
    return None


def get_playable_media_source(video):
    """Returns tuple of (media_source_str, is_local_bool)"""
    cached = get_cached_video_file(video)
    if cached:
        return cached, True
    try:
        resolved_url = resolve_media_url(video)
        return resolved_url, False
    except Exception:
        url = video.get("videoUrl") or video.get("streamUrl") or ""
        return url, False


def _download_from_url(download_url, local_path, progress_callback=None):
    clean_path = os.path.normpath(local_path).replace("\\", "/")
    if _is_valid_cached_video(local_path):
        if progress_callback:
            progress_callback(100, 100)
        return clean_path

    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    temp_path = local_path + ".tmp"
    req = urllib_request.Request(download_url, headers=BROWSER_HEADERS)

    with urllib_request.urlopen(req, timeout=40) as resp:
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
    return clean_path


def download_video_file(video, progress_callback=None):
    video_id = video.get("id")
    if not video_id:
        raise ValueError("This reference has no ID. Open it on Animation Reference instead.")
    try:
        from . import animref_auth
    except (ImportError, ValueError):
        import animref_auth

    clean_id = re.sub(r"[^A-Za-z0-9_-]", "_", str(video_id))
    has_video_url = bool((video.get("videoUrl") or video.get("streamUrl") or video.get("uploadedMediaUrl") or video.get("mediaUrl") or video.get("url") or video.get("sourceUrl") or "").strip())
    media_type = str(video.get("mediaType") or video.get("type") or video.get("source") or "").lower()
    image_only_url = (video.get("imageUrl") or video.get("posterUrl") or video.get("thumbnailUrl") or video.get("coverUrl") or "").strip()
    raw_video = (video.get("videoUrl") or video.get("streamUrl") or video.get("uploadedMediaUrl") or video.get("mediaUrl") or video.get("url") or video.get("sourceUrl") or "").strip()

    # Case 1: Static Image or 3D Card (no video stream, or image card)
    is_static_image = not has_video_url and bool(image_only_url) and (
        media_type in ("image", "model3d", "sketchfab", "artstation") or
        str(video_id).startswith(("img-", "sf_", "as_", "upload-")) or
        image_only_url.lower().endswith((".png", ".jpg", ".jpeg", ".webp", ".gif"))
    )
    if is_static_image or (not has_video_url and image_only_url):
        thumb_path = get_thumbnail(video)
        if thumb_path and os.path.isfile(thumb_path) and os.path.getsize(thumb_path) > 0:
            if progress_callback:
                progress_callback(100, 100)
            return thumb_path
        ext = ".png" if ".png" in image_only_url.lower() else ".jpg"
        local_img = os.path.join(get_cache_dir(), "thumbnails", clean_id + ext)
        try:
            return _download_from_url(image_only_url, local_img, progress_callback=progress_callback)
        except Exception:
            existing_thumb = get_thumbnail_local_path(video_id)
            if os.path.isfile(existing_thumb) and os.path.getsize(existing_thumb) > 0:
                if progress_callback:
                    progress_callback(100, 100)
                return existing_thumb
            raise

    token = animref_auth.get_valid_token()

    # Case 2: Direct User Uploads in Firebase / Cloud storage or direct MP4/MOV URLs
    is_direct_downloadable = (
        str(video_id).startswith(("upload-", "clip-", "user-")) or
        "firebasestorage.googleapis.com" in raw_video or
        "storage.googleapis.com" in raw_video or
        "firebasestorage.app" in raw_video or
        "sakugabooru.com" in raw_video or
        raw_video.lower().endswith((".mp4", ".mov", ".webm"))
    )
    if is_direct_downloadable and raw_video.startswith("http"):
        local_mp4 = os.path.join(get_cache_dir(), "videos", clean_id + ".mp4")
        if _is_valid_cached_video(local_mp4):
            if progress_callback:
                progress_callback(100, 100)
            return os.path.normpath(local_mp4).replace("\\", "/")
        try:
            return _download_from_url(raw_video, local_mp4, progress_callback=progress_callback)
        except Exception:
            pass

    # Case 3: Public catalog video references require signing in
    if not token:
        # Fallback: if raw_video is accessible via HTTP, try downloading it directly before erroring
        if raw_video.startswith("http"):
            try:
                dl_target = resolve_media_url(video) if ("b-cdn.net" in raw_video or "playlist.m3u8" in raw_video) else raw_video
                local_mp4 = os.path.join(get_cache_dir(), "videos", clean_id + ".mp4")
                return _download_from_url(dl_target, local_mp4, progress_callback=progress_callback)
            except Exception:
                pass
        raise RuntimeError("Sign in to your Animation Reference Pro account to import references.")

    # Call server download authorization API
    url = animref_auth.SITE_API_BASE + "/videos/" + urllib_parse.quote(str(video_id), safe="") + "/download"
    request = urllib_request.Request(url, data=b"{}", headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"})
    try:
        with urllib_request.urlopen(request, timeout=30) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib_error.HTTPError as error:
        if raw_video and ("b-cdn.net" in raw_video or "sakugabooru.com" in raw_video):
            try:
                resolved_fallback = resolve_media_url(video) if "b-cdn.net" in raw_video else raw_video
                local_mp4 = os.path.join(get_cache_dir(), "videos", clean_id + ".mp4")
                return _download_from_url(resolved_fallback, local_mp4, progress_callback=progress_callback)
            except Exception:
                pass
        try:
            message = json.loads(error.read().decode("utf-8")).get("message")
        except (ValueError, UnicodeError):
            message = None
        raise RuntimeError(message or "Unable to authorize this download. Check your account and try again.")
    except Exception as err:
        if raw_video and ("b-cdn.net" in raw_video or "sakugabooru.com" in raw_video):
            try:
                resolved_fallback = resolve_media_url(video) if "b-cdn.net" in raw_video else raw_video
                local_mp4 = os.path.join(get_cache_dir(), "videos", clean_id + ".mp4")
                return _download_from_url(resolved_fallback, local_mp4, progress_callback=progress_callback)
            except Exception:
                pass
        raise RuntimeError("Unable to connect to download server: " + str(err))

    resolved_url = result.get("url")
    if not isinstance(resolved_url, str) or urllib_parse.urlparse(resolved_url).scheme != "https":
        if raw_video and ("b-cdn.net" in raw_video or "sakugabooru.com" in raw_video):
            resolved_fallback = resolve_media_url(video) if ("b-cdn.net" in raw_video or "playlist.m3u8" in raw_video) else raw_video
            local_mp4 = os.path.join(get_cache_dir(), "videos", clean_id + ".mp4")
            return _download_from_url(resolved_fallback, local_mp4, progress_callback=progress_callback)
        raise RuntimeError("This reference does not have an authorized downloadable file.")

    local_path = os.path.join(get_cache_dir(), "videos", clean_id + ".mp4")
    if _is_valid_cached_video(local_path):
        if progress_callback:
            progress_callback(100, 100)
        return os.path.normpath(local_path).replace("\\", "/")

    return _download_from_url(resolved_url, local_path, progress_callback=progress_callback)


def get_cache_stats():
    """Returns disk usage statistics for cached videos, image sequences, and thumbnails."""
    cache_root = get_cache_dir()
    videos_dir = os.path.join(cache_root, "videos")
    thumbs_dir = os.path.join(cache_root, "thumbnails")

    total_bytes = 0
    video_count = 0
    thumb_count = 0

    if os.path.isdir(videos_dir):
        for root, _, files in os.walk(videos_dir):
            for fname in files:
                fpath = os.path.join(root, fname)
                try:
                    total_bytes += os.path.getsize(fpath)
                    if root == videos_dir and fname.lower().endswith((".mp4", ".mov", ".webm")):
                        video_count += 1
                except OSError:
                    pass

    if os.path.isdir(thumbs_dir):
        for fname in os.listdir(thumbs_dir):
            fpath = os.path.join(thumbs_dir, fname)
            if os.path.isfile(fpath):
                try:
                    total_bytes += os.path.getsize(fpath)
                    thumb_count += 1
                except OSError:
                    pass

    return {
        "total_bytes": total_bytes,
        "video_count": video_count,
        "thumb_count": thumb_count,
        "cache_dir": cache_root,
    }


def clear_media_cache(clear_thumbs=False):
    """Clears cached videos/sequences (and optionally thumbnails), preserving auth.json and boards."""
    cache_root = get_cache_dir()
    freed = 0
    targets = [os.path.join(cache_root, "videos")]
    if clear_thumbs:
        targets.append(os.path.join(cache_root, "thumbnails"))

    for tdir in targets:
        if not os.path.isdir(tdir):
            continue
        for entry in os.listdir(tdir):
            epath = os.path.join(tdir, entry)
            try:
                if os.path.isdir(epath):
                    for r, _, fs in os.walk(epath):
                        for fn in fs:
                            try:
                                freed += os.path.getsize(os.path.join(r, fn))
                            except OSError:
                                pass
                    shutil.rmtree(epath, ignore_errors=True)
                elif os.path.isfile(epath):
                    freed += os.path.getsize(epath)
                    os.remove(epath)
            except OSError:
                pass

    if clear_thumbs:
        _THUMB_VERIFIED_PATHS.clear()
    return freed
