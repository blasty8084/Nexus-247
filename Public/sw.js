// Simple service worker: cache-first static assets, network-first for API/socket fallback
const CACHE_NAME = 'cosmic-static-v6';
const OFFLINE_URL = '/';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/version.txt',
  '/icons/cosmic-logo-192.png',
  '/icons/cosmic-logo-512.png'
];

self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evt) => {
  const url = new URL(evt.request.url);
  // API passthrough
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) {
    return evt.respondWith(fetch(evt.request).catch(() => caches.match(OFFLINE_URL)));
  }
  // static assets: cache first
  evt.respondWith(
    caches.match(evt.request).then(cached => {
      if (cached) return cached;
      return fetch(evt.request).then(res => {
        if (!res || res.status !== 200 || res.type !== 'basic') return res;
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(evt.request, copy));
        return res;
      }).catch(() => caches.match(OFFLINE_URL));
    })
  );
});