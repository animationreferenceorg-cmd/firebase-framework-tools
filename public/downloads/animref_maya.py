"""
=============================================================================
AnimationReference.org - Official Autodesk Maya Bridge Tool
=============================================================================
This tool allows animators to load animation references from AnimationReference.org
directly into Maya's 3D Viewport as a synchronized Camera Image Plane.

HOW TO USE IN MAYA:
1. Drag & drop this file into your Maya 3D viewport, OR
2. Open Maya's Script Editor (Python tab), paste this code, and press Run (Ctrl+Enter).
3. Click "Start Bridge Server" to enable 1-click "Send to Maya" from the browser!
=============================================================================
"""

import sys
import json
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler

try:
    import maya.cmds as cmds
    import maya.utils as utils
    MAYA_AVAILABLE = True
except ImportError:
    MAYA_AVAILABLE = False
    print("[AnimRef] Warning: Not running inside Autodesk Maya.")

BRIDGE_PORT = 9876
_server_instance = None
_server_thread = None

def setup_reference_camera(video_url, title="AnimationReference", fps=24):
    """
    Creates or updates a dedicated Reference Camera in Maya with a synchronized
    imagePlane displaying the reference video.
    """
    if not MAYA_AVAILABLE:
        print(f"[AnimRef] Simulation: Would load '{video_url}' into Maya camera.")
        return

    clean_title = "".join(c for c in title if c.isalnum() or c == "_")[:24]
    cam_name = f"RefCam_{clean_title}" if clean_title else "RefCam_AnimRef"

    # Check if camera already exists or create a new one
    if cmds.objExists(cam_name):
        cam = cam_name
    else:
        cam, cam_shape = cmds.camera(name=cam_name)
        cmds.setAttr(f"{cam}.translate", 0, 100, 300)
        cmds.setAttr(f"{cam}.rotate", 0, 0, 0)
        cmds.setAttr(f"{cam_shape}.renderable", 0)

    # Attach or create Image Plane
    existing_planes = cmds.imagePlane(camera=cam, query=True)
    if existing_planes:
        img_plane = existing_planes[0]
    else:
        created = cmds.imagePlane(camera=cam)
        img_plane = created[1] if len(created) > 1 else created[0]

    # Configure Image Plane attributes
    try:
        cmds.setAttr(f"{img_plane}.imageName", video_url, type="string")
    except Exception:
        pass
    
    try:
        cmds.setAttr(f"{img_plane}.useFrameExtension", 1)
        cmds.setAttr(f"{img_plane}.fit", 2) # Fit to resolution gate
        cmds.setAttr(f"{img_plane}.depth", 1000) # Keep behind character rig
        cmds.setAttr(f"{img_plane}.lockedToCamera", 1)
    except Exception as e:
        print(f"[AnimRef] Note on imagePlane attributes: {e}")

    # Select and frame camera
    cmds.select(cam)
    print(f"\n[AnimRef] Successfully created Reference Camera: '{cam}' with clip '{title}'!")
    
    # Show in-view message
    try:
        cmds.inViewMessage(
            amg=f"<hl>Animation Reference Loaded:</hl><br>{title}",
            pos='topCenter',
            fade=True,
            fot=2000
        )
    except Exception:
        pass

class AnimRefRequestHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        if self.path == '/load-clip' or self.path == '/':
            content_len = int(self.headers.get('Content-Length', 0))
            post_body = self.rfile.read(content_len)
            try:
                data = json.loads(post_body.decode('utf-8'))
                video_url = data.get('videoUrl', '')
                title = data.get('title', 'Animation Reference')
                fps = data.get('fps', 24)

                if MAYA_AVAILABLE:
                    utils.executeDeferred(setup_reference_camera, video_url, title, fps)
                else:
                    setup_reference_camera(video_url, title, fps)

                self.send_response(200)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "ok", "message": f"Loaded '{title}' into Maya"}).encode('utf-8'))
                return
            except Exception as err:
                self.send_response(400)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(str(err).encode('utf-8'))
                return

        self.send_response(404)
        self.end_headers()

    def do_GET(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({
            "name": "AnimationReference Maya Bridge",
            "version": "1.0",
            "status": "listening",
            "port": BRIDGE_PORT
        }).encode('utf-8'))

    def log_message(self, format, *args):
        # Silence standard HTTP logs in Maya output
        pass

def start_bridge(port=BRIDGE_PORT):
    global _server_instance, _server_thread
    if _server_thread and _server_thread.is_alive():
        print(f"[AnimRef] Bridge server is already listening on port {port}.")
        return

    try:
        _server_instance = HTTPServer(('127.0.0.1', port), AnimRefRequestHandler)
        _server_thread = threading.Thread(target=_server_instance.serve_forever, daemon=True)
        _server_thread.start()
        print(f"\n==================================================================")
        print(f"  [AnimRef] Maya Bridge Server Active on http://127.0.0.1:{port}!")
        print(f"  Now click 'Send to Maya' on AnimationReference.org to stream clips.")
        print(f"==================================================================\n")
    except Exception as e:
        print(f"[AnimRef] Could not start bridge server: {e}")

def create_shelf_button():
    if not MAYA_AVAILABLE:
        return
    try:
        import maya.mel as mel
        top_shelf = mel.eval("$gShelfTopLevel = $gShelfTopLevel")
        current_shelf = cmds.tabLayout(top_shelf, query=True, selectTab=True) or "Custom"
        
        existing = cmds.shelfLayout(current_shelf, query=True, childArray=True) or []
        for btn in existing:
            if cmds.objectTypeUI(btn, isType="shelfButton") and cmds.shelfButton(btn, query=True, label=True) == "AnimRef":
                cmds.deleteUI(btn)

        cmds.shelfButton(
            parent=current_shelf,
            label="AnimRef",
            annotation="AnimationReference.org Bridge",
            imageOverlayLabel="REF",
            image="camera.png",
            command="import animref_maya; animref_maya.start_bridge()",
            sourceType="python"
        )
        print(f"[AnimRef] Created shelf button 'AnimRef' on '{current_shelf}' shelf.")
    except Exception as e:
        print(f"[AnimRef] Shelf setup notice: {e}")

def onMayaDroppedAndLoaded(*args, **kwargs):
    start_bridge()
    if MAYA_AVAILABLE:
        create_shelf_button()
        try:
            cmds.inViewMessage(
                amg="<hl>Animation Reference Active!</hl><br>Added 'AnimRef' button to your shelf.<br>Now click 'Send to Maya' in your browser!",
                pos='topCenter',
                fade=True,
                fot=3500
            )
        except Exception:
            pass

# Run bridge on script load
if __name__ == "__main__" or MAYA_AVAILABLE:
    start_bridge()
    if MAYA_AVAILABLE:
        create_shelf_button()
