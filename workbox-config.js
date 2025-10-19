/**
 * ⚙️ workbox-config.js
 * Cosmic Dashboard v6.8.4 (LTS+PWA)
 * Configuration for Workbox injectManifest — generates /public/sw.js
 */

module.exports = {
  globDirectory: "public/",
  globPatterns: [
    "**/*.{html,css,js,webp,svg,png,ico,json,woff2,mp3,txt}"
  ],

  swSrc: "public/service-worker.js",
  swDest: "public/sw.js",

  // ignore large or dev-only files
  globIgnores: [
    "**/node_modules/**/*",
    "**/logs/**/*",
    "**/plugins/**/*",
    "**/docker/**/*",
    "**/telemetry/**/*"
  ],

  maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6MB limit

  runtimeCaching: [
    {
      urlPattern: ({ request }) => request.destination === "document",
      handler: "NetworkFirst",
      options: {
        cacheName: "pages-cache-v6",
        expiration: { maxEntries: 20, maxAgeSeconds: 7 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: ({ request }) => request.destination === "style",
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "css-cache-v6",
        expiration: { maxEntries: 30 },
      },
    },
    {
      urlPattern: ({ request }) => request.destination === "script",
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "js-cache-v6",
        expiration: { maxEntries: 30 },
      },
    },
    {
      urlPattern: ({ request }) => request.destination === "image",
      handler: "CacheFirst",
      options: {
        cacheName: "image-cache-v6",
        expiration: {
          maxEntries: 40,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      urlPattern: ({ url }) =>
        url.origin.includes("fonts.googleapis.com") ||
        url.origin.includes("fonts.gstatic.com"),
      handler: "CacheFirst",
      options: {
        cacheName: "font-cache-v6",
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: ({ url }) =>
        url.pathname.endsWith("/socket.io/") ||
        url.pathname.includes("/socket.io"),
      handler: "NetworkOnly",
      options: { cacheName: "socket-cache-v6" },
    },
  ],
};