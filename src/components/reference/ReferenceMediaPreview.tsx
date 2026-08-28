'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { ReferenceClip } from '@/lib/types';
import { Film, Image as ImageIcon } from 'lucide-react';

export function ReferenceMediaPreview({ clip }: { clip: ReferenceClip }) {
  const { user } = useAuth();

  const getInitialSource = (c: ReferenceClip) => {
    if (c.thumbnailUrl) return c.thumbnailUrl;
    if (c.uploadedMediaUrl) return c.uploadedMediaUrl;
    if (c.mediaType === 'image' || c.mediaType === 'gif') return c.sourceUrl || '';
    if (c.sourcePlatform === 'youtube' && c.sourceVideoId) {
      return `https://i.ytimg.com/vi/${c.sourceVideoId}/hqdefault.jpg`;
    }
    return '';
  };

  const [source, setSource] = useState(() => getInitialSource(clip));
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
    const initial = getInitialSource(clip);
    if (initial) {
      setSource(initial);
      return;
    }

    if (!clip.storagePath) return;

    let cancelled = false;
    (async () => {
      try {
        const token = user ? await user.getIdToken() : null;
        const response = await fetch(`/api/clips/${clip.id}/playback`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const data = await response.json();
        if (!cancelled && data.url) {
          setSource(data.url);
        }
      } catch {
        // Suppress playback fetch error
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clip, user]);

  const handleError = () => {
    if (source.includes('maxresdefault.jpg')) {
      setSource(source.replace('maxresdefault.jpg', 'hqdefault.jpg'));
      return;
    }
    if (clip.uploadedMediaUrl && source !== clip.uploadedMediaUrl) {
      setSource(clip.uploadedMediaUrl);
      return;
    }
    if ((clip.mediaType === 'image' || clip.mediaType === 'gif') && clip.sourceUrl && source !== clip.sourceUrl) {
      setSource(clip.sourceUrl);
      return;
    }
    setHasError(true);
  };

  if (!source || hasError) {
    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-purple-950 via-zinc-950 to-black p-4 text-center select-none">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.15),transparent_70%)]" />
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-300">
          {clip.mediaType === 'image' || clip.mediaType === 'gif' ? <ImageIcon className="h-5 w-5" /> : <Film className="h-5 w-5" />}
        </span>
        <span className="mt-2 line-clamp-1 text-[11px] font-bold text-zinc-300">{clip.title}</span>
        <span className="mt-0.5 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-purple-300">
          {clip.category || 'Reference'}
        </span>
      </div>
    );
  }

  return (
    <img
      src={source}
      alt={clip.title || 'Reference preview'}
      onError={handleError}
      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
    />
  );
}

