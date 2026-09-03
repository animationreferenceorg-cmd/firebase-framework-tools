'use client';

import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Copy, 
  Check, 
  Download, 
  Sparkles, 
  ExternalLink, 
  Radio, 
  Terminal, 
  CheckCircle2, 
  Zap,
  Box
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Video } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SendTo3DModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: Video;
}

export function SendTo3DModal({ isOpen, onClose, video }: SendTo3DModalProps) {
  const { toast } = useToast();
  const [copiedMaya, setCopiedMaya] = useState(false);
  const [copiedBlender, setCopiedBlender] = useState(false);
  const [isSendingMaya, setIsSendingMaya] = useState(false);
  const [isSendingBlender, setIsSendingBlender] = useState(false);

  const cleanTitle = (video.title || 'AnimRef').replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 24);
  const videoUrl = video.videoUrl || '';
  const fps = video.fps || 24;

  const mayaScript = `# --- AnimationReference.org -> Maya Reference Camera ---
import maya.cmds as cmds

video_url = "${videoUrl}"
clip_title = "${cleanTitle}"
cam_name = f"RefCam_{clip_title}"

# 1. Create or retrieve Reference Camera
if cmds.objExists(cam_name):
    cam = cam_name
else:
    cam, cam_shape = cmds.camera(name=cam_name)
    cmds.setAttr(f"{cam}.translate", 0, 100, 300)
    cmds.setAttr(f"{cam_shape}.renderable", 0)

# 2. Attach Image Plane with timecode sync
planes = cmds.imagePlane(camera=cam, query=True) or []
img_plane = planes[0] if planes else cmds.imagePlane(camera=cam)[1]

cmds.setAttr(f"{img_plane}.imageName", video_url, type="string")
cmds.setAttr(f"{img_plane}.useFrameExtension", 1)
cmds.setAttr(f"{img_plane}.fit", 2)
cmds.setAttr(f"{img_plane}.depth", 1000)

cmds.select(cam)
print(f"[AnimRef] Loaded '{clip_title}' into Maya camera: {cam}")
`;

  const blenderScript = `# --- AnimationReference.org -> Blender Reference Camera ---
import bpy

video_url = "${videoUrl}"
clip_title = "${cleanTitle}"

scene = bpy.context.scene
cam = scene.camera

# 1. Create Camera if scene doesn't have one
if not cam:
    bpy.ops.object.camera_add(location=(0, -10, 2), rotation=(1.5708, 0, 0))
    cam = bpy.context.active_object
    scene.camera = cam

# 2. Enable Background Images on Camera
cam.data.show_background_images = True
bg = cam.data.background_images.new()
bg.source = 'IMAGE'
bg.frame_method = 'FIT'
bg.alpha = 0.6
bg.display_depth = 'BACK'

print(f"[AnimRef] Loaded '{clip_title}' into Blender camera: {cam.name}")
`;

  const handleCopyMaya = () => {
    navigator.clipboard.writeText(mayaScript);
    setCopiedMaya(true);
    toast({ title: "Maya Script Copied! 📋", description: "Paste into Maya's Script Editor (Python tab) and press Ctrl+Enter." });
    setTimeout(() => setCopiedMaya(false), 2500);
  };

  const handleCopyBlender = () => {
    navigator.clipboard.writeText(blenderScript);
    setCopiedBlender(true);
    toast({ title: "Blender Script Copied! 📋", description: "Paste into Blender's Text Editor and press Run Script (Alt+P)." });
    setTimeout(() => setCopiedBlender(false), 2500);
  };

  const handleLiveBridgeMaya = async () => {
    setIsSendingMaya(true);
    try {
      const res = await fetch('http://127.0.0.1:9876/load-clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl, title: video.title, fps }),
      });
      if (res.ok) {
        toast({ title: "Sent to Maya! 🚀", description: `"${video.title}" loaded directly into your Maya 3D Viewport.` });
      } else {
        throw new Error("Maya bridge rejected request");
      }
    } catch {
      toast({
        variant: "default",
        title: "Maya Bridge Not Running Yet",
        description: "Run animref_maya.py in Maya once to enable live 1-click sync, or click Copy Script below!",
      });
    } finally {
      setIsSendingMaya(false);
    }
  };

  const handleLiveBridgeBlender = async () => {
    setIsSendingBlender(true);
    try {
      const res = await fetch('http://127.0.0.1:9877/load-clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl, title: video.title, fps }),
      });
      if (res.ok) {
        toast({ title: "Sent to Blender! 🚀", description: `"${video.title}" loaded directly into your Blender Camera Viewport.` });
      } else {
        throw new Error("Blender bridge rejected request");
      }
    } catch {
      toast({
        variant: "default",
        title: "Blender Bridge Not Running Yet",
        description: "Install the AnimRef Blender Add-on to enable live 1-click sync, or click Copy Script below!",
      });
    } finally {
      setIsSendingBlender(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl bg-[#0d0a1a]/95 backdrop-blur-2xl border-white/10 text-white shadow-2xl rounded-3xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
              <Box className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                Send Reference to 3D Viewport
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Pro Feature
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Instantly align this reference inside Autodesk Maya or Blender as a synchronized camera image plane.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="maya" className="mt-4">
          <TabsList className="grid grid-cols-2 bg-black/40 border border-white/10 rounded-xl p-1">
            <TabsTrigger value="maya" className="rounded-lg data-[state=active]:bg-purple-600 data-[state=active]:text-white font-medium text-xs sm:text-sm">
              Autodesk Maya
            </TabsTrigger>
            <TabsTrigger value="blender" className="rounded-lg data-[state=active]:bg-orange-600 data-[state=active]:text-white font-medium text-xs sm:text-sm">
              Blender (3.x & 4.x)
            </TabsTrigger>
          </TabsList>

          {/* ──────────────── MAYA TAB ──────────────── */}
          <TabsContent value="maya" className="space-y-4 pt-3">
            {/* Quick Live Send */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-yellow-400" />
                  1-Click Live Bridge
                </h4>
                <p className="text-xs text-zinc-400">Pipes this clip straight into your open Maya session.</p>
              </div>
              <Button 
                onClick={handleLiveBridgeMaya} 
                disabled={isSendingMaya}
                className="bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-xs h-9 px-4 shrink-0 shadow-lg shadow-purple-600/30"
              >
                {isSendingMaya ? "Sending..." : "Send to Active Maya"}
              </Button>
            </div>

            {/* Python Script Copy Block */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-400 flex items-center gap-1">
                  <Terminal className="h-3.5 w-3.5 text-purple-400" />
                  Maya Script Editor Snippet (Python)
                </span>
                <Button 
                  onClick={handleCopyMaya} 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs text-purple-300 hover:text-white hover:bg-white/10 gap-1.5"
                >
                  {copiedMaya ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedMaya ? "Copied!" : "Copy Python Script"}
                </Button>
              </div>
              <div className="relative rounded-2xl bg-black/60 border border-white/10 p-3.5 font-mono text-[11px] text-zinc-300 overflow-x-auto max-h-44 leading-relaxed select-all">
                <pre>{mayaScript}</pre>
              </div>
            </div>

            {/* Full Maya Studio Plugin Download Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-purple-900/20 to-black/60 border border-purple-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                    Full Maya Studio Plugin Suite (.zip)
                  </span>
                  <p className="text-[11px] text-zinc-400">
                    Includes Dockable In-Maya Search Panel, Camera Rigging, Frame Slip, and Drag-and-Drop Installer.
                  </p>
                </div>
                <a href="/downloads/animref_maya_plugin.zip" download="animref_maya_plugin.zip">
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs h-8 px-3.5 font-semibold gap-1.5 shadow-md">
                    <Download className="h-3.5 w-3.5" />
                    Download Plugin (.zip)
                  </Button>
                </a>
              </div>
              <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-white/5">
                <span>Drag <code className="text-purple-300">drag_and_drop_install.py</code> into Maya viewport to install</span>
                <a href="/plugins" target="_blank" className="text-purple-400 hover:text-purple-300 flex items-center gap-1 underline">
                  Installation Guide <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>
          </TabsContent>

          {/* ──────────────── BLENDER TAB ──────────────── */}
          <TabsContent value="blender" className="space-y-4 pt-3">
            {/* Quick Live Send */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-yellow-400" />
                  1-Click Live Bridge
                </h4>
                <p className="text-xs text-zinc-400">Pipes this clip straight into your active Blender camera.</p>
              </div>
              <Button 
                onClick={handleLiveBridgeBlender} 
                disabled={isSendingBlender}
                className="bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl text-xs h-9 px-4 shrink-0 shadow-lg shadow-orange-600/30"
              >
                {isSendingBlender ? "Sending..." : "Send to Active Blender"}
              </Button>
            </div>

            {/* Python Script Copy Block */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-400 flex items-center gap-1">
                  <Terminal className="h-3.5 w-3.5 text-orange-400" />
                  Blender Script Snippet (Python)
                </span>
                <Button 
                  onClick={handleCopyBlender} 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs text-orange-300 hover:text-white hover:bg-white/10 gap-1.5"
                >
                  {copiedBlender ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedBlender ? "Copied!" : "Copy Python Script"}
                </Button>
              </div>
              <div className="relative rounded-2xl bg-black/60 border border-white/10 p-3.5 font-mono text-[11px] text-zinc-300 overflow-x-auto max-h-44 leading-relaxed select-all">
                <pre>{blenderScript}</pre>
              </div>
            </div>

            {/* Full Blender Studio Add-on Download Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-950/40 via-orange-900/20 to-black/60 border border-orange-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-orange-300 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-orange-400" />
                    Full Blender Studio Add-on (.zip)
                  </span>
                  <p className="text-[11px] text-zinc-400">
                    Adds N-Panel 3D Viewport Browser, Camera & 3D Plane Modes, and Frame Slip.
                  </p>
                </div>
                <a href="/downloads/animref_blender_addon.zip" download="animref_blender_addon.zip">
                  <Button size="sm" className="bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs h-8 px-3.5 font-semibold gap-1.5 shadow-md">
                    <Download className="h-3.5 w-3.5" />
                    Download Add-on (.zip)
                  </Button>
                </a>
              </div>
              <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-white/5">
                <span>Install in Blender: <code className="text-orange-300">Preferences &gt; Add-ons &gt; Install from Disk</code></span>
                <a href="/plugins" target="_blank" className="text-orange-400 hover:text-orange-300 flex items-center gap-1 underline">
                  Installation Guide <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
