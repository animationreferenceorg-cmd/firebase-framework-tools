'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Thumbnail image that falls back through `/api/proxy/image` and then to the
 * video's first frame when direct hotlinking fails.
 */
export function ReferenceThumbnail({ src, videoUrl, alt, className }: { src?: string; videoUrl?: string; alt: string; className?: string }) {
  const [proxyTried, setProxyTried] = useState(false);
  const [failed, setFailed] = useState(!src);

  useEffect(() => {
    setProxyTried(false);
    setFailed(!src);
  }, [src]);

  const effectiveSrc = proxyTried && src && !src.startsWith('/api/proxy/')
    ? `/api/proxy/image?url=${encodeURIComponent(src)}`
    : src;

  const canUseVideo = Boolean(videoUrl && /^https?:\/\//.test(videoUrl) && !videoUrl.includes('youtu'));

  if (failed && canUseVideo) {
    // `#t=0.1` asks the browser to render a frame just past the start as the poster.
    return <video src={`${videoUrl!.split('#')[0]}#t=0.1`} preload="metadata" muted playsInline aria-label={alt} className={className} />;
  }
  if (failed || !effectiveSrc) return <div role="img" aria-label={alt} className={cn('bg-muted', className)} />;
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={effectiveSrc}
      alt={alt}
      width={480}
      height={270}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => {
        if (!proxyTried && src && /^https?:\/\//i.test(src) && !src.startsWith('/api/proxy/')) {
          setProxyTried(true);
        } else {
          setFailed(true);
        }
      }}
      className={className}
    />
  );
}
