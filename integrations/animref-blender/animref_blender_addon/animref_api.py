"""
AnimationReference.org HTTP API & local media cache for Blender.

Uses only Python's standard library so the addon works out-of-the-box on
Blender 3.6–5.0 across Windows, macOS, and Linux with zero pip installs.
"""

from __future__ import annotations

import hashlib
import json
import mimetypes
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

from . import animref_auth

SITE_BASE_URL = animref_auth.SITE_BASE_URL
CATALOG_URL = f"{SITE_BASE_URL}/data/videos-snapshot.json"
USER_AGENT = "AnimRefBlender/2.0"

_catalog_cache: list[dict] = []


def get_cache_dir() -> str:
    d = os.path.join(animref_auth.get_storage_dir(), "media_cache")
    os.makedirs(d, exist_ok=True)
    return d


def get_catalog_cache_path() -> str:
    return os.path.join(animref_auth.get_storage_dir(), "catalog_cache.json")


def _http_json(url: str, method: str = "GET", headers: dict | None = None, payload: dict | None = None, timeout: int = 15) -> dict:
    req_headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    if headers:
        req_headers.update(headers)
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        req_headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=data, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        body = ""
        try:
            body = exc.read().decode("utf-8", errors="replace")
            parsed = json.loads(body)
            msg = parsed.get("error") or parsed.get("message") or body
        except Exception:
            msg = body or str(exc)
        raise RuntimeError(f"HTTP {exc.code}: {msg}") from exc


