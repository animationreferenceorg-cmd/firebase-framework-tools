'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { getEntitlements } from '@/lib/plans';
import { PricingDialog } from '@/components/PricingDialog';
import {
  Download,
  Copy,
  Layers,
  Sparkles,
  Film,
  CheckCircle2,
  RefreshCw,
  Clock,
  LayoutGrid,
  FileVideo,
  UserCheck,
} from 'lucide-react';
import type { Video } from '@/lib/types';
import { cn } from '@/lib/utils';
import { drawCreatorTagOnCanvas } from '@/lib/canvasWatermark';

interface ContactSheetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: Video;
  fps?: number;
}

type FrameCountOption = 6 | 9 | 12;

export function ContactSheetModal({
  open,
  onOpenChange,
  video,
  fps = 24,
}: ContactSheetModalProps) {
  const { toast } = useToast();
  const { userProfile } = useUser();
  const isPro = getEntitlements(userProfile).isPro;
  const [showPricing, setShowPricing] = useState(false);
  const [frameCount, setFrameCount] = useState<FrameCountOption>(6);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sheetDataUrl, setSheetDataUrl] = useState<string | null>(null);
  const [isDownloadingMp4, setIsDownloadingMp4] = useState(false);
  const [includeCreatorTag, setIncludeCreatorTag] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const rawCreator = video.uploader || video.author_name || '';
  const creatorTag = rawCreator ? (rawCreator.startsWith('@') ? rawCreator : `@${rawCreator}`) : '@animator';

  const cleanTitle = (video.title || 'Reference').replace(/[^\w\s-]/gi, '').trim();

  // Helper to extract downloadable URL
  const getDirectVideoUrl = (): string | undefined => {
    if (!video.videoUrl) return undefined;
    let u = video.videoUrl.trim();
    if (u.includes('playlist.m3u8')) {
      u = u.replace('playlist.m3u8', 'play_720p.mp4');
    } else if (u.startsWith('<iframe')) {
      const match = u.match(/src=["']([^"']+)["']/);
      u = match ? match[1] : u;
    }
    return u;
  };

  const directUrl = getDirectVideoUrl();
  const isDirectMp4 = Boolean(
    directUrl &&
    (directUrl.includes('.mp4') || directUrl.includes('.webm') || directUrl.includes('firebasestorage') || directUrl.includes('b-cdn.net') || directUrl.includes('assets.reflix.dev'))
  );

  // Generate Contact Sheet from video
  const generateContactSheet = async () => {
    if (!directUrl || !isDirectMp4) {
      toast({
        variant: 'destructive',
        title: 'Direct Video Required',
        description: 'Contact sheet generation is supported for direct MP4 and stream video files.',
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setSheetDataUrl(null);

    const hiddenVideo = document.createElement('video');
    hiddenVideo.crossOrigin = 'anonymous';
    hiddenVideo.src = directUrl;
    hiddenVideo.muted = true;
    hiddenVideo.playsInline = true;
    hiddenVideo.preload = 'auto';

    try {
      // Wait for metadata
      await new Promise<void>((resolve, reject) => {
        hiddenVideo.onloadedmetadata = () => resolve();
        hiddenVideo.onerror = () => reject(new Error('Failed to load video metadata.'));
        setTimeout(() => reject(new Error('Video loading timed out.')), 10000);
      });

      const duration = hiddenVideo.duration || 1;
      const vidWidth = hiddenVideo.videoWidth || 1280;
      const vidHeight = hiddenVideo.videoHeight || 720;

      // Layout calculations
      let cols = 3;
      let rows = 2;
      if (frameCount === 6) {
        cols = 3;
        rows = 2;
      } else if (frameCount === 9) {
        cols = 3;
        rows = 3;
      } else if (frameCount === 12) {
        cols = 4;
        rows = 3;
      }

      const cellWidth = 480;
      const cellHeight = Math.round((cellWidth / vidWidth) * vidHeight);
      const padding = 16;
      const headerHeight = 60;
      const footerHeight = 36;

      const totalWidth = cols * cellWidth + (cols + 1) * padding;
      const totalHeight = headerHeight + rows * cellHeight + (rows + 1) * padding + footerHeight;

      const canvas = document.createElement('canvas');
      canvas.width = totalWidth;
      canvas.height = totalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable.');

      // Background
      ctx.fillStyle = '#0a0813';
      ctx.fillRect(0, 0, totalWidth, totalHeight);

      // Header Banner
      ctx.fillStyle = '#161226';
      ctx.fillRect(0, 0, totalWidth, headerHeight);

      // Header Brand or Creator Tag
      if (includeCreatorTag && rawCreator) {
        drawCreatorTagOnCanvas(ctx, {
          tagText: creatorTag,
          x: padding,
          y: 15,
          scale: 1,
        });

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px sans-serif';
        const titleTruncated = cleanTitle.length > 35 ? cleanTitle.slice(0, 35) + '...' : cleanTitle;
        ctx.fillText(`•  ${titleTruncated}`, padding + 220, 36);
      } else {
        ctx.fillStyle = '#a855f7';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('ANIMATIONREFERENCE.ORG', padding, 36);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px sans-serif';
        const titleTruncated = cleanTitle.length > 50 ? cleanTitle.slice(0, 50) + '...' : cleanTitle;
        ctx.fillText(`•  ${titleTruncated}`, padding + 260, 36);
      }

      ctx.fillStyle = '#9ca3af';
      ctx.font = '12px monospace';
      ctx.fillText(`${fps} FPS  |  ${duration.toFixed(2)}s  |  ${frameCount} Keyframes`, totalWidth - 280, 36);

      // Capture frames evenly across duration
      const timestamps: number[] = [];
      const step = duration / (frameCount + 1);
      for (let i = 1; i <= frameCount; i++) {
        timestamps.push(Math.min(duration - 0.05, step * i));
      }

      for (let i = 0; i < timestamps.length; i++) {
        const time = timestamps[i];
        await new Promise<void>((resolve) => {
          const onSeeked = () => {
            hiddenVideo.removeEventListener('seeked', onSeeked);
            resolve();
          };
          hiddenVideo.addEventListener('seeked', onSeeked);
          hiddenVideo.currentTime = time;
        });

        const colIndex = i % cols;
        const rowIndex = Math.floor(i / cols);
        const x = padding + colIndex * (cellWidth + padding);
        const y = headerHeight + padding + rowIndex * (cellHeight + padding);

        // Draw video frame
        ctx.drawImage(hiddenVideo, x, y, cellWidth, cellHeight);

        // Frame border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellWidth, cellHeight);

        // Person Tagged in Top-Left Corner of Video Frame
        if (includeCreatorTag && rawCreator) {
          drawCreatorTagOnCanvas(ctx, {
            tagText: creatorTag,
            x: x + 8,
            y: y + 8,
            scale: 0.65,
          });
        }

        // Frame number badge placed on top-right
        const currentFrameNum = Math.floor(time * fps) + 1;
        const badgeText = `F:${String(currentFrameNum).padStart(3, '0')}  ${time.toFixed(2)}s`;
        const badgeW = 96;
        const badgeH = 20;
        const badgeX = x + cellWidth - badgeW - 8;
        const badgeY = y + 8;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';
        ctx.lineWidth = 1;
        ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

        ctx.fillStyle = '#f3e8ff';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(badgeText, badgeX + 8, badgeY + 14);

        setProgress(Math.round(((i + 1) / frameCount) * 100));
      }

      // Footer
      ctx.fillStyle = '#6b7280';
      ctx.font = '11px sans-serif';
      ctx.fillText('Generated with AnimationReference.org Pro Contact Sheet Studio', padding, totalHeight - 14);

      const url = canvas.toDataURL('image/png');
      setSheetDataUrl(url);
      toast({
        title: 'Breakdown Generated! 🎨',
        description: `${frameCount} frames stitched into a high-res contact sheet.`,
      });
    } catch (err: any) {
      console.error('Contact sheet generation failed:', err);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: err.message || 'Could not extract frames from this video source.',
      });
    } finally {
      setIsGenerating(false);
      hiddenVideo.src = '';
    }
  };

  const handleDownloadSheet = () => {
    if (!sheetDataUrl) return;
    if (!isPro) {
      setShowPricing(true);
      toast({
        title: 'Pro Required',
        description: 'Exporting contact sheets requires a Pro subscription ($5/mo).',
      });
      return;
    }
    const a = document.createElement('a');
    a.href = sheetDataUrl;
    a.download = `${cleanTitle.toLowerCase().replace(/\s+/g, '-')}-contact-sheet.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast({
      title: 'Downloaded PNG',
      description: 'Saved to your computer.',
    });
  };

  const handleCopySheet = async () => {
    if (!sheetDataUrl) return;
    if (!isPro) {
      setShowPricing(true);
      toast({
        title: 'Pro Required',
        description: 'Copying reference sheets to PureRef requires a Pro subscription ($5/mo).',
      });
      return;
    }
    try {
      const blob = await (await fetch(sheetDataUrl)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      toast({
        title: 'Copied to Clipboard!',
        description: 'You can now paste directly into PureRef, Photoshop, or Discord.',
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Copy Failed',
        description: 'Clipboard image writing is not supported by your browser.',
      });
    }
  };

  const handleExportTaggedMp4 = async () => {
    if (!directUrl) return;
    if (!isPro) {
      setShowPricing(true);
      toast({
        title: 'Pro Required',
        description: 'Exporting tagged reference MP4s requires a Pro subscription ($5/mo).',
      });
      return;
    }
    setIsDownloadingMp4(true);
    try {
      const videoEl = document.createElement('video');
      videoEl.crossOrigin = 'anonymous';
      videoEl.src = directUrl;
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.preload = 'auto';

      await new Promise<void>((resolve, reject) => {
        videoEl.onloadedmetadata = () => resolve();
        videoEl.onerror = () => reject(new Error('Failed to load video for export.'));
        setTimeout(() => reject(new Error('Video loading timed out.')), 12000);
      });

      const w = videoEl.videoWidth || 1280;
      const h = videoEl.videoHeight || 720;
      const recCanvas = document.createElement('canvas');
      recCanvas.width = w;
      recCanvas.height = h;
      const recCtx = recCanvas.getContext('2d');
      if (!recCtx) throw new Error('Canvas context failed');

      const stream = recCanvas.captureStream(fps);
      let mimeType = 'video/webm';
      if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E')) {
        mimeType = 'video/mp4;codecs=avc1.42E01E';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const completionPromise = new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          resolve(new Blob(chunks, { type: mimeType }));
        };
      });

      recorder.start();
      await videoEl.play();

      const tagScale = Math.max(0.8, w / 1280);
      let isRecording = true;

      const drawFrame = () => {
        if (!isRecording) return;
        recCtx.drawImage(videoEl, 0, 0, w, h);
        if (includeCreatorTag && rawCreator) {
          drawCreatorTagOnCanvas(recCtx, {
            tagText: creatorTag,
            x: Math.round(24 * tagScale),
            y: Math.round(24 * tagScale),
            scale: tagScale,
          });
        }

        if (!videoEl.paused && !videoEl.ended) {
          requestAnimationFrame(drawFrame);
        }
      };

      requestAnimationFrame(drawFrame);

      videoEl.onended = () => {
        isRecording = false;
        recorder.stop();
      };

      const blob = await completionPromise;
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${cleanTitle.toLowerCase().replace(/\s+/g, '-')}-tagged-${fps}fps.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

      toast({
        title: 'Video Exported! 🎬',
        description: `Exported with ${creatorTag} tagged in top-left corner.`,
      });
    } catch (err: any) {
      console.warn('Tagged canvas export fallback to direct download:', err);
      // Fallback: direct download
      handleDownloadCleanMp4();
    } finally {
      setIsDownloadingMp4(false);
    }
  };

  const handleDownloadCleanMp4 = async () => {
    if (!directUrl) return;
    if (!isPro) {
      setShowPricing(true);
      toast({
        title: 'Pro Required',
        description: 'Downloading reference MP4s requires a Pro subscription ($5/mo).',
      });
      return;
    }
    setIsDownloadingMp4(true);
    try {
      const response = await fetch(directUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${cleanTitle.toLowerCase().replace(/\s+/g, '-')}-24fps.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast({
        title: 'MP4 Download Complete! 🎬',
        description: 'Clean video file saved.',
      });
    } catch (err) {
      // Fallback: direct window download
      const a = document.createElement('a');
      a.href = directUrl;
      a.target = '_blank';
      a.download = `${cleanTitle.toLowerCase().replace(/\s+/g, '-')}-24fps.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setIsDownloadingMp4(false);
    }
  };

  useEffect(() => {
    if (open && isDirectMp4 && !sheetDataUrl && !isGenerating) {
      generateContactSheet();
    }
  }, [open, frameCount, includeCreatorTag]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-[#0e0a1f] border border-purple-500/20 text-white p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-purple-600/30 border border-purple-400/30 text-purple-300">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <DialogTitle className="text-xl font-black text-white">
                Reference Export & Breakdown Studio
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                1-click 24 FPS MP4 video export with creator credit & PureRef-ready keyframe contact sheets.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Action Options Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 mt-2">
          {/* Left controls: Frame count & Creator Tag toggle */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Frame count selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <LayoutGrid className="w-3.5 h-3.5 text-purple-400" /> Frame Count:
              </span>
              <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10">
                {([6, 9, 12] as FrameCountOption[]).map((count) => (
                  <button
                    key={count}
                    onClick={() => setFrameCount(count)}
                    disabled={isGenerating}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      frameCount === count
                        ? "bg-purple-600 text-white shadow"
                        : "text-zinc-400 hover:text-white"
                    )}
                  >
                    {count} Frames
                  </button>
                ))}
              </div>
            </div>

            {/* Creator Attribution Tag Toggle */}
            <label className="flex items-center gap-2 text-xs font-semibold text-zinc-300 cursor-pointer select-none bg-black/40 px-3 py-1.5 rounded-xl border border-white/10 hover:border-purple-500/30 transition-all">
              <input
                type="checkbox"
                checked={includeCreatorTag}
                onChange={(e) => {
                  setIncludeCreatorTag(e.target.checked);
                  setSheetDataUrl(null);
                }}
                className="accent-purple-500 rounded cursor-pointer"
              />
              <UserCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>Tag Person in Top-Left ({creatorTag})</span>
            </label>
          </div>

          {/* Quick MP4 Export with Creator Tag */}
          <Button
            variant="outline"
            onClick={includeCreatorTag ? handleExportTaggedMp4 : handleDownloadCleanMp4}
            disabled={isDownloadingMp4 || !isDirectMp4}
            className="border-purple-400/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-200 font-bold text-xs h-9 rounded-xl cursor-pointer"
            title={includeCreatorTag ? `Export MP4 with ${creatorTag} tagged in top-left corner` : 'Download clean MP4'}
          >
            {isDownloadingMp4 ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" /> Exporting Video...
              </>
            ) : (
              <>
                <FileVideo className="w-3.5 h-3.5 mr-2 text-purple-400" /> 
                <span>{includeCreatorTag ? `Export MP4 (${creatorTag})` : 'Download Clean MP4'}</span>
                {!isPro && (
                  <span className="ml-1 text-[9px] font-black text-amber-300 bg-amber-400/20 px-1 py-0.5 rounded border border-amber-400/30">
                    PRO
                  </span>
                )}
              </>
            )}
          </Button>
        </div>

        {/* Preview Area */}
        <div className="relative aspect-[16/9] w-full bg-black/60 rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center min-h-[300px]">
          {isGenerating && (
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">Stitching Keyframe Breakdown...</p>
                <p className="text-xs text-zinc-400">Extracting {frameCount} frames at {fps} FPS</p>
              </div>
              <div className="w-48 h-2 bg-white/10 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {!isGenerating && sheetDataUrl && (
            <img
              src={sheetDataUrl}
              alt="Generated Contact Sheet"
              className="w-full h-full object-contain"
            />
          )}

          {!isGenerating && !sheetDataUrl && !isDirectMp4 && (
            <div className="text-center p-6 space-y-2">
              <Film className="w-8 h-8 text-zinc-500 mx-auto" />
              <p className="text-sm font-bold text-zinc-300">External Embed Video</p>
              <p className="text-xs text-zinc-500 max-w-sm">
                This reference is hosted on an external provider (YouTube/Vimeo). Frame breakdowns are available on all 8,000 library MP4s.
              </p>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <Button
            variant="ghost"
            onClick={() => generateContactSheet()}
            disabled={isGenerating || !isDirectMp4}
            className="text-xs text-zinc-400 hover:text-white"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Re-generate
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleCopySheet}
              disabled={!sheetDataUrl || isGenerating}
              className="border-white/10 text-xs font-bold rounded-xl h-9 hover:bg-white/10 text-zinc-300 hover:text-white cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Image (PureRef)
              {!isPro && (
                <span className="ml-1 text-[9px] font-black text-amber-300 bg-amber-400/20 px-1 py-0.5 rounded border border-amber-400/30">
                  PRO
                </span>
              )}
            </Button>
            <Button
              onClick={handleDownloadSheet}
              disabled={!sheetDataUrl || isGenerating}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl h-9 shadow-[0_0_20px_rgba(168,85,247,0.4)] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" /> Download Contact Sheet (PNG)
              {!isPro && (
                <span className="ml-1 text-[9px] font-black text-amber-300 bg-amber-400/20 px-1 py-0.5 rounded border border-amber-400/30">
                  PRO
                </span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
      <PricingDialog open={showPricing} onOpenChange={setShowPricing} />
    </Dialog>
  );
}
