"""
Automatic SHA-256 verified self-updater for AnimationReference.org Blender Add-on.

Checks https://animationreference.org/api/plugins/updates?plugin=blender on launch
(at most once every 10 minutes, or immediately when triggered manually), downloads
only changed .py/.toml files, verifies SHA-256 checksums, and atomically replaces them.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import threading
import time
import urllib.request

MANIFEST_URL = "https://animationreference.org/api/plugins/updates?plugin=blender"
SAFE_NAME_RE = re.compile(r"^[a-zA-Z0-9_]+\.(py|toml)$")
CHECK_COOLDOWN_SECONDS = 600  # 10 minutes between automatic background checks
USER_AGENT = "AnimRefBlenderStudio/1.0"

_update_lock = threading.Lock()
_last_check_ts = 0.0
_last_result: dict = {"ok": True, "updated": False, "version": "", "changed_files": [], "message": ""}


def _addon_dir() -> str:
    return os.path.dirname(os.path.abspath(__file__))


def _sha256_file(path: str) -> str:
    if not os.path.isfile(path):
        return ""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            chunk = f.read(65536)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def _fetch_bytes(url: str, timeout: int = 15) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def get_last_update_status() -> dict:
    return dict(_last_result)


def check_and_apply_updates(force: bool = False) -> dict:
    """
    Compare local Blender add-on files against the server manifest and atomically
    download & apply any changed files. Safe to call from a background thread.
    """
    global _last_check_ts, _last_result
    now = time.time()
    if not force and (now - _last_check_ts) < CHECK_COOLDOWN_SECONDS:
        return dict(_last_result, skipped=True)

    if not _update_lock.acquire(blocking=False):
        return dict(_last_result, skipped=True)

    try:
        _last_check_ts = now
        raw = _fetch_bytes(MANIFEST_URL, timeout=12)
        manifest = json.loads(raw.decode("utf-8"))
        files = manifest.get("files") or []
        version = str(manifest.get("version") or "")
        base_dir = _addon_dir()

        changed: list[str] = []
        for entry in files:
            name = str(entry.get("name") or "")
            expected_hash = str(entry.get("sha256") or "").lower()
            file_url = str(entry.get("url") or "")
            if not SAFE_NAME_RE.match(name) or not expected_hash or not file_url.startswith("https://"):
                continue

            local_path = os.path.join(base_dir, name)
            if _sha256_file(local_path).lower() == expected_hash:
                continue

            data = _fetch_bytes(file_url, timeout=25)
            actual_hash = hashlib.sha256(data).hexdigest().lower()
            if actual_hash != expected_hash:
                raise RuntimeError(f"Checksum mismatch while updating {name}")

            tmp_path = local_path + ".update_tmp"
            with open(tmp_path, "wb") as out:
                out.write(data)
            os.replace(tmp_path, local_path)
            changed.append(name)

        _last_result = {
            "ok": True,
            "updated": len(changed) > 0,
            "version": version,
            "changed_files": changed,
            "message": (
                f"Updated {len(changed)} file(s) to v{version} — restart Blender or reload add-on to apply."
                if changed
                else f"Up to date (v{version or 'latest'})."
            ),
        }
        return dict(_last_result)
    except Exception as exc:
        _last_result = {
            "ok": False,
            "updated": False,
            "version": "",
            "changed_files": [],
            "error": str(exc),
            "message": f"Update check skipped: {exc}",
        }
        return dict(_last_result)
    finally:
        _update_lock.release()


def check_in_background(on_complete=None, force: bool = False) -> threading.Thread:
    def _worker():
        res = check_and_apply_updates(force=force)
        if on_complete:
            try:
                on_complete(res)
            except Exception:
                pass

    t = threading.Thread(target=_worker, daemon=True)
    t.start()
    return t
