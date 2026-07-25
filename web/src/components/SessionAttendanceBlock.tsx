"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AttendanceStatus, Player } from "@/lib/domain/types";
import { setAttendanceAction } from "@/lib/actions/sessions";
import { AttendanceBadge } from "@/components/AttendanceUi";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Spinner } from "@/components/Spinner";

type AttMap = Record<string, AttendanceStatus>;

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
}: {
  playSessionId: string;
  meId: string;
  players: Player[];
  financierId: string;
  initialAttendances: { playerId: string; status: AttendanceStatus }[];
  syncKey: string;
  maxAttendees?: number | null;
  allowedUserIds: string[];
}) {
  const router = useRouter();
  const [attByUser, setAttByUser] = useState(() => toMap(initialAttendances));
  const [pending, startTransition] = useTransition();
  const [pendingOpt, setPendingOpt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAttByUser(toMap(initialAttendances));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- syncKey drives refresh
  }, [syncKey]);

  const restricted = allowedUserIds.length > 0;
  const allowedSet = new Set(allowedUserIds);
  const isAllowed = !restricted || allowedSet.has(meId);

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

  const options = ["going", "maybe", "not_going"] as const;
  const labels: Record<(typeof options)[number], string> = {
    going: "Voy",
    maybe: "Quizás",
    not_going: "No voy",
  };

  return (
    <>
      <section className="animate-rise mt-8">
        <h2 className="mb-2 text-[1.05rem] font-semibold tracking-[-0.02em] text-ink">
          Tu asistencia
        </h2>
        {!isAllowed ? (
          <p className="rounded-2xl bg-sand px-4 py-3.5 text-[0.9rem] text-muted">
            Esta fecha es solo para invitados. No estás en la lista.
          </p>
        ) : (
          <>
            <div
              className="relative flex gap-1 rounded-xl bg-mist-2 p-1"
              role="group"
              aria-label="Tu asistencia"
              aria-busy={pending}
            >
              {options.map((opt) => {
                const isActive = active === opt;
                const isThisPending = pending && pendingOpt === opt;
                const blockedGoing = opt === "going" && atCapacity;
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={pending || blockedGoing}
                    onClick={() => {
                      const previous = attByUser;
                      setError(null);
                      setPendingOpt(opt);
                      setAttByUser((prev) => ({ ...prev, [meId]: opt }));
                      startTransition(async () => {
                        const result = await setAttendanceAction(
                          playSessionId,
                          opt,
                        );
                        if (!result.ok) {
                          setAttByUser(previous);
                          setError(result.error);
                        } else {
                          router.refresh();
                        }
                        setPendingOpt(null);
                      });
                    }}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-[0.65rem] px-2 py-2.5 text-[0.9rem] font-medium transition active:scale-[0.98] disabled:opacity-70 ${
                      isActive ? "bg-sand text-ink shadow-sm" : "text-muted"
                    }`}
                  >
                    {isThisPending ? <Spinner className="size-3.5" /> : null}
                    {labels[opt]}
                  </button>
                );
              })}
            </div>
            {atCapacity ? (
              <p className="mt-2 text-[0.8rem] text-muted">Cupo completo.</p>
            ) : null}
            {error ? (
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
        <ul className="overflow-hidden rounded-2xl bg-sand">
          {listedPlayers.map((player) => {
            const status = attByUser[player.id] ?? "pending";
            const isFinancier = player.id === financierId;
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
                <AttendanceBadge status={status} />
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
