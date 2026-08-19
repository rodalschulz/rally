"use client";

import { useEffect, useRef, type PointerEvent } from "react";

/**
 * Horizontal scrub on the Elo charts without the page jumping or scrolling.
 *
 * Mobile Safari ignores `touch-action` on <svg> and may scroll-into-view
 * when pointer capture is set (chart sits above the bottom nav → a leap up).
 */
export function useChartScrub(
  pointCount: number,
  onHover: (index: number | null) => void,
) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const lockedScrollY = useRef<number | null>(null);

  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const blockScroll = (e: TouchEvent) => {
      e.preventDefault();
    };
    el.addEventListener("touchmove", blockScroll, {
      passive: false,
      capture: true,
    });
    return () =>
      el.removeEventListener("touchmove", blockScroll, { capture: true });
  }, []);

  function restoreScroll() {
    const y = lockedScrollY.current;
    if (y == null) return;
    window.scrollTo(0, y);
  }

  function indexFromEvent(e: PointerEvent<HTMLDivElement>) {
    if (pointCount < 2) return 0;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    const idx = Math.round(frac * (pointCount - 1));
    return Math.min(Math.max(idx, 0), pointCount - 1);
  }

  return {
    surfaceRef,
    surfaceProps: {
      onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
        lockedScrollY.current = window.scrollY;
        onHover(indexFromEvent(e));
        // Safari sometimes adjusts scroll after the tooltip mounts.
        requestAnimationFrame(() => {
          restoreScroll();
          requestAnimationFrame(restoreScroll);
        });
      },
      onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
        onHover(indexFromEvent(e));
        restoreScroll();
      },
      onPointerUp: () => {
        restoreScroll();
        lockedScrollY.current = null;
        onHover(null);
      },
      onPointerCancel: () => {
        lockedScrollY.current = null;
        onHover(null);
      },
      onPointerLeave: (e: PointerEvent<HTMLDivElement>) => {
        if (e.buttons !== 0) return;
        onHover(null);
      },
    },
  };
}
