from __future__ import absolute_import, division, print_function

import os
import sys
import json
import time
import re
import base64
import threading
import webbrowser
import urllib.request as urllib_request
import urllib.parse as urllib_parse
import urllib.error as urllib_error

try:
    from http.server import BaseHTTPRequestHandler, HTTPServer
except ImportError:
    from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer

FIREBASE_API_KEY = "AIzaSyAnbGJpTKPNBzLMb81bU7e8AY5k0x6E5Kg"
STORAGE_BUCKET = "aniamtion-reference.firebasestorage.app"
SITE_API_BASE = "https://animationreference.org/api"
BROWSER_CONNECT_URL = "https://animationreference.org/extension/connect?extension_id=animo_maya&client=maya"

_OBF_KEY = b"AnimoAnimRefStudioKey2026"

def get_user_cache_dir():
    # 1. Search candidate directories where Maya or Animo preferences live
    candidates = []
    module_dir = os.path.dirname(os.path.abspath(__file__))
    candidates.append(os.path.normpath(os.path.join(module_dir, "..", "..", "..", "Animo_Prefs", "animref_cache")))
    candidates.append(os.path.normpath(os.path.join(module_dir, "..", "Animo_Prefs", "animref_cache")))

    # Standard Maya document directories on Windows/Mac/Linux
    user_home = os.path.expanduser("~")
    for doc_root in [
        os.path.join(user_home, "OneDrive", "Documents", "maya"),
        os.path.join(user_home, "Documents", "maya"),
        os.path.join(user_home, "maya"),
    ]:
        candidates.append(os.path.normpath(os.path.join(doc_root, "Animo_Prefs", "animref_cache")))
        candidates.append(os.path.normpath(os.path.join(doc_root, "scripts", "Animo_Data", "Animo_Prefs", "animref_cache")))

    # If any candidate already has auth.json or moodboard cache, prefer it immediately!
    for c in candidates:
        if os.path.isfile(os.path.join(c, "auth.json")):
            os.makedirs(c, exist_ok=True)
            return c

    for c in candidates:
        if os.path.isdir(c):
            return c

    default_dir = candidates[0]
    os.makedirs(default_dir, exist_ok=True)
    return default_dir


def get_auth_file():
    # Scan all candidates for an existing auth.json
    cache_dir = get_user_cache_dir()
    primary = os.path.join(cache_dir, "auth.json")
    if os.path.isfile(primary):
        return primary

    user_home = os.path.expanduser("~")
    for doc_root in [
        os.path.join(user_home, "OneDrive", "Documents", "maya"),
        os.path.join(user_home, "Documents", "maya"),
    ]:
        for sub in [
            os.path.join(doc_root, "Animo_Prefs", "animref_cache", "auth.json"),
            os.path.join(doc_root, "scripts", "Animo_Data", "Animo_Prefs", "animref_cache", "auth.json"),
        ]:
            if os.path.isfile(sub):
                return sub

    os.makedirs(cache_dir, exist_ok=True)
    return primary


AUTH_CACHE_FILE = get_auth_file()


def _obfuscate_str(plain_text):
    if not plain_text:
        return ""
    raw = str(plain_text).encode("utf-8")
    xored = bytearray(len(raw))
    for i, b in enumerate(raw):
        xored[i] = b ^ _OBF_KEY[i % len(_OBF_KEY)]
    return "obf1:" + base64.urlsafe_b64encode(bytes(xored)).decode("ascii")


def _deobfuscate_str(value):
    if not value or not isinstance(value, str):
        return value
    if not value.startswith("obf1:"):
        return value
    try:
        enc = value[5:].encode("ascii")
        xored = base64.urlsafe_b64decode(enc)
        out = bytearray(len(xored))
        for i, b in enumerate(xored):
            out[i] = b ^ _OBF_KEY[i % len(_OBF_KEY)]
        return bytes(out).decode("utf-8")
    except Exception:
        return value


def load_cached_auth():
    auth_file = get_auth_file()
    if os.path.isfile(auth_file):
        try:
            with open(auth_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, dict):
                if "idToken" in data and isinstance(data["idToken"], str):
                    data["idToken"] = _deobfuscate_str(data["idToken"])
                if "refreshToken" in data and isinstance(data["refreshToken"], str):
                    data["refreshToken"] = _deobfuscate_str(data["refreshToken"])
                return data
        except Exception:
            return None
    return None


