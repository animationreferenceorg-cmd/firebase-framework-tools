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
    auth_file = get_auth_file()
    if os.path.isfile(auth_file):
        try:
            os.remove(auth_file)
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


def get_saved_references():
    token = get_valid_token()
    if not token:
        return {"saved": [], "liked": []}

    url = SITE_API_BASE + "/user/saved-references"
    req = urllib_request.Request(
        url,
        headers={
            "Authorization": "Bearer " + token,
            "User-Agent": "AnimRef-Animo-Plugin/1.0"
        }
    )
    try:
        with urllib_request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return {
                "saved": data.get("savedVideos", []),
                "liked": data.get("likedVideos", [])
            }
    except Exception as e:
        return {"saved": [], "liked": [], "error": str(e)}


def get_user_moodboards():
    token = get_valid_token()
    if not token:
        return []
    req = urllib_request.Request(
        SITE_API_BASE + "/user/moodboards",
        headers={"Authorization": "Bearer " + token, "User-Agent": "AnimRef-Animo-Plugin/1.0"}
    )
    try:
        with urllib_request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("moodboards", [])
    except Exception:
        return []


def upload_playblast_to_animref(mp4_file_path, title="Maya Playblast", progress_callback=None):
    raise RuntimeError("Cloud playblast upload is not available yet. Your playblast remains on this computer; load it in the website compare tool.")
