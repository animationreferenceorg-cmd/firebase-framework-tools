import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Animation Reference',
    short_name: 'AnimRef',
    description: 'Frame-by-frame animation reference library, clip saving, and portfolio vault for animators.',
    start_url: '/',
    id: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#9333ea',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
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
