"use client";

import { useState } from "react";

/** Owner control: copies `/join/[code]` — icon only (e.g. ajustes). */
export function InviteLinkCard({
  inviteCode,
  isOwner,
}: {
  inviteCode: string;
  isOwner: boolean;
}) {
  const [copied, setCopied] = useState(false);
  if (!isOwner) return null;

  return (
    <button
      type="button"
      aria-label={copied ? "Link copiado" : "Copiar link de invitación"}
      title={copied ? "Copiado" : "Copiar link"}
      className="inline-flex size-8 shrink-0 items-center justify-center self-center rounded-full leading-none text-muted transition active:scale-95 active:bg-sand"
      onClick={async () => {
        const full =
          typeof window !== "undefined"
            ? `${window.location.origin}/join/${inviteCode}`
            : `/join/${inviteCode}`;
        await navigator.clipboard.writeText(full);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
}

function CopyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="9"
        y="9"
        width="11"
        height="11"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M5 15V5a2 2 0 0 1 2-2h10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12.5 10 17.5 19 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
