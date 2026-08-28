'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { ReferenceClip } from '@/lib/types';

export function ReferenceMediaPreview({ clip }: { clip: ReferenceClip }) {
  const { user } = useAuth();
  const [source, setSource] = useState(clip.thumbnailUrl || '');

  useEffect(() => {
    if (clip.thumbnailUrl) return setSource(clip.thumbnailUrl);
    if (!clip.storagePath) return;
    (async () => {
      const token = user ? await user.getIdToken() : null;
      const response = await fetch(`/api/clips/${clip.id}/playback`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      const data = await response.json();
      if (data.url) setSource(data.url);
    })().catch(() => {});
  }, [clip.id, clip.storagePath, clip.thumbnailUrl, user]);

  if (!source) return <div className="h-full w-full bg-gradient-to-br from-purple-950 to-zinc-950" />;
  if (clip.mediaType === 'image' || clip.mediaType === 'gif') return <img src={source} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />;
  return <img src={source} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />;
}
