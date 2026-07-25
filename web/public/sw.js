/* PWA service worker — production assets only. HTML is never cached. */
const CACHE = "rally-v2";
const PRECACHE = ["/manifest.webmanifest", "/icons/icon-192.png"];

// Safety: never stay active on local Next.js (HMR + cached "/" = refresh loop)
const isLocal =
  self.location.hostname === "localhost" ||
  self.location.hostname === "127.0.0.1";

self.addEventListener("install", (event) => {
  if (isLocal) {
    self.skipWaiting();
    return;
  }
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      if (isLocal) {
        await self.registration.unregister();
        return;
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  if (isLocal) return;

  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache navigations / HTML
  const accept = request.headers.get("accept") || "";
  if (request.mode === "navigate" || accept.includes("text/html")) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
