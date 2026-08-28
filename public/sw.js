/* Minimal PWA worker: enables installability without caching authenticated content. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
