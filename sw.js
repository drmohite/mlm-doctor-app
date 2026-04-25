// MLM Doctor — Service Worker
// Caches all local assets for offline use.
// Monaco Editor is loaded from CDN; it is cached on first load via a
// stale-while-revalidate strategy so the IDE works offline thereafter.

const CACHE_NAME  = 'mlm-doctor-v1';
const CDN_CACHE   = 'mlm-doctor-cdn-v1';

// All local static assets to pre-cache on install
const LOCAL_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon.png',
  // Data
  '/data/keywords.js',
  '/data/snippets.js',
  // Language engine
  '/language/arden-syntax.js',
  '/language/arden-symbols.js',
  '/language/arden-complete.js',
  '/language/arden-hover.js',
  '/language/arden-linter.js',
  // Panels
  '/panels/outline.js',
  '/panels/problems.js',
  '/panels/context.js',
];

// CDN origins to cache at runtime (Monaco + Google Fonts)
const CDN_ORIGINS = [
  'https://cdn.jsdelivr.net',
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
];

// ── Install: pre-cache all local assets ─────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(LOCAL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: delete old caches ──────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== CDN_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: serve from cache, fall back to network ────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET requests (file saves, etc.)
  if (event.request.method !== 'GET') return;

  // ── CDN resources (Monaco, Google Fonts) ──────────────────────────────────
  // Strategy: Cache-first — if cached, serve instantly (offline capable).
  // If not cached, fetch from network and cache for next time.
  if (CDN_ORIGINS.some(origin => url.origin === new URL(origin).origin)) {
    event.respondWith(
      caches.open(CDN_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(response => {
            if (response && response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(() => cached); // offline: return stale if available
        })
      )
    );
    return;
  }

  // ── Local assets ───────────────────────────────────────────────────────────
  // Strategy: Cache-first with network fallback.
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200) return response;
        const cloned = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        return response;
      });
    })
  );
});
