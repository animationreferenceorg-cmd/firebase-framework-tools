'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ReactPlayer from 'react-player';
import { FlipHorizontal, Loader2, Maximize2, Pause, Play, RotateCcw, SkipBack, SkipForward, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ReferenceClip } from '@/lib/types';
import { secondsLabel } from '@/lib/reference-utils';
import { useAuth } from '@/hooks/use-auth';

export function ReferenceClipPlayer({ clip, className = '' }: { clip: ReferenceClip; className?: string }) {
  const playerRef = useRef<ReactPlayer | null>(null);
  const videoTagRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { user } = useAuth();
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(clip.startTime || 0);
  const [playbackSource, setPlaybackSource] = useState(clip.uploadedMediaUrl || clip.sourceUrl || '');
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isFlipped, setIsFlipped] = useState(false);

  const duration = Math.max(0.05, (clip.endTime || 5) - (clip.startTime || 0));

  useEffect(() => {
    setCurrent(clip.startTime || 0);
  }, [clip.startTime]);

  useEffect(() => {
    if (clip.uploadedMediaUrl) {
      setPlaybackSource(clip.uploadedMediaUrl);
      return;
    }
    if (!clip.storagePath) {
      setPlaybackSource(clip.sourceUrl);
      return;
    }
    (async () => {
      const token = user ? await user.getIdToken() : null;
      const response = await fetch(`/api/clips/${clip.id}/playback`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await response.json();
      if (data.url) setPlaybackSource(data.url);
    })().catch(() => {});
  }, [clip.id, clip.storagePath, clip.sourceUrl, clip.uploadedMediaUrl, user]);

  const seek = useCallback(
    (seconds: number) => {
      const bounded = Math.max(clip.startTime || 0, Math.min(clip.endTime || 10, seconds));
      if (playerRef.current) {
        playerRef.current.seekTo(bounded, 'seconds');
      } else if (videoTagRef.current) {
        videoTagRef.current.currentTime = bounded;
      }
      setCurrent(bounded);
    },
    [clip.startTime, clip.endTime]
  );

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const frameStep = 1 / 24;

  // Handle Images & GIFs
  if (clip.mediaType === 'image' || clip.mediaType === 'gif') {
    return (
      <div className={`overflow-hidden rounded-2xl border border-white/10 bg-black ${className}`}>
        <div className="grid min-h-[320px] place-items-center bg-[radial-gradient(circle_at_center,rgba(88,28,135,.2),transparent_65%)] p-4 md:min-h-[500px]">
          {playbackSource ? (
            <img src={playbackSource} alt={clip.title} className={`max-h-[75vh] w-full object-contain transition-transform ${isFlipped ? 'scale-x-[-1]' : ''}`} />
          ) : (
            <div className="text-sm text-zinc-500">Preparing preview…</div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-white/10 bg-zinc-950 px-4 py-3 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span>{clip.mediaType === 'gif' ? 'Animated GIF' : 'Image Reference'}</span>
            <Button size="sm" variant="ghost" onClick={() => setIsFlipped(!isFlipped)} className={`h-7 px-2 text-xs ${isFlipped ? 'text-purple-300 bg-purple-950/50' : 'text-zinc-400'}`}>
              <FlipHorizontal className="mr-1 h-3.5 w-3.5" />
              Flip
            </Button>
          </div>
          <span>{clip.title}</span>
        </div>
      </div>
    );
  }

  const isBunnyStream = playbackSource?.includes('b-cdn.net') || playbackSource?.endsWith('.mp4') || playbackSource?.endsWith('.webm');

  return (
    <div ref={containerRef} className={`group/player overflow-hidden rounded-2xl border border-white/10 bg-black ${className}`}>
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
        <div className={`h-full w-full transition-transform duration-200 ${isFlipped ? 'scale-x-[-1]' : ''}`}>
          {playbackSource ? (
            <ReactPlayer
              ref={playerRef}
              url={playbackSource}
              width="100%"
              height="100%"
              playing={playing}
              playsinline
              playbackRate={playbackRate}
              controls={false}
              onReady={() => seek(clip.startTime || 0)}
              onProgress={({ playedSeconds }) => {
                setCurrent(playedSeconds);
                if (clip.endTime && playedSeconds >= clip.endTime - 0.05) {
                  seek(clip.startTime || 0);
                }
              }}
              config={{
                file: {
                  forceHLS: isBunnyStream && playbackSource.includes('.m3u8'),
                },
                youtube: {
                  playerVars: {
                    start: Math.floor(clip.startTime || 0),
                    end: Math.ceil(clip.endTime || 10),
                    modestbranding: 1,
                    rel: 0,
                  },
                },
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-xs text-zinc-400">
              <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
              <p className="font-semibold text-white">Scraping video to Bunny CDN…</p>
              <p className="text-[11px] text-zinc-500">Processing video for frame-by-frame playback.</p>
            </div>
          )}
        </div>

        {/* Floating Quick Action Overlay */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover/player:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsFlipped(!isFlipped)}
            className={`h-8 px-2.5 text-xs backdrop-blur-md border border-white/10 ${isFlipped ? 'bg-purple-600 text-white' : 'bg-black/60 text-zinc-300 hover:text-white'}`}
          >
            <FlipHorizontal className="mr-1.5 h-3.5 w-3.5" />
            {isFlipped ? 'Flipped' : 'Flip Pose'}
          </Button>
          <Button size="icon" variant="secondary" onClick={toggleFullscreen} className="h-8 w-8 bg-black/60 backdrop-blur-md border border-white/10 text-zinc-300 hover:text-white">
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Animator Controls Bar */}
      <div className="p-3 space-y-3 bg-zinc-950">
        <input
          aria-label="Clip position"
          type="range"
          min={clip.startTime || 0}
          max={clip.endTime || 10}
          step="0.01"
          value={Math.max(clip.startTime || 0, Math.min(clip.endTime || 10, current))}
          onChange={(event) => seek(Number(event.target.value))}
          className="w-full accent-purple-500 cursor-pointer"
        />
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" aria-label="Loop from start" onClick={() => seek(clip.startTime || 0)}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" aria-label="Previous frame" onClick={() => seek(current - frameStep)}>
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              aria-label={playing ? 'Pause' : 'Play'}
              onClick={() => setPlaying((prev) => !prev)}
              className="rounded-full bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-900/40"
            >
              {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
            </Button>
            <Button size="icon" variant="ghost" aria-label="Next frame" onClick={() => seek(current + frameStep)}>
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {/* Speed Selector */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-zinc-500 font-medium">Speed:</span>
              <Select value={String(playbackRate)} onValueChange={(val) => setPlaybackRate(Number(val))}>
                <SelectTrigger className="h-7 w-16 text-xs border-white/10 bg-black/50 py-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-white/10">
                  <SelectItem value="0.25">0.25x</SelectItem>
                  <SelectItem value="0.5">0.5x</SelectItem>
                  <SelectItem value="1">1x</SelectItem>
                  <SelectItem value="1.5">1.5x</SelectItem>
                  <SelectItem value="2">2x</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <span className="font-mono text-xs text-zinc-400">
              {secondsLabel(current - (clip.startTime || 0))} / {secondsLabel(duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
