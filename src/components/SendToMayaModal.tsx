'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  checkMayaConnection,
  sendVideoToMaya,
  setupMayaDragData,
  type MayaStatusResponse,
} from '@/lib/animo-bridge';
import { useToast } from '@/hooks/use-toast';
import {
  Sparkles,
  Send,
  CheckCircle2,
  RefreshCw,
  Move,
  ExternalLink,
  Layers,
  AlertCircle,
} from 'lucide-react';

interface SendToMayaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: {
    id: string;
    title: string;
    videoUrl: string;
    thumbnailUrl?: string;
    fps?: number;
  };
}

export function MayaIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L2 7L12 12L22 7L12 2Z" />
      <path d="M2 17L12 22L22 17" fillOpacity="0.4" />
      <path d="M2 12L12 17L22 12" fillOpacity="0.7" />
    </svg>
  );
}

export function SendToMayaModal({
  open,
  onOpenChange,
  video,
}: SendToMayaModalProps) {
  const { toast } = useToast();
  const [checking, setChecking] = useState(false);
  const [connected, setConnected] = useState(false);
  const [mayaInfo, setMayaInfo] = useState<MayaStatusResponse | null>(null);
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const checkStatus = async () => {
    setChecking(true);
    const result = await checkMayaConnection(2000);
    setConnected(result.connected);
    setMayaInfo(result.info || null);
    setChecking(false);
  };

  useEffect(() => {
    if (open) {
      setSentSuccess(false);
      checkStatus();
    }
  }, [open]);

  const handleSend = async () => {
    setSending(true);
    const result = await sendVideoToMaya({
      videoUrl: video.videoUrl,
      title: video.title,
      fps: video.fps || 24,
    });
    setSending(false);

    if (result.success) {
      setSentSuccess(true);
      toast({
        title: 'Sent to Maya! 🎬',
        description: `Importing "${video.title}" as Image Plane camera reference.`,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Could not send to Maya',
        description: result.message,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#0d1117] border-cyan-500/20 text-white p-6 md:p-7 rounded-2xl shadow-2xl backdrop-blur-2xl">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
              <MayaIcon className="w-3.5 h-3.5 text-cyan-400" />
              Animo Maya Plugin
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`inline-block w-2.5 h-2.5 rounded-full ${
                  checking
                    ? 'bg-amber-400 animate-pulse'
                    : connected
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                    : 'bg-zinc-600'
                }`}
              />
              <span className="text-xs font-medium text-zinc-400">
                {checking
                  ? 'Connecting...'
                  : connected
                  ? 'Maya Connected'
                  : 'Maya Not Detected'}
              </span>
              <button
                onClick={checkStatus}
                disabled={checking}
                title="Refresh Maya Connection"
                className="text-zinc-400 hover:text-white transition-colors ml-1 p-1 rounded hover:bg-white/5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <DialogTitle className="text-xl md:text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-100 to-teal-200">
            Send Reference to Autodesk Maya
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-xs md:text-sm">
            Import reference clip directly into Maya as an animated Image Plane camera sequence via Animo.
          </DialogDescription>
        </DialogHeader>

        {/* Video Preview Summary */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10 my-2">
          {video.thumbnailUrl ? (
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="w-16 h-12 rounded-lg object-cover flex-shrink-0 border border-white/10"
            />
          ) : (
            <div className="w-16 h-12 rounded-lg bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 text-cyan-400 font-bold">
              <Layers className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-white truncate">{video.title}</h4>
            <p className="text-xs text-zinc-400">
              {video.fps ? `${video.fps} FPS • ` : '24 FPS • '}
              Image Plane Sequence
            </p>
          </div>
        </div>

        {/* Interactive Drag & Drop Box */}
        <div
          draggable
          onDragStart={(e) => setupMayaDragData(e, video)}
          className="group relative border-2 border-dashed border-cyan-500/30 hover:border-cyan-400/80 bg-cyan-950/10 hover:bg-cyan-950/20 rounded-xl p-4 transition-all cursor-grab active:cursor-grabbing flex flex-col items-center justify-center text-center my-2"
        >
          <div className="p-2.5 rounded-full bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform mb-2">
            <Move className="w-5 h-5" />
          </div>
          <span className="text-sm font-semibold text-white group-hover:text-cyan-200 transition-colors">
            Drag into Maya Viewport
          </span>
          <span className="text-xs text-zinc-400 mt-0.5">
            Click & drag this box straight into your Maya 3D viewport to drop the reference
          </span>
        </div>

        {/* Status / Instructions */}
        {!connected && !checking && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-300">Maya is not connected for 1-click send</p>
              <p className="text-amber-200/80 leading-relaxed">
                1. Make sure Maya is open with the <strong>Animo</strong> plugin loaded.<br />
                2. Or simply <strong>drag and drop</strong> the box above directly into the Maya viewport!
              </p>
            </div>
          </div>
        )}

        {connected && mayaInfo && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Ready to import into <strong>Maya {mayaInfo.maya || ''}</strong> via Animo
              </span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex items-center justify-end gap-3 mt-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-zinc-400 hover:text-white"
          >
            Close
          </Button>

          <Button
            onClick={handleSend}
            disabled={!connected || sending || sentSuccess}
            className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-semibold shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 px-5"
          >
            {sending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : sentSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                Sent to Maya!
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send to Maya (1-Click)
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
