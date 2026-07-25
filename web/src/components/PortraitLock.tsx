"use client";

import { useEffect } from "react";

/** Prefer portrait; CSS overlay covers landscape on small screens. */
export function PortraitLock() {
  useEffect(() => {
    const orient = screen.orientation as ScreenOrientation & {
      lock?: (orientation: string) => Promise<void>;
    };
    if (typeof orient?.lock === "function") {
      void orient.lock("portrait").catch(() => {
        /* iOS / unsupported — CSS fallback handles UX */
      });
    }
  }, []);

  return (
    <div
      className="portrait-lock-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Gira el teléfono"
    >
      <p className="text-center text-[1.05rem] font-medium text-ink">
        Gira el teléfono a vertical
      </p>
      <p className="mt-2 max-w-[20ch] text-center text-[0.9rem] text-muted">
        rally se usa solo en modo vertical.
      </p>
    </div>
  );
}
