import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Animation Reference',
    short_name: 'AnimRef',
    description: 'Frame-by-frame animation reference library, clip saving, and portfolio vault for animators.',
    start_url: '/references?source=pwa',
    id: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#9333ea',
    // Both entries previously pointed at /icon.png, which is a single 1024x1024
    // file — so neither declared size matched the real image. Chrome checks the
    // decoded dimensions when deciding installability, so these are now real
    // 192 and 512 renders. The maskable copy keeps the Android launcher icon
    // from being letterboxed inside a white circle.
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    share_target: {
      action: '/vault',
      method: 'GET',
      params: {
        title: 'title',
        text: 'text',
        url: 'url',
      },
    },
  };
}
