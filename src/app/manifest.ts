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
    // These entries used to claim /icon.png was both 192x192 and 512x512, but
    // it is a single 1024x1024 image, so neither declaration matched what
    // Chrome actually decodes. The size below is the real one — 1024 clears
    // both the 192 minimum for installability and the 512 wanted for the
    // splash screen.
    //
    // Deliberately NOT /public: next.config sets output:'standalone', which
    // does not copy public/ into the server bundle, so every file under
    // public/ currently 404s in production and falls through to the [username]
    // route as HTML. src/app/icon.png is bundled and verified serving as a
    // real image/png.
    icons: [
      {
        src: '/icon.png',
        sizes: '1024x1024',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon.png',
        sizes: '1024x1024',
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
