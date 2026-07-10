/* Twibbon Al Akhyar — service worker.
   Strategy:
   - Precache the app shell + home so it opens offline (FR-17).
   - Network-first for navigations (fresh twibbon list when online, cached fallback).
   - Cache-first for static assets & twibbon images (CDN-like, fast on event day).
   Guest photos never touch the SW — compositing is fully client-side. */
const VERSION = 'v1';
const SHELL_CACHE = `twibbon-shell-${VERSION}`;
const ASSET_CACHE = `twibbon-assets-${VERSION}`;

const SHELL_URLS = ['/', '/offline', '/manifest.webmanifest', '/favicon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache auth or API mutations.
  if (url.pathname.startsWith('/api/auth') || url.pathname.startsWith('/api/')) {
    return;
  }

  // Navigations: network-first with offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(request).then((r) => r || caches.match('/') || caches.match('/offline'))
        )
    );
    return;
  }

  // Twibbon images + static assets: cache-first.
  if (
    url.pathname.startsWith('/storage/') ||
    url.pathname.startsWith('/file/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/brand/') ||
    url.pathname.startsWith('/_next/static/') ||
    /\.(png|jpg|jpeg|webp|svg|woff2?)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(ASSET_CACHE).then((c) => c.put(request, copy)).catch(() => {});
            return res;
          })
      )
    );
  }
});
