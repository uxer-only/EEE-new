/**
 * Lumière service worker
 * - Network-first for navigations (always try fresh HTML, fall back to cache when offline)
 * - Stale-while-revalidate for API GETs on /api/providers and provider images
 *   so recently viewed profiles remain browsable offline.
 */
const SW_VERSION = 'lumiere-v46';
const RUNTIME = `lumiere-runtime-${SW_VERSION}`;
const SHELL = `lumiere-shell-${SW_VERSION}`;

const SHELL_URLS = ['/', '/browse', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) => cache.addAll(SHELL_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![RUNTIME, SHELL].includes(k))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
     .then(() =>
       // Force all open tabs to reload with the new shell + bundles
       self.clients.matchAll({ type: 'window' }).then((clients) => {
         clients.forEach((client) => {
           try { client.navigate(client.url); } catch {}
         });
       })
     )
  );
});

const isProviderApi = (url) =>
  url.pathname.startsWith('/api/providers/') && !url.pathname.includes('/dashboard');

const isImageRequest = (req) =>
  req.destination === 'image' ||
  /\.(png|jpg|jpeg|webp|gif|svg|ico)$/i.test(new URL(req.url).pathname);

const isStaticAsset = (req) => {
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return false;
  return (
    url.pathname.startsWith('/static/') ||
    /\.(js|css|woff2?|ttf)$/i.test(url.pathname)
  );
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Navigation (HTML pages) — network-first, cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((cache) => cache.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(request).then((m) => m || caches.match('/'))
        )
    );
    return;
  }

  // Static assets (JS/CSS/fonts) — cache-first, network fallback
  if (isStaticAsset(request)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(RUNTIME).then((cache) => cache.put(request, copy)).catch(() => {});
            }
            return res;
          })
      )
    );
    return;
  }

  // Provider detail API — stale-while-revalidate
  if (isProviderApi(url)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Images — cache-first, network fallback
  if (isImageRequest(request)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(RUNTIME).then((cache) => cache.put(request, copy)).catch(() => {});
            }
            return res;
          }).catch(() => cached)
      )
    );
  }
});

function staleWhileRevalidate(request) {
  return caches.open(RUNTIME).then((cache) =>
    cache.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.status === 200) cache.put(request, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
}
