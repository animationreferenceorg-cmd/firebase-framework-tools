"""
Authentication & obfuscated credential management for AnimationReference.org (Blender).

Supports:
- 1-click Browser Sign-In via https://animationreference.org/extension/connect
  (with a short-lived localhost callback listener so Google OAuth & email users
  connect seamlessly without entering a password in Blender).
- Manual Connect Token paste fallback.
- Direct Email/Password sign-in via Firebase Identity Toolkit.
- Automatic ID token refresh.
"""

from __future__ import annotations

import base64
import hashlib
import http.server
import json
import os
import socket
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser

SITE_BASE_URL = os.environ.get("ANIMREF_BASE_URL", "https://animationreference.org").rstrip("/")
CONNECT_PAGE_URL = f"{SITE_BASE_URL}/extension/connect"
USER_AGENT = "AnimRefBlender/2.0"

_active_server = None
_active_server_lock = threading.Lock()


def get_storage_dir() -> str:
    """Return persistent config/cache folder for the Blender addon."""
    override = os.environ.get("ANIMREF_BLENDER_DIR")
    if override:
        os.makedirs(override, exist_ok=True)
        return override
    try:
        import bpy
        cfg = bpy.utils.user_resource("CONFIG", path="animref_studio", create=True)
        if cfg:
            os.makedirs(cfg, exist_ok=True)
            return cfg
    except Exception:
        pass
    base = os.path.join(os.path.expanduser("~"), ".animref_blender")
    os.makedirs(base, exist_ok=True)
    return base


def get_auth_file_path() -> str:
    return os.path.join(get_storage_dir(), "auth.json")


def _machine_key() -> bytes:
    seed = f"animref-blender-v2:{os.path.expanduser('~')}:{os.name}".encode("utf-8")
    return hashlib.sha256(seed).digest()


def _obfuscate(plaintext: str) -> str:
    if not plaintext:
        return ""
    key = _machine_key()
    raw = plaintext.encode("utf-8")
    xored = bytes(b ^ key[i % len(key)] for i, b in enumerate(raw))
    return "obf1:" + base64.urlsafe_b64encode(xored).decode("ascii")


def _deobfuscate(stored: str) -> str:
    if not stored:
        return ""
    if not stored.startswith("obf1:"):
        return stored
    key = _machine_key()
    raw = base64.urlsafe_b64decode(stored[5:].encode("ascii"))
    plain = bytes(b ^ key[i % len(key)] for i, b in enumerate(raw))
    return plain.decode("utf-8", errors="replace")


def save_auth_state(state: dict) -> None:
    payload = dict(state or {})
    for secret_key in ("idToken", "refreshToken", "firebaseApiKey"):
        if payload.get(secret_key):
            payload[secret_key] = _obfuscate(str(payload[secret_key]))
    path = get_auth_file_path()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    os.replace(tmp, path)


def load_auth_state() -> dict | None:
    path = get_auth_file_path()
    if not os.path.isfile(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, dict):
            return None
        for secret_key in ("idToken", "refreshToken", "firebaseApiKey"):
            if data.get(secret_key):
                data[secret_key] = _deobfuscate(str(data[secret_key]))
        return data
    except Exception:
        return None


def sign_out() -> None:
    path = get_auth_file_path()
    if os.path.isfile(path):
        try:
            os.remove(path)
        except Exception:
            pass


def is_signed_in() -> bool:
    state = load_auth_state()
    return bool(state and (state.get("idToken") or state.get("refreshToken")))


def get_account_summary() -> dict:
    state = load_auth_state() or {}
    return {
        "signed_in": bool(state.get("idToken") or state.get("refreshToken")),
        "email": state.get("email", ""),
        "display_name": state.get("displayName") or state.get("email") or "",
        "uid": state.get("uid", ""),
        "is_pro": bool(state.get("isPro", False)),
        "plan": state.get("plan", "free"),
    }


def is_probable_connect_token(text: str) -> bool:
    if not text or not isinstance(text, str):
        return False
    cleaned = text.strip()
    if len(cleaned) < 20 or " " in cleaned:
        return False
    try:
        pad = "=" * (-len(cleaned) % 4)
        decoded = base64.urlsafe_b64decode((cleaned + pad).encode("ascii"))
        obj = json.loads(decoded.decode("utf-8"))
        return isinstance(obj, dict) and bool(obj.get("token") or obj.get("idToken"))
    except Exception:
        return False


def sign_in_with_connect_token(token_str: str) -> dict:
    cleaned = (token_str or "").strip()
    if not cleaned:
        raise ValueError("Please paste a valid Connect Token from animationreference.org/extension/connect.")

    pad = "=" * (-len(cleaned) % 4)
    try:
        decoded = base64.urlsafe_b64decode((cleaned + pad).encode("ascii"))
        bundle = json.loads(decoded.decode("utf-8"))
    except Exception as exc:
        raise ValueError("Invalid Connect Token format.") from exc

    id_token = bundle.get("token") or bundle.get("idToken")
    if not id_token:
        raise ValueError("Connect Token is missing an ID token.")

    state = {
        "idToken": id_token,
        "refreshToken": bundle.get("refreshToken", ""),
        "firebaseApiKey": bundle.get("firebaseApiKey", ""),
        "email": bundle.get("email", ""),
        "displayName": bundle.get("displayName", ""),
        "uid": bundle.get("uid", ""),
        "isPro": bool(bundle.get("isPro", False)),
        "plan": bundle.get("plan", "free"),
        "expiresAt": time.time() + 3300,
    }
    save_auth_state(state)
    return state


