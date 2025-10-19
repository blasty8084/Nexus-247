// public/sw.js — Simple stable service worker for v6.8.6
const CACHE_NAME = 'cosmic-cache-v6.8.6';
const OFFLINE_URL = '/offline.html';
const ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/style.css',
  '/script.js',
  '/version.txt',
  '/icons/cosmic-logo-192.png',
  '/icons/cosmic-logo-512.png',
  '/icons/favicon.ico'
];

// install: precache app shell
self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// activate: cleanup old caches
self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// fetch: network-first for navigation, cache-first for assets, fallback to offline page
self.addEventListener('fetch', evt => {
  const url = new URL(evt.request.url);

  // Navigation (HTML) - try network then cache then offline
  if (evt.request.mode === 'navigate') {
    evt.respondWith(
      fetch(evt.request).then(res => {
        // fresh content, update cache
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(evt.request, copy));
        return res;
      }).catch(() => caches.match(evt.request).then(r => r || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // static resources: cache-first
  if (ASSETS.some(a => evt.request.url.endsWith(a))) {
    evt.respondWith(
      caches.match(evt.request).then(cached => cached || fetch(evt.request).then(res => {
        if(!res || res.status !== 200) return res;
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(evt.request, copy));
        return res;
      }).catch(()=>caches.match(OFFLINE_URL)))
    );
    return;
  }

  // socket.io or API: always try network
  if (url.pathname.includes('/socket.io') || url.pathname.startsWith('/api')) {
    evt.respondWith(fetch(evt.request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // default: try cache, fallback to network
  evt.respondWith(
    caches.match(evt.request).then(cached => cached || fetch(evt.request).catch(() => caches.match(OFFLINE_URL)))
  );
});

// push notifications (optional)
self.addEventListener('push', event => {
  const data = event.data?.json() || { title: 'Cosmic', body: 'New notification' };
  const title = data.title || 'Cosmic Dashboard';
  const options = {
    body: data.body || '',
    icon: '/icons/cosmic-logo-192.png',
    badge: '/icons/notify.svg',
    data: data.url || '/'
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data || '/';
  event.waitUntil(clients.openWindow(url));
});