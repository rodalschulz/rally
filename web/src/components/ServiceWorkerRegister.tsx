"use client";

import { useEffect } from "react";

/**
 * Register the PWA service worker only in production.
 * In development it must stay off — a caching SW fights Next.js HMR
 * and can cause infinite full-page refreshes.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      void unregisterDevServiceWorkers();
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* ignore — e.g. unsupported private mode */
    });
  }, []);

  return null;
}

async function unregisterDevServiceWorkers() {
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map((r) => r.unregister()));
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }
}