def save_cached_auth(data):
    auth_file = get_auth_file()
    try:
        disk_copy = dict(data or {})
        if disk_copy.get("idToken"):
            disk_copy["idToken"] = _obfuscate_str(disk_copy["idToken"])
        if disk_copy.get("refreshToken"):
            disk_copy["refreshToken"] = _obfuscate_str(disk_copy["refreshToken"])
        os.makedirs(os.path.dirname(auth_file), exist_ok=True)
        with open(auth_file, "w", encoding="utf-8") as f:
            json.dump(disk_copy, f, indent=2)
    except Exception:
        pass


def _decode_jwt_payload(jwt_token):
    try:
        parts = str(jwt_token).split(".")
        if len(parts) < 2:
            return {}
        payload_b64 = parts[1]
        padding = "=" * ((4 - len(payload_b64) % 4) % 4)
        raw = base64.urlsafe_b64decode((payload_b64 + padding).encode("ascii"))
        return json.loads(raw.decode("utf-8"))
    except Exception:
        return {}


def sign_in_with_token(token_or_payload, refresh_token=None):
    """
    Signs in using a browser connect code / JSON payload or Firebase ID token.
    Allows Google OAuth users on animationreference.org to authenticate in Maya without a password.
    """
    if not token_or_payload or not str(token_or_payload).strip():
        return {"success": False, "error": "Please paste a valid connect token."}

    raw = str(token_or_payload).strip()
    id_token = raw
    parsed_email = None
    parsed_uid = None
    parsed_name = None

    # Support JSON or base64-encoded JSON connect bundles
    if raw.startswith("{") and raw.endswith("}"):
        try:
            bundle = json.loads(raw)
            id_token = bundle.get("idToken") or bundle.get("token") or id_token
            refresh_token = refresh_token or bundle.get("refreshToken")
            parsed_email = bundle.get("email")
            parsed_uid = bundle.get("uid") or bundle.get("localId")
            parsed_name = bundle.get("displayName")
        except Exception:
            pass
    elif "." not in raw:
        try:
            pad = "=" * ((4 - len(raw) % 4) % 4)
            decoded = base64.urlsafe_b64decode((raw + pad).encode("ascii")).decode("utf-8")
            if decoded.startswith("{"):
                bundle = json.loads(decoded)
                id_token = bundle.get("idToken") or bundle.get("token") or id_token
                refresh_token = refresh_token or bundle.get("refreshToken")
                parsed_email = bundle.get("email")
                parsed_uid = bundle.get("uid") or bundle.get("localId")
                parsed_name = bundle.get("displayName")
        except Exception:
            pass

    if not id_token:
        return {"success": False, "error": "Could not extract a valid ID token."}

    # Try looking up account profile via Firebase Identity Toolkit
    lookup_url = "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + FIREBASE_API_KEY
    req = urllib_request.Request(
        lookup_url,
        data=json.dumps({"idToken": id_token}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib_request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            users = data.get("users") or []
            if users:
                u = users[0]
                parsed_uid = u.get("localId") or parsed_uid
                parsed_email = u.get("email") or parsed_email
                parsed_name = u.get("displayName") or parsed_name
    except urllib_error.HTTPError as e:
        try:
            err = json.loads(e.read().decode("utf-8"))
            msg = err.get("error", {}).get("message", "Invalid token")
        except Exception:
            msg = str(e)
        return {"success": False, "error": msg}
    except Exception:
        # Fallback to JWT claims if network lookup fails
        pass

    claims = _decode_jwt_payload(id_token)
    uid = parsed_uid or claims.get("user_id") or claims.get("sub") or "user"
    email = parsed_email or claims.get("email") or "connected@animationreference.org"
    display_name = parsed_name or claims.get("name") or (email.split("@")[0] if "@" in email else "Animator")
    exp = claims.get("exp")
    expires_at = float(exp) - 60 if exp else (time.time() + 3540)

    auth_record = {
        "idToken": id_token,
        "refreshToken": refresh_token or "",
        "uid": uid,
        "email": email,
        "displayName": display_name,
        "expiresAt": expires_at,
    }
    save_cached_auth(auth_record)
    return {"success": True, "user": auth_record}


def is_probable_connect_token(text):
    """Returns True if clipboard text looks like a base64 connect bundle or JWT from AnimationReference.org."""
    if not text or not isinstance(text, str):
        return False
    raw = text.strip()
    if len(raw) < 60 or len(raw) > 12000 or " " in raw or "\n" in raw:
        return False
    if raw.startswith("eyJ") and raw.count(".") == 2:
        return True
    try:
        pad = "=" * ((4 - len(raw) % 4) % 4)
        decoded = base64.urlsafe_b64decode((raw + pad).encode("ascii")).decode("utf-8")
        if decoded.startswith("{") and ("token" in decoded or "idToken" in decoded) and ("refreshToken" in decoded or "firebaseApiKey" in decoded):
            return True
    except Exception:
        pass
    return False


_ACTIVE_AUTH_SERVER = None


def start_browser_auth_flow(on_complete_callback=None, open_browser=True):
    """
    Launches AnimationReference.org in the user's browser and listens on a temporary
    localhost callback port so sign-in completes automatically as soon as they log in.
    """
    global _ACTIVE_AUTH_SERVER
    state_nonce = "maya_" + str(int(time.time() * 1000))
    completed = {"done": False}

    class _CallbackHandler(BaseHTTPRequestHandler):
        def log_message(self, format, *args):
            pass

        def _send_cors_headers(self, status_code=200, content_type="application/json"):
            self.send_response(status_code)
            self.send_header("Content-Type", content_type)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
            self.end_headers()

        def do_OPTIONS(self):
            self._send_cors_headers(204)

        def do_GET(self):
            parsed = urllib_parse.urlparse(self.path)
            qs = urllib_parse.parse_qs(parsed.query)
            payload = (qs.get("payload") or qs.get("token") or [""])[0]
            if payload and not completed["done"]:
                completed["done"] = True
                self._send_cors_headers(200, "text/html; charset=utf-8")
                self.wfile.write(b"<html><body style='font-family:sans-serif;text-align:center;padding:40px;'><h2>Connected to Autodesk Maya!</h2><p>You can close this tab and return to Maya.</p></body></html>")
                t_get = threading.Thread(target=lambda: _finish_token(payload))
                t_get.daemon = True
                t_get.start()
            else:
                self._send_cors_headers(200)
                self.wfile.write(b'{"ok":true}')

        def do_POST(self):
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
            except Exception:
                length = 0
            body = self.rfile.read(length).decode("utf-8") if length > 0 else ""
            self._send_cors_headers(200)
            self.wfile.write(b'{"success":true}')
            if body and not completed["done"]:
                completed["done"] = True
                t_post = threading.Thread(target=lambda: _finish_token(body))
                t_post.daemon = True
                t_post.start()

    def _finish_token(raw_payload):
        res = sign_in_with_token(raw_payload)
        if on_complete_callback:
            try:
                on_complete_callback(res)
            except Exception:
                pass

    port = 0
    try:
        if _ACTIVE_AUTH_SERVER is not None:
            try:
                _ACTIVE_AUTH_SERVER.server_close()
            except Exception:
                pass
        server = HTTPServer(("127.0.0.1", 0), _CallbackHandler)
        server.timeout = 1.0
        _ACTIVE_AUTH_SERVER = server
        port = server.server_port

        def _serve_loop():
            deadline = time.time() + 180.0
            while time.time() < deadline and not completed["done"] and _ACTIVE_AUTH_SERVER is server:
                try:
                    server.handle_request()
                except Exception:
                    break
            try:
                server.server_close()
            except Exception:
                pass

        t = threading.Thread(target=_serve_loop)
        t.daemon = True
        t.start()
    except Exception:
        port = 0

    target_url = BROWSER_CONNECT_URL
    if port > 0:
        sep = "&" if "?" in target_url else "?"
        target_url = "{}{}port={}&state={}".format(target_url, sep, port, state_nonce)

    if open_browser:
        try:
            webbrowser.open(target_url)
        except Exception:
            pass

    return target_url


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

    targets = {get_auth_file()}
    user_home = os.path.expanduser("~")
    for doc_root in [
        os.path.join(user_home, "OneDrive", "Documents", "maya"),
        os.path.join(user_home, "Documents", "maya"),
        os.path.join(user_home, "maya"),
    ]:
        targets.add(os.path.normpath(os.path.join(doc_root, "Animo_Prefs", "animref_cache", "auth.json")))
        targets.add(os.path.normpath(os.path.join(doc_root, "scripts", "Animo_Data", "Animo_Prefs", "animref_cache", "auth.json")))

    for t in targets:
        if os.path.isfile(t):
            try:
                os.remove(t)
            except Exception:
                pass


_MEM_SAVED_CACHE = {}
_MEM_BOARDS_CACHE = {}



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

    id_token = auth.get("idToken")
    if not id_token:
        return None

    payload = _decode_jwt_payload(id_token) if id_token else {}
    jwt_exp = float(payload.get("exp", 0))
    stored_exp = float(auth.get("expiresAt", 0))

    # Evaluate real expiration (use JWT exp claim if present, otherwise stored_exp)
    is_expired = False
    now = time.time()
    if jwt_exp > 0:
        is_expired = (now > (jwt_exp - 60))
    elif stored_exp > 0:
        is_expired = (now > stored_exp)

    if is_expired:
        refresh_token = auth.get("refreshToken")
        if not refresh_token:
            sign_out()
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
                new_id = data.get("id_token")
                auth["idToken"] = new_id
                auth["refreshToken"] = data.get("refresh_token") or refresh_token
                new_payload = _decode_jwt_payload(new_id)
                new_exp = float(new_payload.get("exp") or 0)
                if new_exp > 0:
                    auth["expiresAt"] = new_exp
                else:
                    auth["expiresAt"] = time.time() + int(data.get("expires_in", 3600)) - 60
                save_cached_auth(auth)
                return new_id
        except urllib_error.HTTPError as http_err:
            if http_err.code in (400, 401, 403):
                # Token is expired, revoked, or disabled: clean up stale cache
                sign_out()
            return None
        except Exception:
            return None

    return id_token


def get_cached_user_fast():
    """Non-blocking check for cached user credentials (safe to call on the Maya UI thread)."""
    auth = load_cached_auth()
    if not auth:
        return None
    # If auth has expired by more than 24 hours, verify via refresh
    if auth.get("expiresAt") and (time.time() - float(auth.get("expiresAt", 0)) > 86400):
        valid_tok = get_valid_token()
        if not valid_tok:
            return None
        return load_cached_auth()
    if auth.get("idToken") or auth.get("refreshToken"):
        return auth
    return None


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

                        vid_Data = item.get("videoData") or item.get("video") or {}
                        vid_id = vid_id or vid_Data.get("id") or item.get("videoId")
                        vid_url = vid_url or vid_Data.get("videoUrl", "")
                        vid_thumb = vid_thumb or vid_Data.get("thumbnailUrl") or vid_Data.get("posterUrl") or item.get("imageUrl") or ""
                        vid_title = vid_title if vid_title != "Reference Clip" else (vid_Data.get("title") or item.get("title") or "Reference Clip")
                        dur = dur or float(vid_Data.get("duration", 0.0) or 0.0)
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
                            "posterUrl": vid_Data.get("posterUrl") or vid_thumb,
                            "imageUrl": item.get("imageUrl") or vid_thumb,
                            "videoUrl": vid_url,
                            "duration": dur,
                            "category": item.get("category") or vid_Data.get("category") or "General",
                            "tags": item.get("tags") or vid_Data.get("tags") or [],
                            "author_name": item.get("author_name") or vid_Data.get("author_name") or vid_Data.get("uploader") or "",
                            "source": item.get("source") or vid_Data.get("source") or item.get("mediaType") or item.get("type") or "",
                            "sourceUrl": item.get("sourceUrl") or vid_Data.get("sourceUrl") or "",
                            "embedUrl": item.get("embedUrl") or vid_Data.get("embedUrl") or "",
                            "mediaType": item.get("mediaType") or vid_Data.get("mediaType") or item.get("type") or "",
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

                    source_type = (
                        vid_val.get("source", {}).get("stringValue", "")
                        or vid_val.get("mediaType", {}).get("stringValue", "")
                        or map_val.get("source", {}).get("stringValue", "")
                        or map_val.get("mediaType", {}).get("stringValue", "")
                        or ("model3d" if "sketchfab" in str(vid_id).lower() or "sf_" in str(vid_id) else "Reference")
                    )
                    source_url = (
                        vid_val.get("sourceUrl", {}).get("stringValue", "")
                        or map_val.get("sourceUrl", {}).get("stringValue", "")
                        or ""
                    )
                    embed_url = (
                        vid_val.get("embedUrl", {}).get("stringValue", "")
                        or map_val.get("embedUrl", {}).get("stringValue", "")
                        or ""
                    )

                    if vid_id or vid_url or vid_thumb:
                        items.append({
                            "id": vid_id or "item_{}".format(len(items)),
                            "title": vid_title,
                            "thumbnailUrl": vid_thumb,
                            "videoUrl": vid_url,
                            "duration": float(dur_raw),
                            "category": "Reference",
                            "source": source_type,
                            "sourceUrl": source_url,
                            "embedUrl": embed_url,
                            "mediaType": source_type,
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


def toggle_save_reference(video_id, video_data=None):
    """Toggles saving a reference clip in the user's saved library cache and syncs with the server."""
    if not video_id:
        return {"success": False, "error": "Missing video_id"}

    user = get_current_user()
    token = get_valid_token()
    if not user or not token:
        return {"success": False, "error": "Not signed in"}

    uid = user.get("uid")
    current = get_cached_saved_references(uid) or {"saved": [], "liked": []}
    saved_list = list(current.get("saved") or [])

    existing_idx = next((i for i, v in enumerate(saved_list) if str(v.get("id")) == str(video_id)), None)
    if existing_idx is not None:
        saved_list.pop(existing_idx)
        is_saved = False
    else:
        entry = dict(video_data) if isinstance(video_data, dict) else {"id": str(video_id)}
        if not entry.get("title"):
            try:
                from . import animref_api
                for c in animref_api.load_catalog():
                    if str(c.get("id")) == str(video_id):
                        entry = dict(c)
                        break
            except Exception:
                pass
        saved_list.insert(0, entry)
        is_saved = True

    updated = {"saved": saved_list, "liked": list(current.get("liked") or [])}
    save_cached_saved_references(updated, uid)
    return {"success": True, "isSaved": is_saved}


def upload_playblast_to_animref(
    mp4_file_path,
    title="Maya Playblast",
    category="Acting",
    tags="maya,playblast",
    board_id="",
    is_private=False,
    progress_callback=None,
):
    """Uploads a recorded Maya playblast (.mp4 or .avi) directly to AnimationReference.org."""
    if not mp4_file_path or not os.path.isfile(mp4_file_path):
        raise RuntimeError("Playblast file not found: {}".format(mp4_file_path))

    token = get_valid_token()
    if not token:
        raise RuntimeError("Please sign in to AnimationReference.org in the Account tab first.")

    upload_path = mp4_file_path
    temp_converted = None
    if upload_path.lower().endswith(".avi"):
        try:
            from . import animref_playblast
        except (ImportError, ValueError):
            import animref_playblast
        upload_path = animref_playblast.convert_to_mp4(mp4_file_path)
        if upload_path != mp4_file_path:
            temp_converted = upload_path

    try:
        if progress_callback:
            progress_callback(15, 100)

        with open(upload_path, "rb") as f:
            file_bytes = f.read()

        filename = os.path.basename(upload_path)
        ext = os.path.splitext(filename)[1].lower()
        mime_type = "video/quicktime" if ext == ".mov" else "video/mp4"

        boundary = "----AnimRefBoundary{}".format(int(time.time() * 1000))
        parts = []

        fields = {
            "title": (title or "Maya Playblast").strip()[:120],
            "category": (category or "Acting").strip()[:60],
            "tags": (tags or "maya,playblast").strip(),
            "isPrivate": "true" if is_private else "false",
        }
        if board_id:
            fields["boardId"] = str(board_id).strip()

        for k, v in fields.items():
            parts.append(("--" + boundary + "\r\n").encode("utf-8"))
            parts.append(('Content-Disposition: form-data; name="{}"\r\n\r\n'.format(k)).encode("utf-8"))
            parts.append((str(v) + "\r\n").encode("utf-8"))

        parts.append(("--" + boundary + "\r\n").encode("utf-8"))
        parts.append((
            'Content-Disposition: form-data; name="file"; filename="{}"\r\n'
            'Content-Type: {}\r\n\r\n'
        ).format(filename, mime_type).encode("utf-8"))
        parts.append(file_bytes)
        parts.append(("\r\n--" + boundary + "--\r\n").encode("utf-8"))

        body = b"".join(parts)
        if progress_callback:
            progress_callback(45, 100)

        url = SITE_API_BASE + "/clips/upload"
        req = urllib_request.Request(
            url,
            data=body,
            headers={
                "Authorization": "Bearer " + token,
                "Content-Type": "multipart/form-data; boundary=" + boundary,
                "Content-Length": str(len(body)),
                "User-Agent": "AnimoMayaPlugin/2.0",
            },
            method="POST",
        )

        try:
            with urllib_request.urlopen(req, timeout=120) as resp:
                raw = resp.read().decode("utf-8")
                data = json.loads(raw)
        except urllib_error.HTTPError as he:
            err_body = ""
            try:
                err_body = he.read().decode("utf-8")
                err_json = json.loads(err_body)
                msg = err_json.get("message") or err_json.get("error") or err_body
            except Exception:
                msg = err_body or str(he)
            raise RuntimeError("Upload failed ({}): {}".format(he.code, msg))

        if progress_callback:
            progress_callback(100, 100)

        rel_url = data.get("url") or ""
        full_url = ("https://animationreference.org" + rel_url) if rel_url.startswith("/") else rel_url
        return {
            "id": data.get("id", ""),
            "url": full_url,
            "uploadedMediaUrl": data.get("uploadedMediaUrl", ""),
        }
    finally:
        if temp_converted and os.path.isfile(temp_converted):
            try:
                os.remove(temp_converted)
            except Exception:
                pass