def load_cached_catalog() -> list[dict]:
    global _catalog_cache
    if _catalog_cache:
        return list(_catalog_cache)
    path = get_catalog_cache_path()
    if os.path.isfile(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            videos = data.get("videos", data) if isinstance(data, dict) else data
            if isinstance(videos, list):
                _catalog_cache = videos
                return list(_catalog_cache)
        except Exception:
            pass
    return []


def fetch_catalog(force_refresh: bool = False) -> list[dict]:
    """Fetch the AnimationReference.org catalog with offline disk fallback."""
    global _catalog_cache
    if _catalog_cache and not force_refresh:
        return list(_catalog_cache)

    try:
        data = _http_json(CATALOG_URL, timeout=15)
        videos = data.get("videos", data) if isinstance(data, dict) else data
        if isinstance(videos, list) and videos:
            _catalog_cache = videos
            try:
                with open(get_catalog_cache_path(), "w", encoding="utf-8") as f:
                    json.dump({"updatedAt": time.time(), "videos": videos}, f)
            except Exception:
                pass
            return list(_catalog_cache)
    except Exception:
        cached = load_cached_catalog()
        if cached:
            return cached
        raise
    return load_cached_catalog()


def search_catalog(query: str = "", tag: str = "", videos: list[dict] | None = None, limit: int = 80) -> list[dict]:
    source = videos if videos is not None else load_cached_catalog()
    q = (query or "").strip().lower()
    t = (tag or "").strip().lower()

    results = []
    for v in source:
        if not isinstance(v, dict):
            continue
        title = str(v.get("title") or "").lower()
        cat = str(v.get("category") or "").lower()
        tags = [str(x).lower() for x in (v.get("tags") or [])]

        if t and t != "all":
            if t not in tags and t not in cat:
                continue
        if q:
            if q not in title and q not in cat and not any(q in tg for tg in tags):
                continue
        results.append(v)
        if len(results) >= limit:
            break
    return results


def fetch_saved_references() -> list[dict]:
    token = animref_auth.get_valid_id_token()
    if not token:
        raise RuntimeError("Sign in to view your saved references.")
    data = _http_json(
        f"{SITE_BASE_URL}/api/user/saved-references",
        headers={"Authorization": f"Bearer {token}"},
        timeout=15,
    )
    combined: list[dict] = []
    seen: set[str] = set()
    for key in ("savedVideos", "likedVideos", "saved", "videos", "items"):
        bucket = data.get(key)
        if isinstance(bucket, list):
            for item in bucket:
                if not isinstance(item, dict):
                    continue
                vid_id = str(item.get("id") or item.get("videoUrl") or "")
                if vid_id and vid_id in seen:
                    continue
                if vid_id:
                    seen.add(vid_id)
                combined.append(item)
    return combined


def fetch_moodboards() -> list[dict]:
    token = animref_auth.get_valid_id_token()
    if not token:
        raise RuntimeError("Sign in to view your moodboards.")
    data = _http_json(
        f"{SITE_BASE_URL}/api/user/moodboards",
        headers={"Authorization": f"Bearer {token}"},
        timeout=15,
    )
    boards = data.get("moodboards") or data.get("boards") or []
    return boards if isinstance(boards, list) else []


def fetch_moodboard_items() -> list[dict]:
    boards = fetch_moodboards()
    items: list[dict] = []
    seen: set[str] = set()
    for board in boards:
        if not isinstance(board, dict):
            continue
        bname = str(board.get("name") or "Board")
        for it in board.get("items") or []:
            if not isinstance(it, dict):
                continue
            vid_id = str(it.get("id") or it.get("videoUrl") or "")
            if vid_id and vid_id in seen:
                continue
            if vid_id:
                seen.add(vid_id)
            row = dict(it)
            if not row.get("category"):
                row["category"] = bname
            items.append(row)
    return items


def _safe_filename(video_id: str, title: str, ext: str) -> str:
    clean_title = re.sub(r"[^a-zA-Z0-9_-]+", "_", title or "clip").strip("_")[:36] or "clip"
    short_hash = hashlib.sha1((video_id or title or "clip").encode("utf-8")).hexdigest()[:8]
    clean_ext = ext if ext.startswith(".") else f".{ext}"
    return f"{clean_title}_{short_hash}{clean_ext}"


def authorize_and_download_media(video: dict) -> str:
    """
    Request server download authorization for a video clip and download it to
    the local Blender cache. Static images are downloaded directly.
    """
    video_id = str(video.get("id") or "")
    title = str(video.get("title") or "Reference")
    media_url = str(video.get("videoUrl") or video.get("mediaUrl") or "")
    is_image = str(video.get("mediaType") or "").lower() in ("image", "gif") or bool(
        re.search(r"\.(png|jpg|jpeg|webp|gif)(\?|$)", media_url, re.IGNORECASE)
    )

    download_url = media_url
    if not is_image:
        token = animref_auth.get_valid_id_token()
        if not token:
            raise RuntimeError("Sign in to AnimationReference.org to import video clips into Blender.")

        if video_id:
            auth_resp = _http_json(
                f"{SITE_BASE_URL}/api/videos/{urllib.parse.quote(video_id)}/download",
                method="POST",
                headers={"Authorization": f"Bearer {token}"},
                payload={"client": "blender"},
                timeout=20,
            )
            if auth_resp.get("error"):
                raise RuntimeError(str(auth_resp["error"]))
            download_url = str(auth_resp.get("downloadUrl") or auth_resp.get("url") or media_url)

    if not download_url:
        raise RuntimeError("No downloadable media URL found for this reference.")

    # Blender cannot load HLS .m3u8 playlists natively — convert Bunny Stream URLs to direct MP4
    if "b-cdn.net" in download_url.lower() and "playlist.m3u8" in download_url.lower():
        download_url = download_url.replace("playlist.m3u8", "play_720p.mp4")

    parsed = urllib.parse.urlparse(download_url)
    _, ext = os.path.splitext(parsed.path)
    if not ext or len(ext) > 6:
        ext = ".png" if is_image else ".mp4"

    dest_path = os.path.join(get_cache_dir(), _safe_filename(video_id, title, ext))
    if os.path.isfile(dest_path) and os.path.getsize(dest_path) > 1024:
        return dest_path

    req = urllib.request.Request(download_url, headers={"User-Agent": USER_AGENT})
    tmp_path = dest_path + ".part"
    with urllib.request.urlopen(req, timeout=60) as resp, open(tmp_path, "wb") as out:
        while True:
            chunk = resp.read(65536)
            if not chunk:
                break
            out.write(chunk)
    os.replace(tmp_path, dest_path)
    return dest_path


def upload_playblast_to_site(
    file_path: str,
    title: str,
    description: str = "",
    category: str = "Acting",
    wip_stage: str = "blocking",
    tags: str = "blender,playblast",
    board_id: str = "",
    publish_to_portfolio: bool = True,
    is_private: bool = False,
    draft: bool = True,
) -> dict:
    """Upload a recorded Blender playblast MP4/AVI directly to AnimationReference.org."""
    if not os.path.isfile(file_path):
        raise FileNotFoundError(f"Playblast file not found: {file_path}")

    token = animref_auth.get_valid_id_token()
    if not token:
        raise RuntimeError("Please sign in to upload playblasts to AnimationReference.org.")

    boundary = f"----AnimRefBlender{uuid.uuid4().hex}"
    filename = os.path.basename(file_path)
    mime_type = mimetypes.guess_type(filename)[0] or "video/mp4"

    parts: list[bytes] = []

    def add_field(name: str, value: str) -> None:
        parts.append(f"--{boundary}\r\n".encode("utf-8"))
        parts.append(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode("utf-8"))
        parts.append(f"{value}\r\n".encode("utf-8"))

    add_field("title", title or "Blender Playblast")
    add_field("description", description or "Uploaded directly from AnimationReference.org Blender Studio Add-on")
    add_field("category", category or "Acting")
    add_field("tags", tags or "blender,playblast")
    add_field("software", "Blender")
    add_field("isPrivate", "true" if is_private else "false")
    add_field("draft", "true" if draft else "false")
    add_field("publishToPortfolio", "true" if (publish_to_portfolio and not is_private and not draft) else "false")
    add_field("wipStage", wip_stage or "blocking")
    if board_id:
        add_field("boardId", str(board_id))
    add_field("source", "blender_plugin")

    with open(file_path, "rb") as f:
        file_bytes = f.read()

    parts.append(f"--{boundary}\r\n".encode("utf-8"))
    parts.append(
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
        f"Content-Type: {mime_type}\r\n\r\n".encode("utf-8")
    )
    parts.append(file_bytes)
    parts.append(f"\r\n--{boundary}--\r\n".encode("utf-8"))

    body = b"".join(parts)
    req = urllib.request.Request(
        f"{SITE_BASE_URL}/api/clips/upload",
        data=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "User-Agent": USER_AGENT,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {"ok": True}
    except urllib.error.HTTPError as exc:
        err_body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Upload failed (HTTP {exc.code}): {err_body}") from exc


def clear_media_cache() -> int:
    cache_dir = get_cache_dir()
    removed = 0
    for name in os.listdir(cache_dir):
        full = os.path.join(cache_dir, name)
        if os.path.isfile(full):
            try:
                os.remove(full)
                removed += 1
            except Exception:
                pass
    return removed
