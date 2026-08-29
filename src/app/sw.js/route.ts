const SERVICE_WORKER = `
const SHELL_CACHE = 'aref-shell-v1';
const SHELL_KEY = '/__aref_offline_shell';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Chrome will not fire beforeinstallprompt unless the service worker has a
// fetch handler — without this listener the app is not installable at all and
// the install dialog can only ever show manual "add to home screen" steps.
//
// Deliberately narrow: page navigations only, network-first. That satisfies the
// installability requirement and gives a real offline fallback without putting
// a stale cache in front of the app's own assets, API calls or auth traffic.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || request.mode !== 'navigate') return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(SHELL_KEY, copy)).catch(() => {});
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(SHELL_KEY);
        if (cached) return cached;
        return new Response('You are offline.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      })
  );
});
`;

export function GET() {
  return new Response(SERVICE_WORKER, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Service-Worker-Allowed': '/',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
