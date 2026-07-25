"use client";

import { useState } from "react";
import type { Player } from "@/lib/domain/types";
import { PlayerAvatar } from "./PlayerAvatar";

export function MembersPanel({
  members,
}: {
  members: { player: Player; role: "owner" | "member" }[];
}) {
  const [open, setOpen] = useState(false);
  const count = members.length;

  return (
    <section className="mt-8" aria-labelledby="members-heading">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="members-panel"
        className="flex w-full items-center justify-between gap-3 rounded-2xl bg-sand px-4 py-3.5 text-left transition active:scale-[0.99]"
      >
        <div className="min-w-0">
          <h2
            id="members-heading"
            className="text-[1.05rem] font-semibold tracking-[-0.02em] text-ink"
          >
            Integrantes
          </h2>
          <p className="mt-0.5 text-[0.7rem] text-muted">
            {count} {count === 1 ? "miembro" : "miembros"}
          </p>
        </div>
        <span
          className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open ? (
        <ul
          id="members-panel"
          className="mt-2 overflow-hidden rounded-2xl bg-sand"
        >
          {members.length === 0 ? (
            <li className="px-4 py-5 text-[0.9rem] text-muted">
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
      ) : null}
    </section>
  );
}
