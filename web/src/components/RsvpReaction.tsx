"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type RsvpReactionKind = "going" | "not_going";

/** How long the face stays on screen. */
export const RSVP_REACTION_MS = 2000;

/**
 * Cheesy full-screen face when the user taps Voy / No voy.
 * Renders in a portal so it always centers on the viewport.
 */
export function RsvpReaction({
  kind,
  token,
}: {
  kind: RsvpReactionKind | null;
  /** Bump to replay (e.g. Date.now() on each click). */
  token: number;
}) {
  const [active, setActive] = useState<{
    kind: RsvpReactionKind;
    token: number;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!kind || token === 0) {
      setActive(null);
      return;
    }
    setActive({ kind, token });
    const t = window.setTimeout(() => setActive(null), RSVP_REACTION_MS);
    return () => window.clearTimeout(t);
  }, [kind, token]);

  if (!mounted || !active) return null;

  const happy = active.kind === "going";

  return createPortal(
    <div
      key={active.token}
      className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center"
      aria-hidden
    >
      <div className="rsvp-face-scrim absolute inset-0 bg-mist/55" />
      <div
        className={`rsvp-face-card relative flex flex-col items-center gap-2 rounded-[2rem] px-8 py-7 shadow-2xl ${
          happy ? "bg-ball text-on-ball" : "bg-sand text-ink ring-1 ring-ink/10"
        }`}
      >
        <span
          className={`rsvp-face-emoji select-none text-[5.5rem] leading-none ${
            happy ? "rsvp-face-bounce" : "rsvp-face-wobble"
          }`}
          role="img"
          aria-label={happy ? "cara feliz" : "cara triste"}
        >
          {happy ? "😄" : "😢"}
        </span>
        <p className="text-[1.15rem] font-semibold tracking-[-0.02em]">
          {happy ? "¡Voy!" : "No voy…"}
        </p>
      </div>
    </div>,
    document.body,
  );
}
