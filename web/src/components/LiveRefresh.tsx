"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/** Soft revalidate while the tab is visible. Pauses in background. */
const INTERVAL_MS = 15_000;

/**
 * Seamless live sync for group pages: `router.refresh()` on an interval
 * when the document is visible, plus once when returning to the tab.
 */
export function LiveRefresh({ intervalMs = INTERVAL_MS }: { intervalMs?: number }) {
  const router = useRouter();
  const busy = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const softRefresh = () => {
      if (busy.current) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      busy.current = true;
      router.refresh();
      // Allow the next tick after RSC settles; avoid stacking refreshes.
      window.setTimeout(() => {
        busy.current = false;
      }, 750);
    };

    const start = () => {
      if (timer) return;
      timer = setInterval(softRefresh, intervalMs);
    };

    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        softRefresh();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, intervalMs]);

  return null;
}
