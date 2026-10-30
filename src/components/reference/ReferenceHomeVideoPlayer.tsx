'use client';

import { useEffect, useMemo, useState } from 'react';
import { VideoPlayer } from '@/components/VideoPlayer';
import { useAuth } from '@/hooks/use-auth';
import type { ReferenceClip, Video } from '@/lib/types';
import { getYouTubeId } from '@/lib/reference-utils';
import { Box, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ReferenceHomeVideoPlayer({ clip }: { clip: ReferenceClip }) {
  const { user } = useAuth();
  const isStillImage = clip.mediaType === 'image' || clip.mediaType === 'gif';
  const is3DModel = clip.mediaType === 'model3d' || clip.sourcePlatform === 'sketchfab';

  const [playbackUrl, setPlaybackUrl] = useState(() => {
    if (clip.uploadedMediaUrl && (clip.uploadedMediaUrl.startsWith('http://') || clip.uploadedMediaUrl.startsWith('https://'))) {
      return clip.uploadedMediaUrl;
    }
    if (clip.sourceUrl && (clip.sourceUrl.startsWith('http://') || clip.sourceUrl.startsWith('https://'))) {
      return clip.sourceUrl;
    }
    if (clip.sourcePlatform === 'youtube' && clip.sourceVideoId) {
      return `https://www.youtube.com/watch?v=${clip.sourceVideoId}`;
    }
    return '';
  });

  useEffect(() => {
    if (isStillImage || is3DModel) return;
    if (playbackUrl || !clip.storagePath) {
      const fallback = clip.uploadedMediaUrl || clip.sourceUrl || (clip.sourcePlatform === 'youtube' && clip.sourceVideoId ? `https://www.youtube.com/watch?v=${clip.sourceVideoId}` : '');
      setPlaybackUrl(fallback);
      return;
    }
    let cancelled = false;
    (async () => {
      const token = user ? await user.getIdToken() : null;
      for (let attempt = 0; attempt < 40 && !cancelled; attempt += 1) {
        const response = await fetch(`/api/clips/${clip.id}/playback`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: 'no-store',
        });
        const data = await response.json();
        if (data.url) {
          if (!cancelled) setPlaybackUrl(data.url);
          return;
        }
        if (response.status !== 202) throw new Error(data.message || 'Playback is unavailable.');
        await new Promise((resolve) => window.setTimeout(resolve, 1500));
      }
    })().catch(() => {
      if (!cancelled) setPlaybackUrl(clip.uploadedMediaUrl || clip.sourceUrl || '');
    });
    return () => { cancelled = true; };
  }, [clip.id, clip.sourcePlatform, clip.sourceUrl, clip.sourceVideoId, clip.storagePath, clip.uploadedMediaUrl, isStillImage, is3DModel, playbackUrl, user]);

  const resolvedThumb = useMemo(() => {
    if (clip.thumbnailUrl) {
      if (clip.thumbnailUrl.includes('cdninstagram.com')) {
        return `/api/proxy/image?url=${encodeURIComponent(clip.thumbnailUrl)}`;
      }
      return clip.thumbnailUrl;
    }
    const ytId = clip.sourceVideoId || getYouTubeId(clip.sourceUrl);
    if (ytId) return `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
    return '';
  }, [clip]);

  const video = useMemo<Video>(() => ({
    id: clip.id,
    title: clip.title,
    description: clip.sourceDescription || '',
    thumbnailUrl: resolvedThumb,
    posterUrl: resolvedThumb,
    videoUrl: playbackUrl,
    tags: clip.tags || [],
    uploader: clip.sourceAuthorName || clip.creatorName,
    originalUrl: clip.sourceUrl,
    duration: Math.max(0, (clip.endTime || 0) - (clip.startTime || 0)),
    type: 'social',
  }), [clip, playbackUrl, resolvedThumb]);

  if (isStillImage) {
    return (
      <img
        src={clip.uploadedMediaUrl || resolvedThumb || clip.sourceUrl || ''}
        alt={clip.title}
        referrerPolicy="no-referrer"
        className="h-full w-full object-contain"
      />
    );
  }

  if (is3DModel) {
    const sketchfabMatch = (clip.sourceUrl || '').match(/sketchfab\.com\/3d-models\/[^\s/]+-([a-f0-9]{32})/i) ||
      (clip.uploadedMediaUrl || '').match(/sketchfab\.com\/models\/([a-f0-9]{32})/i);
    const modelId = sketchfabMatch?.[1];

    if (modelId) {
      return (
        <iframe
          title={clip.title}
          src={`https://sketchfab.com/models/${modelId}/embed?autostart=1`}
          className="h-full w-full border-0"
          allow="autoplay; fullscreen; xr-spatial-tracking"
        />
      );
    }

    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center bg-zinc-950 p-6 text-center">
        {resolvedThumb && (
          <img
            src={resolvedThumb}
            alt={clip.title}
            className="absolute inset-0 h-full w-full object-cover opacity-20 filter blur-sm"
          />
        )}
        <div className="relative z-10 flex flex-col items-center gap-3">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
            <Box className="h-7 w-7" />
          </span>
          <h3 className="text-lg font-bold text-white">{clip.title}</h3>
          <p className="max-w-md text-xs text-zinc-400">
            Interactive 3D model reference from Sketchfab.
          </p>
          {clip.sourceUrl && (
            <Button asChild className="bg-cyan-600 hover:bg-cyan-500 font-bold mt-2">
              <a href={clip.sourceUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                View 3D Model on Sketchfab
              </a>
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!playbackUrl) return <div className="grid h-full place-items-center bg-black text-sm text-zinc-400">Preparing video…</div>;
  return <VideoPlayer video={video} startsPaused muted hideLibraryActions />;
}
