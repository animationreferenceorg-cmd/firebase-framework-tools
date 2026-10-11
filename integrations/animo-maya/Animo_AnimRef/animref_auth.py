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
    user = get_current_user()
    if not token or not user:
        return []

    uid = user.get("uid")
    # Query Firestore REST for user's moodboards
    url = "https://firestore.googleapis.com/v1/projects/aniamtion-reference/databases/(default)/documents/users/{}/moodboards".format(uid)
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
            docs = data.get("documents", [])
            boards = []
            for doc in docs:
                fields = doc.get("fields", {})
                name = fields.get("name", {}).get("stringValue", "Untitled Board")
                thumb = fields.get("thumbnailUrl", {}).get("stringValue", "")
                item_count = fields.get("itemCount", {}).get("integerValue", 0)

                # Parse items array
                raw_items = fields.get("items", {}).get("arrayValue", {}).get("values", [])
                items = []
                for val in raw_items:
                    map_val = val.get("mapValue", {}).get("fields", {})
                    vid_val = map_val.get("video", {}).get("mapValue", {}).get("fields", {})
                    if vid_val:
                        items.append({
                            "id": vid_val.get("id", {}).get("stringValue", ""),
                            "title": vid_val.get("title", {}).get("stringValue", "Reference Clip"),
                            "thumbnailUrl": vid_val.get("thumbnailUrl", {}).get("stringValue", ""),
                            "videoUrl": vid_val.get("videoUrl", {}).get("stringValue", ""),
                            "duration": float(vid_val.get("duration", {}).get("doubleValue", 0.0) or vid_val.get("duration", {}).get("integerValue", 0)),
                        })

                doc_id = doc.get("name", "").split("/")[-1]
                boards.append({
                    "id": doc_id,
                    "name": name,
                    "thumbnailUrl": thumb,
                    "itemCount": int(item_count) or len(items),
                    "items": items
                })
            return boards
    except Exception as e:
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
