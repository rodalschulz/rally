"use client";

import { useState } from "react";
import type { Player } from "@/lib/domain/types";

export function SessionLimitsFields({
  players,
  creatorId,
  defaultMaxAttendees,
  defaultAllowedUserIds,
}: {
  players: Player[];
  creatorId: string;
  defaultMaxAttendees?: number | null;
  defaultAllowedUserIds?: string[];
}) {
  const initialAllowed = defaultAllowedUserIds ?? [];
  const [restrict, setRestrict] = useState(initialAllowed.length > 0);
  const [selected, setSelected] = useState<Set<string>>(() => {
    if (initialAllowed.length > 0) {
      return new Set([...initialAllowed, creatorId]);
    }
    return new Set([creatorId]);
  });

  const toggle = (id: string) => {
    if (id === creatorId) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <label className="block text-[0.8rem] text-muted">
        Máximo de asistentes (opcional)
        <input
          type="number"
          name="maxAttendees"
          min={1}
          max={99}
          defaultValue={defaultMaxAttendees ?? ""}
          placeholder="Sin límite"
          className="mt-1 w-full rounded-xl bg-sand px-3 py-3 text-ink placeholder:text-muted"
        />
        <span className="mt-1 block text-[0.75rem] text-muted">
          Solo cuenta quienes marcan “Voy”. Dejarlo en cero para ilimitado.
        </span>
      </label>

      <div className="rounded-2xl bg-sand px-4 py-3.5">
        <label className="flex items-center justify-between gap-3">
          <span className="text-[0.9rem] font-medium text-ink">
            Restringir asistentes
          </span>
          <input
            type="checkbox"
            checked={restrict}
            onChange={(e) => {
              setRestrict(e.target.checked);
              if (e.target.checked) {
                setSelected((prev) => new Set([...prev, creatorId]));
              }
            }}
            className="size-4 accent-[var(--ball)]"
          />
        </label>
        <p className="mt-1 text-[0.75rem] text-muted">
          Si está activo, solo los marcados pueden confirmar “Voy”.
        </p>

        {restrict ? (
          <ul className="mt-3 space-y-1 border-t border-ink/6 pt-3">
            {players.map((p) => {
              const isCreator = p.id === creatorId;
              const checked = selected.has(p.id);
              return (
                <li key={p.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl px-1 py-2 active:bg-mist">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={isCreator}
                      onChange={() => toggle(p.id)}
                      className="size-4 accent-[var(--ball)]"
                    />
                    <span className="flex-1 text-[0.9rem] text-ink">
                      {p.displayName}
                      {isCreator ? (
                        <span className="ml-1.5 text-[0.75rem] text-muted">
                          (tú)
                        </span>
                      ) : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        ) : null}

        {/* Submitted values: empty = no restriction */}
        {restrict
          ? [...selected].map((id) => (
              <input key={id} type="hidden" name="allowedUserIds" value={id} />
            ))
          : null}
      </div>
    </div>
  );
}
