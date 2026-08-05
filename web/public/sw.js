/**
 * PWA service worker — static assets + Web Push.
 * Never cache HTML, RSC/Flight, or API: that caused stale Games/attendance on Safari.
 */
const CACHE = "rally-v5";
const PRECACHE = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-180.png",
];

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

self.addEventListener("push", (event) => {
  let data = { title: "rally", body: "", url: "/" };
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch {
    /* ignore malformed payload */
  }

  const title = data.title || "rally";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawUrl = event.notification.data?.url || "/";
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client && client.url !== targetUrl) {
            try {
              await client.navigate(targetUrl);
              return;
            } catch {
              /* fall through to openWindow */
            }
          } else {
            return;
          }
        }
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});
