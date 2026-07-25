/**
 * PWA service worker — static assets only.
 * Never cache HTML, RSC/Flight, or API: that caused stale Games/attendance on Safari.
 */
const CACHE = "rally-v3";
const PRECACHE = ["/manifest.webmanifest", "/icons/icon-192.png"];

const isLocal =
  self.location.hostname === "localhost" ||
  self.location.hostname === "127.0.0.1";

function isCacheableAsset(url) {
  if (url.pathname === "/manifest.webmanifest") return true;
  if (url.pathname.startsWith("/icons/")) return true;
  // Fingerprinted Next build assets only (not /_next/data or RSC)
  if (url.pathname.startsWith("/_next/static/")) return true;
  return false;
}

self.addEventListener("install", (event) => {
  if (isLocal) {
    self.skipWaiting();
    return;
  }
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
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

  // Navigations, RSC, server components, pages → always network (default).
  if (!isCacheableAsset(url)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
