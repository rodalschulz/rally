"use client";

import { useLayoutEffect, useRef } from "react";
import { clampChartTooltipLeft } from "@/lib/ui/clampChartTooltip";

/**
 * Pins a tooltip's left edge so the box stays inside `containerRef`.
 * Waits until the tooltip has a real width — measuring 0px would park it
 * on the right edge and the growing box would clip away (Resumen Games).
 */
export function useClampedChartTooltip(
  pointXRatio: number | null,
  opts?: { /** Sit above the anchor (individual Elo chart). */ lift?: boolean },
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const lift = opts?.lift ?? true;

  useLayoutEffect(() => {
    const box = containerRef.current;
    const tip = tooltipRef.current;
    if (pointXRatio == null || !box || !tip) return;

    const apply = () => {
      // If width is not ready yet, estimate so we never paint with `left: 95%`
      // (that inflates document scrollWidth and iOS leaps the page up).
      const tw =
        tip.offsetWidth > 0
          ? tip.offsetWidth
          : Math.min(box.clientWidth - 16, 176);
      const left = clampChartTooltipLeft(
        box.clientWidth,
        tw,
        pointXRatio,
      );
      tip.style.left = `${left}px`;
      tip.style.maxWidth = `${Math.max(box.clientWidth - 16, 0)}px`;
      // Tailwind `translate-*` uses the `translate` property, separate from
      // `transform`. Clear it or -translate-x-1/2 would still shove the box
      // left after we already clamped `left`.
      tip.style.translate = "none";
      tip.style.transform = lift ? "translateY(-100%)" : "none";
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(tip);
    return () => ro.disconnect();
  }, [pointXRatio, lift]);

  return { containerRef, tooltipRef };
}
