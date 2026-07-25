"use client";

import { useState } from "react";

export function InviteLinkCard({
  inviteCode,
  isOwner,
}: {
  inviteCode: string;
  isOwner: boolean;
}) {
  const [copied, setCopied] = useState(false);
  if (!isOwner) return null;

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const url = `${origin}/join/${inviteCode}`;

  return (
    <div className="mb-6 flex min-w-0 items-center gap-2 rounded-2xl bg-sand px-4 py-3 text-[0.85rem]">
      <span className="shrink-0 text-muted">Link:</span>
      <span className="min-w-0 flex-1 truncate text-ink">
        {url || `/join/${inviteCode}`}
      </span>
      <button
        type="button"
        className="shrink-0 font-medium text-ink"
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
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}
