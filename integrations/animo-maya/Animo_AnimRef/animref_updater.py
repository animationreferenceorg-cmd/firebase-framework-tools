"""
Automatic SHA-256 verified self-updater for AnimationReference.org Maya Plugin.

Checks https://animationreference.org/api/plugins/updates?plugin=maya on launch
(at most once every 10 minutes, or immediately when triggered manually), downloads
only changed .py files, verifies SHA-256 checksums, and atomically replaces them.
"""

from __future__ import absolute_import, division, print_function

import hashlib
import json
import os
import re
import threading
import time

try:
    from urllib import request as urllib_request
except ImportError:
    import urllib2 as urllib_request

MANIFEST_URL = "https://animationreference.org/api/plugins/updates?plugin=maya"
SAFE_NAME_RE = re.compile(r"^[a-zA-Z0-9_]+\.py$")
CHECK_COOLDOWN_SECONDS = 600  # 10 minutes between automatic background checks
USER_AGENT = "AnimoMayaPlugin/2.0"

_update_lock = threading.Lock()
_last_check_ts = 0.0


def _plugin_dir():
    return os.path.dirname(os.path.abspath(__file__))


def _sha256_file(path):
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


def _fetch_bytes(url, timeout=15):
    req = urllib_request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib_request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def check_and_apply_updates(force=False):
    """
    Compare local Maya plugin .py files against the server manifest and atomically
    download & apply any changed files. Safe to call from a background thread.
    """
    global _last_check_ts
    now = time.time()
    if not force and (now - _last_check_ts) < CHECK_COOLDOWN_SECONDS:
        return {"ok": True, "updated": False, "skipped": True, "changed_files": [], "version": ""}

    if not _update_lock.acquire(blocking=False):
        return {"ok": True, "updated": False, "skipped": True, "changed_files": [], "version": ""}

    try:
        _last_check_ts = now
        raw = _fetch_bytes(MANIFEST_URL, timeout=12)
        manifest = json.loads(raw.decode("utf-8"))
        files = manifest.get("files") or []
        version = str(manifest.get("version") or "")
        base_dir = _plugin_dir()

        changed = []
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
                raise RuntimeError("Checksum mismatch while updating {}".format(name))

            tmp_path = local_path + ".update_tmp"
            with open(tmp_path, "wb") as out:
                out.write(data)
            os.replace(tmp_path, local_path)
            changed.append(name)

        return {
            "ok": True,
            "updated": len(changed) > 0,
            "version": version,
            "changed_files": changed,
            "message": (
                "Updated {} file(s) to v{} — click Reload to apply.".format(len(changed), version)
                if changed
                else "Up to date (v{}).".format(version or "latest")
            ),
        }
    except Exception as exc:
        return {
            "ok": False,
            "updated": False,
            "version": "",
            "changed_files": [],
            "error": str(exc),
            "message": "Update check skipped: {}".format(exc),
        }
    finally:
        _update_lock.release()


def check_in_background(on_complete=None, force=False):
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
