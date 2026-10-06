'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Thumbnail image that falls back to the video's first frame when the image
 * fails. Many thumbnails point at Instagram CDN links, which expire and
 * start returning 403, leaving broken images in grids.
 */
export function ReferenceThumbnail({ src, videoUrl, alt, className }: { src?: string; videoUrl?: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(!src);
  const canUseVideo = Boolean(videoUrl && /^https?:\/\//.test(videoUrl) && !videoUrl.includes('youtu'));

  if (failed && canUseVideo) {
    // `#t=0.1` asks the browser to render a frame just past the start as the poster.
    return <video src={`${videoUrl!.split('#')[0]}#t=0.1`} preload="metadata" muted playsInline aria-label={alt} className={className} />;
  }
  if (failed) return <div role="img" aria-label={alt} className={cn('bg-muted', className)} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className={className} />;
}
