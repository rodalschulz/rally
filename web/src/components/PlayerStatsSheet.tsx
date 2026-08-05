"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Match, Player } from "@/lib/domain/types";
import { formatSessionChip } from "@/lib/format";
import {
  buildPlayerGameStats,
  type PlayerStatsAttendanceInput,
  type PlayerStatsSessionInput,
} from "@/lib/ranking/playerStats";
import { EloHistoryChart } from "./EloHistoryChart";
import { PlayerAvatar } from "./PlayerAvatar";

export function PlayerStatsSheet({
  player,
  open,
  onClose,
  matches,
  memberIds,
  displayNameById,
  joinedAt,
  sessions,
  attendances,
}: {
  player: Player | null;
  open: boolean;
  onClose: () => void;
  matches: Match[];
  memberIds: string[];
  displayNameById: Record<string, string>;
  joinedAt: string;
  sessions: PlayerStatsSessionInput[];
  attendances: PlayerStatsAttendanceInput[];
}) {
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const nameMap = useMemo(
    () => new Map(Object.entries(displayNameById)),
    [displayNameById],
  );

  const stats = useMemo(() => {
    if (!player) return null;
    return buildPlayerGameStats({
      playerId: player.id,
      matches,
      memberIds,
      displayNameById: nameMap,
      joinedAt,
      sessions,
      attendances,
    });
  }, [
    player,
    matches,
    memberIds,
    nameMap,
    joinedAt,
    sessions,
    attendances,
  ]);

  if (!portalReady || !open || !player || !stats) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 px-3 pb-[max(0.75rem,var(--safe-bottom))] pt-3 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-stats-title"
        className="flex max-h-[min(88dvh,40rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-sand shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink/6 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <PlayerAvatar player={player} size="lg" />
            <div className="min-w-0">
              <h2
                id="player-stats-title"
                className="truncate text-[1.15rem] font-semibold tracking-[-0.02em] text-ink"
              >
                {player.displayName}
              </h2>
              <p className="mt-0.5 text-[0.8rem] text-muted">
                {stats.rank != null ? `#${stats.rank} · ` : null}
                {stats.currentElo} Elo.G
                {stats.winRate != null
                  ? ` · ${Math.round(stats.winRate * 100)}% ganados`
                  : null}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg px-2 py-1 text-[0.9rem] font-medium text-muted"
            aria-label="Cerrar"
          >
            Cerrar
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <section className="mb-5">
            <h3 className="mb-2 text-[0.8rem] font-medium uppercase tracking-[0.04em] text-muted">
              Historial de Elo
            </h3>
            <EloHistoryChart history={stats.eloHistory} />
          </section>

          <div className="mb-5 grid grid-cols-2 gap-3">
            <StatTile
              label="Games ganados"
              value={
                stats.played > 0
                  ? `${stats.wins}G · ${stats.losses}P`
                  : "—"
              }
              hint={
                stats.winRate != null
                  ? `${Math.round(stats.winRate * 100)}%`
                  : undefined
              }
            />
            <StatTile
              label="Elo máximo"
              value={String(stats.eloMax)}
            />
            <StatTile
              label="Racha más larga"
              value={
                stats.longestWinStreak > 0
                  ? `${stats.longestWinStreak}`
                  : "—"
              }
              hint={stats.longestWinStreak > 0 ? "Games seguidos" : undefined}
            />
            <StatTile
              label="Mayor +Elo en fecha"
              value={
                stats.maxEloGainInSession
                  ? `+${stats.maxEloGainInSession.delta}`
                  : "—"
              }
              hint={
                stats.maxEloGainInSession
                  ? formatSessionChip(
                      stats.maxEloGainInSession.sessionStartsAt,
                    )
                  : undefined
              }
            />
            <StatTile
              label="Asistencia"
              value={
                stats.attendance.rate != null
                  ? `${Math.round(stats.attendance.rate * 100)}%`
                  : "—"
              }
              hint={
                stats.attendance.eligible > 0
                  ? `${stats.attendance.going} de ${stats.attendance.eligible} fechas`
                  : undefined
              }
            />
            <StatTile
              label="Rival más jugado"
              value={stats.topRival?.displayName ?? "—"}
              hint={
                stats.topRival
                  ? `${stats.topRival.wins}G · ${stats.topRival.losses}P (${stats.topRival.played})`
                  : undefined
              }
            />
          </div>

          {stats.serverStats ? (
            <section className="mb-5">
              <h3 className="mb-2 text-[0.8rem] font-medium uppercase tracking-[0.04em] text-muted">
                Como servidor
              </h3>
              <p className="text-[0.85rem] text-muted">
                En {stats.serverStats.sampleSize} Games con servidor
                registrado
              </p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <StatTile
                  label="Sacando"
                  value={`${Math.round(stats.serverStats.asServerWinRate * 100)}%`}
                />
                <StatTile
                  label="Recibiendo"
                  value={`${Math.round(stats.serverStats.asReturnerWinRate * 100)}%`}
                />
              </div>
            </section>
          ) : null}

          <section>
            <h3 className="mb-2 text-[0.8rem] font-medium uppercase tracking-[0.04em] text-muted">
              Últimas 3 fechas (asistencia)
            </h3>
            {stats.last3Trend.length === 0 ? (
              <p className="text-[0.85rem] text-muted">
                Todavía no hay fechas con Voy.
              </p>
            ) : (
              <ul className="overflow-hidden rounded-xl bg-mist-2/50">
                {stats.last3Trend.map((t) => (
                  <li
                    key={t.sessionId}
                    className="flex items-center justify-between gap-3 border-b border-ink/6 px-3 py-2.5 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[0.9rem] font-medium text-ink">
                        {formatSessionChip(t.sessionStartsAt)}
                      </p>
                      <p className="text-[0.75rem] text-muted">
                        {t.wins + t.losses > 0
                          ? `${t.wins}G · ${t.losses}P`
                          : "Sin Games"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-[0.95rem] font-semibold tabular-nums ${
                        t.eloDelta > 0
                          ? "text-ok"
                          : t.eloDelta < 0
                            ? "text-danger"
                            : "text-muted"
                      }`}
                    >
                      {t.eloDelta > 0 ? "+" : ""}
                      {t.eloDelta}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl bg-mist-2/50 px-3 py-2.5">
      <p className="text-[0.7rem] text-muted">{label}</p>
      <p className="mt-0.5 truncate text-[1rem] font-semibold tracking-[-0.02em] text-ink">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 truncate text-[0.7rem] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
