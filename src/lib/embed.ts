export const EMBED_KINDS = ['video', 'clip', 'portfolio'] as const;
export type EmbedKind = typeof EMBED_KINDS[number];

export function isEmbeddableMediaUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value, 'https://animationreference.org');
    return url.protocol === 'https:' && /\.(mp4|webm|m4v|mov|m3u8)$/i.test(decodeURIComponent(url.pathname));
  } catch { return false; }
}

export function embedUrl(origin: string, kind: EmbedKind, id: string, options: { autoplay?: boolean; loop?: boolean } = {}) {
  const url = new URL(`/embed/${kind}/${encodeURIComponent(id)}`, origin);
  if (options.autoplay) { url.searchParams.set('autoplay', '1'); url.searchParams.set('muted', '1'); }
  if (options.loop) url.searchParams.set('loop', '1');
  return url.toString();
}

function escapeAttribute(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function embedCode(url: string, title: string) {
  return `<iframe src="${escapeAttribute(url)}" title="${escapeAttribute(title || 'Video player')}" width="1280" height="720" style="width:100%;aspect-ratio:16/9;height:auto;border:0" loading="lazy" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
}
