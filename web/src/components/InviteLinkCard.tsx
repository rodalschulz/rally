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
    <div className="mb-6 rounded-2xl bg-sand px-4 py-3.5">
      <p className="text-[0.8rem] font-medium text-muted">Link de invitación</p>
      <p className="mt-1 break-all text-[0.85rem] text-ink">{url || `/join/${inviteCode}`}</p>
      <button
        type="button"
        className="mt-2 text-[0.85rem] font-medium text-ink"
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
        {copied ? "Copiado" : "Copiar link"}
      </button>
    </div>
  );
}
