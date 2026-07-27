import Link from "next/link";
import type { Attendance, Player, Session } from "@/lib/domain/types";
import {
  formatSessionListParts,
  formatSoles,
  formatSessionWhen,
  relativeDayLabel,
} from "@/lib/format";
import { isSessionPast } from "@/lib/sessions/windows";
import { PlayerAvatar } from "./PlayerAvatar";

export function SessionRow({
  session,
  goingPlayers,
  goingCount,
  index = 0,
  hrefBase = "/sessions",
}: {
  session: Session;
  goingPlayers: Player[];
  goingCount: number;
  index?: number;
  hrefBase?: string;
}) {
  const when = formatSessionWhen(session.startsAt);
  const rel = relativeDayLabel(session.startsAt);
  const past =
    session.status === "completed" || isSessionPast(session.startsAt);
  const dateParts = formatSessionListParts(session.startsAt);

  return (
    <Link
      href={`${hrefBase}/${session.id}`}
      className="animate-rise group flex items-center gap-3 border-b border-ink/6 px-4 py-3.5 last:border-b-0 active:bg-mist"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="w-12 shrink-0 text-center">
        <p className="text-[1.35rem] font-semibold leading-none tracking-[-0.03em] text-ink">
          {dateParts.day}
        </p>
        <p className="mt-1 text-[0.7rem] font-medium leading-none text-muted">
          {dateParts.month}
        </p>
        <p className="mt-0.5 text-[0.7rem] font-medium leading-none text-muted">
          {dateParts.weekday}
        </p>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[1.05rem] font-medium tracking-[-0.02em] text-ink">
            {when.time}
          </p>
          {rel ? (
            <span className="rounded-full bg-mist-2 px-2 py-0.5 text-[0.7rem] font-medium text-ink-soft">
              {rel}
            </span>
          ) : null}
          {past ? (
            <span className="rounded-full bg-mist-2 px-2 py-0.5 text-[0.7rem] font-medium text-muted">
              Jugado
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-[0.85rem] text-muted">
          {session.courtLabel ?? "Cancha TBD"} · {formatSoles(session.costAmount)}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {goingPlayers.slice(0, 4).map((p) => (
              <span key={p.id} className="rounded-full ring-2 ring-sand">
                <PlayerAvatar player={p} size="sm" />
              </span>
            ))}
          </div>
          <span className="text-[0.75rem] text-muted">
            {goingCount} {goingCount === 1 ? "va" : "van"}
          </span>
        </div>
      </div>

      <span className="text-muted/50" aria-hidden>
        ›
      </span>
    </Link>
  );
}

export function goingFrom(
  sessionId: string,
  attendances: Attendance[],
  players: Player[],
): { players: Player[]; count: number } {
  const ids = new Set(
    attendances
      .filter((a) => a.sessionId === sessionId && a.status === "going")
      .map((a) => a.playerId),
  );
  const list = players.filter((p) => ids.has(p.id));
  return { players: list, count: list.length };
}
