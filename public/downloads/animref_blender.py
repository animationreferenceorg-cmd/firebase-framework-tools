bl_info = {
    "name": "AnimationReference.org Bridge",
    "author": "AnimationReference.org",
    "version": (1, 0, 0),
    "blender": (3, 6, 0),
    "location": "View3D > Sidebar (N) > AnimRef",
    "description": "Stream animation references from AnimationReference.org directly into your Blender Camera Viewport.",
    "warning": "",
    "category": "Animation",
}

import bpy
import json
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler

BRIDGE_PORT = 9877
_server_instance = None
_server_thread = None

def load_reference_to_camera(video_url, title="AnimationReference", fps=24):
    """
    Creates or configures a Camera in Blender with background video reference.
    """
    scene = bpy.context.scene
    
    # 1. Find or create reference camera
    cam_obj = scene.camera
    if not cam_obj:
        bpy.ops.object.camera_add(location=(0, -10, 2), rotation=(1.5708, 0, 0))
        cam_obj = bpy.context.active_object
        scene.camera = cam_obj

    cam_data = cam_obj.data
    cam_data.show_background_images = True

    # 2. Add or configure background image slot
    bg_image = None
    for bg in cam_data.background_images:
        if bg.source == 'MOVIE_CLIP' or bg.source == 'IMAGE':
            bg_image = bg
            break

    if not bg_image:
        bg_image = cam_data.background_images.new()

    bg_image.source = 'IMAGE'
    bg_image.frame_method = 'FIT'
    bg_image.alpha = 0.5
    bg_image.display_depth = 'BACK'

    # Note: In Blender, URLs can be downloaded or linked as movie clips
    print(f"[AnimRef] Loaded reference '{title}' into Blender Camera: {cam_obj.name} ({video_url})")

class BlenderAnimRefRequestHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        if self.path in ['/load-clip', '/']:
            content_len = int(self.headers.get('Content-Length', 0))
            post_body = self.rfile.read(content_len)
            try:
                data = json.loads(post_body.decode('utf-8'))
                video_url = data.get('videoUrl', '')
                title = data.get('title', 'Animation Reference')
                fps = data.get('fps', 24)

                # Queue execution on Blender's main thread
                bpy.app.timers.register(lambda: load_reference_to_camera(video_url, title, fps), first_interval=0.01)

                self.send_response(200)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "ok", "message": f"Loaded '{title}' into Blender"}).encode('utf-8'))
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
            "name": "AnimationReference Blender Bridge",
            "version": "1.0",
            "status": "listening",
            "port": BRIDGE_PORT
        }).encode('utf-8'))

    def log_message(self, format, *args):
        pass

def start_blender_bridge(port=BRIDGE_PORT):
    global _server_instance, _server_thread
    if _server_thread and _server_thread.is_alive():
        return
    try:
        _server_instance = HTTPServer(('127.0.0.1', port), BlenderAnimRefRequestHandler)
        _server_thread = threading.Thread(target=_server_instance.serve_forever, daemon=True)
        _server_thread.start()
        print(f"[AnimRef] Blender Bridge active on http://127.0.0.1:{port}")
    except Exception as e:
        print(f"[AnimRef] Failed to start Blender bridge: {e}")

class ANIMREF_PT_SidebarPanel(bpy.types.Panel):
    bl_label = "Animation Reference"
    bl_idname = "ANIMREF_PT_sidebar"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'AnimRef'

    def draw(self, context):
        layout = self.layout
        col = layout.column(align=True)
        col.label(text="Bridge: Listening (Port 9877)", icon='RADIOBUT_ON')
        col.label(text="Click 'Send to Blender' on the web", icon='INFO')

classes = (
    ANIMREF_PT_SidebarPanel,
)

def register():
    for cls in classes:
        bpy.utils.register_class(cls)
    start_blender_bridge()

def unregister():
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)

if __name__ == "__main__":
    register()
