"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Player } from "@/lib/domain/types";
import { PlayerAvatar } from "./PlayerAvatar";

export function MembersPanel({
  members,
  inviteCode,
}: {
  members: { player: Player; role: "owner" | "member" }[];
  /** When set (owner), show invite copy action inside the modal. */
  inviteCode?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const count = members.length;
  const canInvite = Boolean(inviteCode);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  async function copyInviteLink() {
    if (!inviteCode) return;
    const full =
      typeof window !== "undefined"
        ? `${window.location.origin}/join/${inviteCode}`
        : `/join/${inviteCode}`;
    await navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Integrantes (${count})`}
        title="Integrantes"
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-mist-2 text-muted transition hover:text-ink active:scale-95"
      >
        <PeopleIcon />
      </button>

      {portalReady && open
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
              role="presentation"
              onClick={() => setOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="members-title"
                className="flex max-h-[min(70vh,28rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-sand shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3 border-b border-ink/6 px-4 py-3">
                  <div className="min-w-0">
                    <h2
                      id="members-title"
                      className="text-[1.05rem] font-semibold tracking-[-0.02em] text-ink"
                    >
                      Integrantes
                    </h2>
                    <p className="mt-0.5 text-[0.75rem] text-muted">
                      {count} {count === 1 ? "miembro" : "miembros"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="shrink-0 rounded-lg px-2 py-1 text-[0.9rem] font-medium text-muted"
                    aria-label="Cerrar"
                  >
                    Cerrar
                  </button>
                </div>
                <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  {members.length === 0 ? (
                    <li className="px-4 py-6 text-[0.9rem] text-muted">
                      Todavía no hay integrantes.
                    </li>
                  ) : (
                    members.map(({ player, role }) => (
                      <li
                        key={player.id}
                        className="flex items-center gap-3 border-b border-ink/6 px-4 py-3 last:border-b-0"
                      >
                        <PlayerAvatar player={player} size="sm" />
                        <span className="min-w-0 flex-1 truncate font-medium text-ink">
                          {player.displayName}
                        </span>
                        {role === "owner" ? (
                          <span className="shrink-0 text-[0.75rem] text-muted">
                            dueño
                          </span>
                        ) : null}
                      </li>
                    ))
                  )}
                </ul>
                {canInvite ? (
                  <div className="border-t border-ink/6 px-4 py-3">
                    <button
                      type="button"
                      onClick={copyInviteLink}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-mist-2 px-3 py-2.5 text-[0.9rem] font-medium text-ink transition hover:bg-mist-2/80 active:scale-[0.99]"
                    >
                      {copied ? <CheckIcon /> : <CopyIcon />}
                      {copied
                        ? "Link copiado"
                        : "Copiar link de invitación"}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function PeopleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M3.5 18.5c.8-2.6 2.9-4 5.5-4s4.7 1.4 5.5 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="17" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M15.5 18.5c.5-1.7 1.7-2.8 3.5-3.2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
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
