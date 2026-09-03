"""
AnimationReference.org - Blender Background Bridge Server
Runs an HTTP server on port 9877 to receive 1-click 'Send to Blender' signals.
"""

import json
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
import bpy

BRIDGE_PORT = 9877
_server = None
_thread = None

class BlenderBridgeHandler(BaseHTTPRequestHandler):
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
            "plugin": "AnimationReference Blender Studio Add-on",
            "version": "1.0.0",
            "status": "listening",
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
                    bpy.ops.animref.load_reference(
                        video_url=video_url,
                        title=title,
                        fps=fps
                    )

                # Execute safely on Blender's main loop
                bpy.app.timers.register(_apply, first_interval=0.01)

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
        _server = HTTPServer(('127.0.0.1', port), BlenderBridgeHandler)
        _thread = threading.Thread(target=_server.serve_forever, daemon=True)
        _thread.start()
        print(f"[AnimRef] Blender Bridge Server listening on port {port}.")
        return True
    except Exception as e:
        print(f"[AnimRef] Could not start Blender bridge: {e}")
        return False

def stop_server():
    global _server, _thread
    if _server:
        _server.shutdown()
        _server.server_close()
        _server = None
        _thread = None
        print("[AnimRef] Blender Bridge Server stopped.")
