"""
AnimationReference.org - Maya Background Bridge Server
Runs a lightweight HTTP server on port 9876 to receive 1-click 'Send to Maya' signals.
"""

import json
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler

try:
    import maya.utils as utils
    MAYA_AVAILABLE = True
except ImportError:
    MAYA_AVAILABLE = False

try:
    import animref_camera
except ImportError:
    from . import animref_camera

BRIDGE_PORT = 9876
_server = None
_thread = None
_on_clip_received_callbacks = []

def register_clip_callback(callback):
    if callback not in _on_clip_received_callbacks:
        _on_clip_received_callbacks.append(callback)

class MayaBridgeHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({
            "plugin": "AnimationReference Maya Studio Bridge",
            "version": "1.0.0",
            "status": "active",
            "port": BRIDGE_PORT
        }).encode('utf-8'))

    def do_POST(self):
        if self.path in ['/load-clip', '/']:
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body.decode('utf-8'))
                video_url = data.get('videoUrl', '')
                title = data.get('title', 'Reference')
                fps = data.get('fps', 24)

                def _apply():
                    cam, img_plane = animref_camera.setup_reference_camera(video_url, title, fps)
                    for cb in _on_clip_received_callbacks:
                        try:
                            cb(video_url, title, fps, cam, img_plane)
                        except Exception as e:
                            print(f"[AnimRef] Callback error: {e}")

                if MAYA_AVAILABLE:
                    utils.executeDeferred(_apply)
                else:
                    _apply()

                self.send_response(200)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "ok", "clip": title}).encode('utf-8'))
                return
            except Exception as err:
                self.send_response(400)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(str(err).encode('utf-8'))
                return

        self.send_response(404)
        self.end_headers()

    def log_message(self, format, *args):
        pass

def start_server(port=BRIDGE_PORT):
    global _server, _thread
    if _thread and _thread.is_alive():
        return True

    try:
        _server = HTTPServer(('127.0.0.1', port), MayaBridgeHandler)
        _thread = threading.Thread(target=_server.serve_forever, daemon=True)
        _thread.start()
        print(f"[AnimRef] Maya Bridge Server listening on port {port}.")
        return True
    except Exception as e:
        print(f"[AnimRef] Could not start bridge server: {e}")
        return False

def stop_server():
    global _server, _thread
    if _server:
        _server.shutdown()
        _server.server_close()
        _server = None
        _thread = None
        print("[AnimRef] Maya Bridge Server stopped.")
