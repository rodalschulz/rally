"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AttendanceStatus, Player } from "@/lib/domain/types";
import { setAttendanceAction } from "@/lib/actions/sessions";
import { AttendanceBadge } from "@/components/AttendanceUi";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import {
  RsvpReaction,
  type RsvpReactionKind,
} from "@/components/RsvpReaction";
import { Spinner } from "@/components/Spinner";

type AttMap = Record<string, AttendanceStatus>;

const OPTIONS = ["going", "maybe", "not_going"] as const;
const LABELS: Record<(typeof OPTIONS)[number], string> = {
  going: "Voy",
  maybe: "Quizás",
  not_going: "No voy",
};
const ADMIN_OPTIONS = ["pending", "going", "maybe", "not_going"] as const;
const ADMIN_LABELS: Record<(typeof ADMIN_OPTIONS)[number], string> = {
  pending: "Pendiente",
  going: "Voy",
  maybe: "Quizás",
  not_going: "No voy",
};

function toMap(
  rows: { playerId: string; status: AttendanceStatus }[],
): AttMap {
  const m: AttMap = {};
  for (const r of rows) m[r.playerId] = r.status;
  return m;
}

export function SessionAttendanceBlock({
  playSessionId,
  meId,
  players,
  financierId,
  initialAttendances,
  syncKey,
  maxAttendees,
  allowedUserIds,
  canChange,
  isAppAdmin = false,
}: {
  playSessionId: string;
  meId: string;
  players: Player[];
  financierId: string;
  initialAttendances: { playerId: string; status: AttendanceStatus }[];
  syncKey: string;
  maxAttendees?: number | null;
  allowedUserIds: string[];
  /** False for Fechas Pasadas — RSVP is read-only for everyone. */
  canChange: boolean;
  /** App admin can change any member's RSVP while the fecha is still open. */
  isAppAdmin?: boolean;
}) {
  const router = useRouter();
  const [attByUser, setAttByUser] = useState(() => toMap(initialAttendances));
  const [pending, startTransition] = useTransition();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reaction, setReaction] = useState<{
    kind: RsvpReactionKind;
    token: number;
  } | null>(null);
  /** Admin: which player's badge is expanded into a select. */
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const editSelectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    setAttByUser(toMap(initialAttendances));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- syncKey drives refresh
  }, [syncKey]);

  useEffect(() => {
    if (editingPlayerId) editSelectRef.current?.focus();
  }, [editingPlayerId]);

  const restricted = allowedUserIds.length > 0;
  const allowedSet = new Set(allowedUserIds);
  const isAllowed = !restricted || allowedSet.has(meId);
  /** Past fechas: nobody edits RSVP (not even app admin). */
  const canEditSelf = canChange;
  const canAdminEditOthers = canChange && isAppAdmin;

  const listedPlayers = restricted
    ? players.filter((p) => allowedSet.has(p.id))
    : players;

  const myAtt = attByUser[meId] ?? "pending";
  const active = myAtt === "pending" ? null : myAtt;
  const goingCount = listedPlayers.filter(
    (p) => (attByUser[p.id] ?? "pending") === "going",
  ).length;
  const atCapacity =
    maxAttendees != null &&
    goingCount >= maxAttendees &&
    myAtt !== "going";

  const applyStatus = (
    playerId: string,
    status: AttendanceStatus,
    opts?: { confirm?: boolean },
  ): boolean => {
    if (opts?.confirm) {
      const player = listedPlayers.find((p) => p.id === playerId);
      const label =
        ADMIN_LABELS[status as (typeof ADMIN_OPTIONS)[number]] ?? status;
      const who =
        playerId === meId
          ? "¿Cambiar tu asistencia"
          : `¿Cambiar a ${player?.displayName ?? "este jugador"}`;
      if (!window.confirm(`${who} a “${label}”?`)) return false;
    }

    const previous = attByUser;
    const key = `${playerId}:${status}`;
    setError(null);
    setPendingKey(key);
    if (
      playerId === meId &&
      (status === "going" || status === "not_going")
    ) {
      setReaction({ kind: status, token: Date.now() });
    }
    setAttByUser((prev) => ({ ...prev, [playerId]: status }));
    startTransition(async () => {
      const result = await setAttendanceAction(
        playSessionId,
        status,
        playerId === meId ? undefined : playerId,
      );
      if (!result.ok) {
        setAttByUser(previous);
        setError(result.error);
      } else {
        setEditingPlayerId(null);
        router.refresh();
      }
      setPendingKey(null);
    });
    return true;
  };

  return (
    <>
      <RsvpReaction
        kind={reaction?.kind ?? null}
        token={reaction?.token ?? 0}
      />
      <section className="animate-rise mt-8">
        <h2 className="mb-2 text-[1.05rem] font-semibold tracking-[-0.02em] text-ink">
          Tu asistencia
        </h2>
        {!isAllowed && !isAppAdmin ? (
          <p className="rounded-2xl bg-sand px-4 py-3.5 text-[0.9rem] text-muted">
            Esta fecha es solo para invitados. No estás en la lista.
          </p>
        ) : !canEditSelf ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-sand px-4 py-3.5">
            <p className="text-[0.85rem] text-muted">
              Esta fecha ya pasó — la asistencia no se puede cambiar.
            </p>
            <AttendanceBadge status={myAtt} />
          </div>
        ) : (
          <>
            <div
              className="relative flex gap-1 rounded-xl bg-mist-2 p-1"
              role="group"
              aria-label="Tu asistencia"
              aria-busy={pending}
            >
              {OPTIONS.map((opt) => {
                const isActive = active === opt;
                const isThisPending = pending && pendingKey === `${meId}:${opt}`;
                const blockedGoing = opt === "going" && atCapacity;
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={pending || blockedGoing}
                    onClick={() =>
                      applyStatus(meId, opt, {
                        confirm: canAdminEditOthers,
                      })
                    }
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-[0.65rem] px-2 py-2.5 text-[0.9rem] font-medium transition active:scale-[0.98] disabled:opacity-70 ${
                      isActive ? "bg-sand text-ink shadow-sm" : "text-muted"
                    }`}
                  >
                    {isThisPending ? <Spinner className="size-3.5" /> : null}
                    {LABELS[opt]}
                  </button>
                );
              })}
            </div>
            {atCapacity ? (
              <p className="mt-2 text-[0.8rem] text-muted">Cupo completo.</p>
            ) : null}
            {error && !isAppAdmin ? (
              <p className="mt-2 text-[0.85rem] text-danger">{error}</p>
            ) : null}
          </>
        )}
      </section>

      <section className="animate-rise mt-8">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h2 className="text-[1.05rem] font-semibold tracking-[-0.02em] text-ink">
            Jugadores
          </h2>
          <p className="text-[0.8rem] text-muted">
            {maxAttendees != null
              ? `${goingCount}/${maxAttendees} confirmados`
              : `${goingCount} confirmados`}
          </p>
        </div>
        {restricted ? (
          <p className="mb-2 text-[0.8rem] text-muted">
            Solo invitados ({listedPlayers.length})
          </p>
        ) : null}
        {canAdminEditOthers ? (
          <p className="mb-2 text-[0.8rem] text-muted">
            Toca el estado de un jugador para editarlo.
          </p>
        ) : null}
        <ul className="overflow-hidden rounded-2xl bg-sand">
          {listedPlayers.map((player) => {
            const status = attByUser[player.id] ?? "pending";
            const isFinancier = player.id === financierId;
            const playerAtCapacity =
              maxAttendees != null &&
              goingCount >= maxAttendees &&
              status !== "going";
            const isEditing =
              canAdminEditOthers && editingPlayerId === player.id;
            return (
              <li
                key={player.id}
                className="flex items-center gap-3 border-b border-ink/6 px-4 py-3 last:border-b-0"
              >
                <PlayerAvatar player={player} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">
                    {player.displayName}
                    {isFinancier ? (
                      <span className="ml-2 text-[0.75rem] font-normal text-muted">
                        pagó la cancha
                      </span>
                    ) : null}
                  </p>
                </div>
                {isEditing ? (
                  <select
                    ref={editSelectRef}
                    value={status}
                    disabled={pending}
                    aria-label={`Asistencia de ${player.displayName}`}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setEditingPlayerId(null);
                      }
                    }}
                    onChange={(e) => {
                      const next = e.target.value as AttendanceStatus;
                      if (next === status) {
                        setEditingPlayerId(null);
                        return;
                      }
                      if (next === "going" && playerAtCapacity) {
                        setError("Cupo completo");
                        setAttByUser((prev) => ({ ...prev }));
                        return;
                      }
                      const applied = applyStatus(player.id, next, {
                        confirm: true,
                      });
                      if (!applied) {
                        // Controlled select: re-sync DOM after cancel
                        setAttByUser((prev) => ({ ...prev }));
                        setEditingPlayerId(null);
                      }
                    }}
                    className="max-w-[7.5rem] shrink-0 rounded-lg bg-mist-2 px-2 py-1.5 text-[0.8rem] font-medium text-ink"
                  >
                    {ADMIN_OPTIONS.map((opt) => (
                      <option
                        key={opt}
                        value={opt}
                        disabled={opt === "going" && playerAtCapacity}
                      >
                        {ADMIN_LABELS[opt]}
                      </option>
                    ))}
                  </select>
                ) : canAdminEditOthers ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setEditingPlayerId(player.id)}
                    aria-label={`Editar asistencia de ${player.displayName}`}
                    className="shrink-0 rounded-full transition active:scale-[0.98] disabled:opacity-70"
                  >
                    <AttendanceBadge status={status} />
                  </button>
                ) : (
                  <AttendanceBadge status={status} />
                )}
              </li>
            );
          })}
        </ul>
        {canAdminEditOthers && error ? (
          <p className="mt-2 text-[0.85rem] text-danger">{error}</p>
        ) : null}
      </section>
    </>
  );
}