def refresh_id_token(state: dict | None = None) -> dict | None:
    current = state or load_auth_state()
    if not current:
        return None
    refresh_tok = current.get("refreshToken")
    api_key = current.get("firebaseApiKey")
    if not refresh_tok or not api_key:
        return current

    url = f"https://securetoken.googleapis.com/v1/token?key={urllib.parse.quote(api_key)}"
    body = urllib.parse.urlencode({
        "grant_type": "refresh_token",
        "refresh_token": refresh_tok,
    }).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        if data.get("id_token"):
            current["idToken"] = data["id_token"]
            if data.get("refresh_token"):
                current["refreshToken"] = data["refresh_token"]
            expires_in = int(data.get("expires_in", 3600))
            current["expiresAt"] = time.time() + max(60, expires_in - 180)
            save_auth_state(current)
            return current
    except Exception:
        pass
    return current


def get_valid_id_token() -> str | None:
    state = load_auth_state()
    if not state:
        return None
    if time.time() >= float(state.get("expiresAt", 0)):
        state = refresh_id_token(state) or state
    return state.get("idToken") or None


def _find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return int(s.getsockname()[1])


def start_browser_auth_flow(on_success=None, open_browser: bool = True) -> str:
    """
    Spin up a short-lived localhost callback server and open the browser connect page.
    Returns the connect URL opened in the browser.
    """
    global _active_server

    with _active_server_lock:
        if _active_server is not None:
            try:
                _active_server.shutdown()
                _active_server.server_close()
            except Exception:
                pass
            _active_server = None

        port = _find_free_port()

        class _CallbackHandler(http.server.BaseHTTPRequestHandler):
            def log_message(self, format, *args):
                return

            def _send_cors(self, code=200, content_type="application/json"):
                self.send_response(code)
                self.send_header("Content-Type", content_type)
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
                self.send_header("Access-Control-Allow-Headers", "Content-Type")
                self.send_header("Access-Control-Allow-Private-Network", "true")
                self.end_headers()

            def do_OPTIONS(self):
                self._send_cors(204)

            def do_GET(self):
                parsed = urllib.parse.urlparse(self.path)
                qs = urllib.parse.parse_qs(parsed.query)
                token_str = (qs.get("payload") or qs.get("token") or [""])[0]
                if token_str:
                    try:
                        state = sign_in_with_connect_token(token_str)
                        self._send_cors(200, "text/html; charset=utf-8")
                        self.wfile.write(
                            b"<html><body style='background:#0d0a18;color:#fff;font-family:sans-serif;text-align:center;padding:60px'>"
                            b"<h2>Connected to Blender!</h2><p>You can close this tab and return to Blender.</p></body></html>"
                        )
                        if on_success:
                            threading.Thread(target=on_success, args=(state,), daemon=True).start()
                        threading.Thread(target=self.server.shutdown, daemon=True).start()
                        return
                    except Exception:
                        pass
                self._send_cors(200)
                self.wfile.write(b'{"status":"waiting"}')

            def do_POST(self):
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw = self.rfile.read(length) if length > 0 else b"{}"
                try:
                    payload = json.loads(raw.decode("utf-8"))
                    if payload.get("token") and is_probable_connect_token(payload["token"]):
                        state = sign_in_with_connect_token(payload["token"])
                    elif payload.get("token") or payload.get("idToken"):
                        state = {
                            "idToken": payload.get("token") or payload.get("idToken"),
                            "refreshToken": payload.get("refreshToken", ""),
                            "firebaseApiKey": payload.get("firebaseApiKey", ""),
                            "email": payload.get("email", ""),
                            "displayName": payload.get("displayName", ""),
                            "uid": payload.get("uid", ""),
                            "isPro": bool(payload.get("isPro", False)),
                            "plan": payload.get("plan", "free"),
                            "expiresAt": time.time() + 3300,
                        }
                        save_auth_state(state)
                    else:
                        raise ValueError("Missing token")
                    self._send_cors(200)
                    self.wfile.write(b'{"ok":true}')
                    if on_success:
                        threading.Thread(target=on_success, args=(state,), daemon=True).start()
                    threading.Thread(target=self.server.shutdown, daemon=True).start()
                except Exception as exc:
                    self._send_cors(400)
                    self.wfile.write(json.dumps({"ok": False, "error": str(exc)}).encode("utf-8"))

        server = http.server.HTTPServer(("127.0.0.1", port), _CallbackHandler)
        server.timeout = 180
        _active_server = server

        def _serve():
            try:
                server.serve_forever(poll_interval=0.5)
            except Exception:
                pass
            finally:
                try:
                    server.server_close()
                except Exception:
                    pass

        threading.Thread(target=_serve, daemon=True).start()

    url = f"{CONNECT_PAGE_URL}?extension_id=animref_blender&client=blender&port={port}"
    if open_browser:
        webbrowser.open(url)
    return url
