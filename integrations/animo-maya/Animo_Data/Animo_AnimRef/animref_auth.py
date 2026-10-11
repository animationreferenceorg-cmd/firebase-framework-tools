from __future__ import absolute_import, division, print_function

import os
import sys
import json
import time
import re
import urllib.request as urllib_request
import urllib.parse as urllib_parse
import urllib.error as urllib_error

FIREBASE_API_KEY = "AIzaSyAnbGJpTKPNBzLMb81bU7e8AY5k0x6E5Kg"
STORAGE_BUCKET = "aniamtion-reference.firebasestorage.app"
SITE_API_BASE = "https://animationreference.org/api"

AUTH_CACHE_FILE = os.path.normpath(
    os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "..", "..", "..", "Animo_Prefs", "animref_cache", "auth.json"
    )
)

def get_auth_file():
    os.makedirs(os.path.dirname(AUTH_CACHE_FILE), exist_ok=True)
    return AUTH_CACHE_FILE


def load_cached_auth():
    auth_file = get_auth_file()
    if os.path.isfile(auth_file):
        try:
            with open(auth_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data
        except Exception:
            return None
    return None


def save_cached_auth(data):
    auth_file = get_auth_file()
    try:
        with open(auth_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception:
        pass


def sign_in_with_password(email, password):
    url = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + FIREBASE_API_KEY
    payload = {
        "email": email.strip(),
        "password": password,
        "returnSecureToken": True
    }
    req = urllib_request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib_request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            auth_record = {
                "idToken": data.get("idToken"),
                "refreshToken": data.get("refreshToken"),
                "uid": data.get("localId"),
                "email": data.get("email"),
                "displayName": data.get("displayName") or email.split("@")[0],
                "expiresAt": time.time() + int(data.get("expiresIn", 3600)) - 60
            }
            save_cached_auth(auth_record)
            return {"success": True, "user": auth_record}
    except urllib_error.HTTPError as e:
        try:
            err = json.loads(e.read().decode("utf-8"))
            msg = err.get("error", {}).get("message", "Login failed")
        except Exception:
            msg = str(e)
        return {"success": False, "error": msg}
    except Exception as e:
        return {"success": False, "error": str(e)}


def sign_out():
    global _MEM_SAVED_CACHE, _MEM_BOARDS_CACHE
    _MEM_SAVED_CACHE = {}
    _MEM_BOARDS_CACHE = {}
    auth_file = get_auth_file()
    if os.path.isfile(auth_file):
        try:
            os.remove(auth_file)
        except Exception:
            pass


_MEM_SAVED_CACHE = {}
_MEM_BOARDS_CACHE = {}


def get_user_cache_dir():
    cache_dir = os.path.normpath(
        os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "..", "..", "..", "Animo_Prefs", "animref_cache"
        )
    )
    os.makedirs(cache_dir, exist_ok=True)
    return cache_dir


def get_saved_cache_file(uid):
    clean_uid = re.sub(r"[^A-Za-z0-9_-]", "_", str(uid or "guest"))
    return os.path.join(get_user_cache_dir(), "saved_{}.json".format(clean_uid))


def get_boards_cache_file(uid):
    clean_uid = re.sub(r"[^A-Za-z0-9_-]", "_", str(uid or "guest"))
    return os.path.join(get_user_cache_dir(), "boards_{}.json".format(clean_uid))


def get_cached_saved_references(uid=None):
    if not uid:
        user = get_current_user()
        uid = user.get("uid") if user else None
    if not uid:
        return None

    mem = _MEM_SAVED_CACHE.get(uid)
    if mem and isinstance(mem.get("data"), dict):
        return mem.get("data")

    cache_path = get_saved_cache_file(uid)
    if os.path.isfile(cache_path):
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    _MEM_SAVED_CACHE[uid] = {"data": data, "timestamp": os.path.getmtime(cache_path)}
                    return data
        except Exception:
            pass
    return None


def save_cached_saved_references(data, uid=None):
    if not uid:
        user = get_current_user()
        uid = user.get("uid") if user else None
    if not uid or not isinstance(data, dict):
        return

    _MEM_SAVED_CACHE[uid] = {"data": data, "timestamp": time.time()}
    cache_path = get_saved_cache_file(uid)
    try:
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump(data, f)
    except Exception:
        pass


def get_cached_moodboards(uid=None):
    if not uid:
        user = get_current_user()
        uid = user.get("uid") if user else None
    if not uid:
        return None

    mem = _MEM_BOARDS_CACHE.get(uid)
    if mem and isinstance(mem.get("data"), list):
        return mem.get("data")

    cache_path = get_boards_cache_file(uid)
    if os.path.isfile(cache_path):
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    _MEM_BOARDS_CACHE[uid] = {"data": data, "timestamp": os.path.getmtime(cache_path)}
                    return data
        except Exception:
            pass
    return None


def save_cached_moodboards(boards, uid=None):
    if not uid:
        user = get_current_user()
        uid = user.get("uid") if user else None
    if not uid or not isinstance(boards, list):
        return

    _MEM_BOARDS_CACHE[uid] = {"data": boards, "timestamp": time.time()}
    cache_path = get_boards_cache_file(uid)
    try:
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump(boards, f)
    except Exception:
        pass


def get_valid_token():
    auth = load_cached_auth()
    if not auth:
        return None

    # Check if expired
    if time.time() > auth.get("expiresAt", 0):
        # Refresh token
        refresh_token = auth.get("refreshToken")
        if not refresh_token:
            return None

        url = "https://securetoken.googleapis.com/v1/token?key=" + FIREBASE_API_KEY
        post_data = urllib_parse.urlencode({
            "grant_type": "refresh_token",
            "refresh_token": refresh_token
        }).encode("utf-8")
        req = urllib_request.Request(url, data=post_data, headers={"Content-Type": "application/x-www-form-urlencoded"})
        try:
            with urllib_request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                auth["idToken"] = data.get("id_token")
                auth["refreshToken"] = data.get("refresh_token")
                auth["expiresAt"] = time.time() + int(data.get("expires_in", 3600)) - 60
                save_cached_auth(auth)
        except Exception:
            return None

    return auth.get("idToken")


def get_current_user():
    token = get_valid_token()
    if not token:
        return None
    return load_cached_auth()


def get_saved_references(force_refresh=False):
    token = get_valid_token()
    user = get_current_user()
    uid = user.get("uid") if user else None
    if not token or not uid:
        return {"saved": [], "liked": []}

    if not force_refresh:
        mem = _MEM_SAVED_CACHE.get(uid)
        if mem and (time.time() - mem.get("timestamp", 0) < 120):
            return mem.get("data")
        cached = get_cached_saved_references(uid)
        if cached is not None:
            return cached

    url = SITE_API_BASE + "/user/saved-references"
    req = urllib_request.Request(
        url,
        headers={
            "Authorization": "Bearer " + token,
            "User-Agent": "AnimRef-Animo-Plugin/1.0"
        }
    )
    try:
        with urllib_request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            result = {
                "saved": data.get("savedVideos", []),
                "liked": data.get("likedVideos", [])
            }
            save_cached_saved_references(result, uid)
            return result
    except Exception as e:
        cached = get_cached_saved_references(uid)
        if cached:
            return cached
        return {"saved": [], "liked": [], "error": str(e)}


def get_user_moodboards(force_refresh=False):
    token = get_valid_token()
    user = get_current_user()
    if not token or not user:
        return []

    uid = user.get("uid")

    if not force_refresh:
        mem = _MEM_BOARDS_CACHE.get(uid)
        if mem and (time.time() - mem.get("timestamp", 0) < 120):
            return mem.get("data")
        cached = get_cached_moodboards(uid)
        if cached is not None:
            return cached

    # Helper catalog lookup to fill in missing metadata
    catalog_map = {}
    try:
        from . import animref_api
        cat = animref_api.load_catalog()
        catalog_map = {c.get("id"): c for c in cat if c.get("id")}
    except Exception:
        pass

    # 1. Try unified site API endpoint (/api/user/moodboards)
    url = SITE_API_BASE + "/user/moodboards"
    req = urllib_request.Request(
        url,
        headers={
            "Authorization": "Bearer " + token,
            "User-Agent": "AnimRef-Animo-Plugin/1.0"
        }
    )
    try:
        with urllib_request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            raw_boards = data.get("moodboards", [])
            if isinstance(raw_boards, list) and len(raw_boards) >= 0:
                boards = []
                for b in raw_boards:
                    b_items = []
                    for item in b.get("items", []):
                        vid_id = item.get("id")
                        vid_url = item.get("videoUrl", "")
                        vid_thumb = item.get("thumbnailUrl", "")
                        vid_title = item.get("title", "Reference Clip")
                        dur = float(item.get("duration", 0.0) or 0.0)

                        if vid_id and (not vid_url or not vid_thumb) and vid_id in catalog_map:
                            cat_item = catalog_map[vid_id]
                            vid_url = vid_url or cat_item.get("videoUrl", "")
                            vid_thumb = vid_thumb or cat_item.get("thumbnailUrl", "")
                            vid_title = vid_title or cat_item.get("title", "")
                            dur = dur or float(cat_item.get("duration", 0.0) or 0.0)

                        b_items.append({
                            "id": vid_id or "item_{}".format(len(b_items)),
                            "title": vid_title,
                            "thumbnailUrl": vid_thumb,
                            "videoUrl": vid_url,
                            "duration": dur,
                            "category": item.get("category", "General"),
                        })

                    boards.append({
                        "id": b.get("id", ""),
                        "name": b.get("name", "Untitled Board"),
                        "thumbnailUrl": b.get("thumbnailUrl") or (b_items[0]["thumbnailUrl"] if b_items else ""),
                        "itemCount": int(b.get("itemCount") or len(b_items)),
                        "items": b_items
                    })

                save_cached_moodboards(boards, uid)
                return boards
    except Exception:
        pass

    # 2. Fallback: Query Firestore REST for user's moodboards directly
    url = "https://firestore.googleapis.com/v1/projects/aniamtion-reference/databases/(default)/documents/users/{}/moodboards".format(uid)
    req = urllib_request.Request(
        url,
        headers={
            "Authorization": "Bearer " + token,
            "User-Agent": "AnimRef-Animo-Plugin/1.0"
        }
    )
    try:
        with urllib_request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            docs = data.get("documents", [])
            boards = []
            for doc in docs:
                fields = doc.get("fields", {})
                name = fields.get("name", {}).get("stringValue", "Untitled Board")
                thumb = fields.get("thumbnailUrl", {}).get("stringValue", "")
                item_count = fields.get("itemCount", {}).get("integerValue", 0)

                raw_items = fields.get("items", {}).get("arrayValue", {}).get("values", [])
                items = []
                for val in raw_items:
                    map_val = val.get("mapValue", {}).get("fields", {})
                    # Look for videoData first, then video, then top-level fields
                    vid_val = map_val.get("videoData", {}).get("mapValue", {}).get("fields", {})
                    if not vid_val:
                        vid_val = map_val.get("video", {}).get("mapValue", {}).get("fields", {})

                    vid_id = (
                        vid_val.get("id", {}).get("stringValue", "")
                        or map_val.get("videoId", {}).get("stringValue", "")
                        or map_val.get("id", {}).get("stringValue", "")
                    )
                    vid_title = (
                        vid_val.get("title", {}).get("stringValue", "")
                        or map_val.get("title", {}).get("stringValue", "")
                        or map_val.get("text", {}).get("stringValue", "")
                        or "Reference Clip"
                    )
                    vid_thumb = (
                        vid_val.get("thumbnailUrl", {}).get("stringValue", "")
                        or vid_val.get("posterUrl", {}).get("stringValue", "")
                        or map_val.get("imageUrl", {}).get("stringValue", "")
                        or map_val.get("thumbnailUrl", {}).get("stringValue", "")
                    )
                    vid_url = (
                        vid_val.get("videoUrl", {}).get("stringValue", "")
                        or map_val.get("videoUrl", {}).get("stringValue", "")
                    )
                    dur_raw = (
                        vid_val.get("duration", {}).get("doubleValue", 0.0)
                        or vid_val.get("duration", {}).get("integerValue", 0)
                        or map_val.get("duration", {}).get("doubleValue", 0.0)
                        or 0.0
                    )

                    if vid_id and (not vid_url or not vid_thumb) and vid_id in catalog_map:
                        cat_item = catalog_map[vid_id]
                        vid_url = vid_url or cat_item.get("videoUrl", "")
                        vid_thumb = vid_thumb or cat_item.get("thumbnailUrl", "")
                        vid_title = vid_title or cat_item.get("title", "")
                        dur_raw = dur_raw or float(cat_item.get("duration", 0.0) or 0.0)

                    if vid_id or vid_url or vid_thumb:
                        items.append({
                            "id": vid_id or "item_{}".format(len(items)),
                            "title": vid_title,
                            "thumbnailUrl": vid_thumb,
                            "videoUrl": vid_url,
                            "duration": float(dur_raw),
                            "category": "Reference",
                        })

                doc_id = doc.get("name", "").split("/")[-1]
                boards.append({
                    "id": doc_id,
                    "name": name,
                    "thumbnailUrl": thumb or (items[0]["thumbnailUrl"] if items else ""),
                    "itemCount": int(item_count) or len(items),
                    "items": items
                })
            save_cached_moodboards(boards, uid)
            return boards
    except Exception as e:
        cached = get_cached_moodboards(uid)
        if cached:
            return cached
        return []


def upload_playblast_to_animref(mp4_file_path, title="Maya Playblast", progress_callback=None):
    token = get_valid_token()
    user = get_current_user()
    if not token or not user:
        raise RuntimeError("Please sign in to upload playblasts.")

    uid = user.get("uid")
    filename = "playblast_{}_{}.mp4".format(int(time.time()), os.path.basename(mp4_file_path).replace(" ", "_"))
    object_name = "users/{}/playblasts/{}".format(uid, filename)

    encoded_name = urllib_parse.quote(object_name, safe="")
    upload_url = "https://firebasestorage.googleapis.com/v0/b/{}/o?uploadType=media&name={}".format(
        STORAGE_BUCKET, encoded_name
    )

    with open(mp4_file_path, "rb") as f:
        file_bytes = f.read()

    req = urllib_request.Request(
        upload_url,
        data=file_bytes,
        headers={
            "Authorization": "Bearer " + token,
            "Content-Type": "video/mp4",
            "User-Agent": "AnimRef-Animo-Plugin/1.0"
        }
    )
    with urllib_request.urlopen(req, timeout=60) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        download_token = res.get("downloadTokens", "")
        public_url = "https://firebasestorage.googleapis.com/v0/b/{}/o/{}?alt=media&token={}".format(
            STORAGE_BUCKET, urllib_parse.quote(object_name, safe=""), download_token
        )
        return {
            "publicUrl": public_url,
            "filename": filename,
            "objectName": object_name
        }
