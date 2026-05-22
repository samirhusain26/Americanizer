const CACHE_NAME = "americanizer-cache-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
  "/meteocons/clear-day.svg",
  "/meteocons/extreme-snow.svg",
  "/meteocons/mostly-clear-day.svg",
  "/meteocons/overcast-day-snow.svg",
  "/meteocons/overcast.svg",
  "/meteocons/partly-cloudy-day.svg",
  "/meteocons/sun-hot.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Ignore non-GET requests, hot reloader (webpack/next), chrome-extension, and exchangerate API
  if (
    event.request.method !== "GET" ||
    url.pathname.includes("/_next/") ||
    url.pathname.includes("/__next_") ||
    url.protocol.startsWith("chrome-extension:") ||
    url.hostname.includes("api.exchangerate")
  ) {
    return;
  }

  // Use network-first for documents/routes to ensure fresh SSR/content
  const isDocument = event.request.mode === "navigate";
  if (isDocument) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Use cache-first for static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache in the background (stale-while-revalidate)
        fetch(event.request)
          .then((response) => {
            if (response.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      });
    })
  );
});
