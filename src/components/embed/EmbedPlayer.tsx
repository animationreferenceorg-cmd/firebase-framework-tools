'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export function EmbedPlayer({ kind, id }: { kind: string; id: string }) {
  const [media, setMedia] = useState<{ title: string; url: string; poster: string } | null>(null);
  const [error, setError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const params = useSearchParams();
  const autoplay = params.get('autoplay') === '1';
  const muted = autoplay || params.get('muted') === '1';
  const loop = params.get('loop') === '1';

  useEffect(() => {
    const controller = new AbortController();
    setError(''); setMedia(null);
    fetch(`/api/embed/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`, { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'This video is unavailable.');
        if (!controller.signal.aborted) setMedia(data);
      }).catch(reason => { if (!controller.signal.aborted) setError(reason.message || 'This video is unavailable.'); });
    return () => controller.abort();
  }, [kind, id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !media) return;
    let disposed = false;
    let hls: import('hls.js').default | undefined;
    if (/\.m3u8(?:[?#]|$)/i.test(media.url) && !video.canPlayType('application/vnd.apple.mpegurl')) {
      import('hls.js').then(({ default: Hls }) => {
        if (disposed) return;
        if (!Hls.isSupported()) { setError('Your browser cannot play this video.'); return; }
        hls = new Hls({ capLevelToPlayerSize: true, maxBufferLength: 20 });
        hls.loadSource(media.url);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, (_event, data) => { if (data.fatal) { video.pause(); hls?.destroy(); setError('Video playback is unavailable.'); } });
        if (autoplay) hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}); });
      }).catch(() => { if (!disposed) setError('Video playback is unavailable.'); });
    } else {
      video.src = media.url;
      if (autoplay) video.play().catch(() => {});
    }
    return () => { disposed = true; hls?.destroy(); video.pause(); video.removeAttribute('src'); video.load(); };
  }, [media, autoplay]);

  return <main data-embed-player className="fixed inset-0 grid h-full w-full place-items-center bg-black text-white">
    {error ? <p role="alert" className="px-6 text-center text-sm">{error}</p> : media
      ? <video ref={videoRef} aria-label={media.title} poster={media.poster || undefined} controls playsInline autoPlay={autoplay} muted={muted} loop={loop} preload="metadata" className="h-full w-full object-contain" onError={() => setError('Video playback is unavailable.')} />
      : <p role="status" className="text-sm text-white/60">Loading video…</p>}
  </main>;
}
