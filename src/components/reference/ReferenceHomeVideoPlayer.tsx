'use client';

import { useEffect, useMemo, useState } from 'react';
import { VideoPlayer } from '@/components/VideoPlayer';
import { useAuth } from '@/hooks/use-auth';
import type { ReferenceClip, Video } from '@/lib/types';

export function ReferenceHomeVideoPlayer({ clip }: { clip: ReferenceClip }) {
  const { user } = useAuth();
  const isStillImage = clip.mediaType === 'image' || clip.mediaType === 'gif';
  const [playbackUrl, setPlaybackUrl] = useState(() => {
    if (clip.uploadedMediaUrl && (clip.uploadedMediaUrl.startsWith('http://') || clip.uploadedMediaUrl.startsWith('https://'))) {
      return clip.uploadedMediaUrl;
    }
    if (clip.sourceUrl && (clip.sourceUrl.startsWith('http://') || clip.sourceUrl.startsWith('https://'))) {
      return clip.sourceUrl;
    }
    return '';
  });

  useEffect(() => {
    if (isStillImage) return;
    if (playbackUrl || !clip.storagePath) {
      setPlaybackUrl(clip.uploadedMediaUrl || clip.sourceUrl || '');
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
      if (!cancelled) setPlaybackUrl(clip.uploadedMediaUrl || '');
    });
    return () => { cancelled = true; };
  }, [clip.id, clip.sourceUrl, clip.storagePath, clip.uploadedMediaUrl, isStillImage, user]);

  const video = useMemo<Video>(() => ({
    id: clip.id,
    title: clip.title,
    description: clip.sourceDescription || '',
    thumbnailUrl: clip.thumbnailUrl || '',
    posterUrl: clip.thumbnailUrl || '',
    videoUrl: playbackUrl,
    tags: clip.tags || [],
    uploader: clip.sourceAuthorName || clip.creatorName,
    originalUrl: clip.sourceUrl,
    duration: Math.max(0, (clip.endTime || 0) - (clip.startTime || 0)),
    type: 'social',
  }), [clip, playbackUrl]);

  if (isStillImage) {
    return <img src={clip.uploadedMediaUrl || clip.thumbnailUrl || ''} alt={clip.title} className="h-full w-full object-contain" />;
  }
  if (!playbackUrl) return <div className="grid h-full place-items-center bg-black text-sm text-zinc-400">Preparing video…</div>;
  return <VideoPlayer video={video} startsPaused muted hideLibraryActions />;
}
