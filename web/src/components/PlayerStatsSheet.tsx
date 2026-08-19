"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { Match, MatchUnit, Player } from "@/lib/domain/types";
import { formatSessionChip } from "@/lib/format";
import {
  buildPlayerFechaGameStats,
  buildPlayerGameStats,
  type PlayerFechaGameStats,
  type PlayerGameStats,
  type PlayerStatsAttendanceInput,
  type PlayerStatsSessionInput,
  type RivalRecord,
} from "@/lib/ranking/playerStats";
import { EloHistoryChart } from "./EloHistoryChart";
import { PlayerAvatar } from "./PlayerAvatar";

type CareerProps = {
  variant?: "career";
  player: Player | null;
  open: boolean;
  onClose: () => void;
  /** Ranking tab: Games (Elo.G) or Sets (Elo.S). */
  unit?: MatchUnit;
  matches: Match[];
  memberIds: string[];
  displayNameById: Record<string, string>;
  joinedAt: string;
  sessions: PlayerStatsSessionInput[];
  attendances: PlayerStatsAttendanceInput[];
};

type FechaProps = {
  variant: "fecha";
  player: Player | null;
  open: boolean;
  onClose: () => void;
  sessionId: string;
  historyMatches: Match[];
  sessionMatches: Match[];
  displayNameById: Record<string, string>;
};

export type PlayerStatsSheetProps = CareerProps | FechaProps;

export function PlayerStatsSheet(props: PlayerStatsSheetProps) {
  const { player, open, onClose } = props;
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
    () => new Map(Object.entries(props.displayNameById)),
    [props.displayNameById],
  );

  let careerStats: PlayerGameStats | null = null;
  let fechaStats: PlayerFechaGameStats | null = null;
  if (player && open) {
    if (props.variant === "fecha") {
      fechaStats = buildPlayerFechaGameStats({
        playerId: player.id,
        sessionId: props.sessionId,
        historyMatches: props.historyMatches,
        displayNameById: nameMap,
        sessionMatchesOverride: props.sessionMatches,
      });
    } else {
      careerStats = buildPlayerGameStats({
        playerId: player.id,
        matches: props.matches,
        memberIds: props.memberIds,
        displayNameById: nameMap,
        joinedAt: props.joinedAt,
        sessions: props.sessions,
        attendances: props.attendances,
        unit: props.unit ?? "game",
      });
    }
  }

  const isFecha = props.variant === "fecha";
  const careerUnit: MatchUnit =
    !isFecha && "unit" in props ? (props.unit ?? "game") : "game";

  if (!portalReady || !open || !player) return null;
  if (!isFecha && !careerStats) return null;
  if (isFecha && !fechaStats) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-3 pb-[max(0.75rem,var(--safe-bottom))] sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-stats-title"
        className="relative flex max-h-[min(88dvh,40rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-sand shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {isFecha && fechaStats ? (
          <FechaStatsBody
            player={player}
            stats={fechaStats}
            onClose={onClose}
          />
        ) : careerStats ? (
          <CareerStatsBody
            player={player}
            stats={careerStats}
            unit={careerUnit}
            onClose={onClose}
          />
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

function CareerStatsBody({
  player,
  stats,
  unit,
  onClose,
}: {
  player: Player;
  stats: PlayerGameStats;
  unit: MatchUnit;
  onClose: () => void;
}) {
  const [rivalsOpen, setRivalsOpen] = useState(false);
  const isSets = unit === "set";
  const unitLabel = isSets ? "Sets" : "Games";
  const eloLabel = isSets ? "Elo.S" : "Elo.G";
  const streakHint = isSets ? "Sets seguidos" : "Games seguidos";
  const emptyUnitHint = isSets ? "Sin Sets" : "Sin Games";

  return (
    <>
      <SheetHeader
        player={player}
        onClose={onClose}
        showSticker
        avatarSize="xl"
        subtitle={
          <>
            {stats.rank != null ? `#${stats.rank} · ` : null}
            {stats.currentElo} {eloLabel}
            {stats.winRate != null
              ? ` · ${Math.round(stats.winRate * 100)}% ganados`
              : null}
          </>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        <section className="mb-5">
          <h3 className="mb-2 text-[0.8rem] font-medium uppercase tracking-[0.04em] text-muted">
            Historial de Elo
          </h3>
          <EloHistoryChart history={stats.eloHistory} variant="career" />
        </section>

        <div className="mb-5 grid grid-cols-2 gap-3">
          <StatTile
            label={`${unitLabel} ganados`}
            value={
              stats.played > 0 ? `${stats.wins}G · ${stats.losses}P` : "—"
            }
            hint={
              stats.winRate != null
                ? `${Math.round(stats.winRate * 100)}%`
                : undefined
            }
          />
          <StatTile label="Elo máximo" value={String(stats.eloMax)} />
          <StatTile
            label="Racha más larga"
            value={
              stats.longestWinStreak > 0
                ? `${stats.longestWinStreak}`
                : "—"
            }
            hint={
              stats.longestWinStreak > 0 ? streakHint : undefined
            }
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
            onClick={
              stats.rivals.length > 0
                ? () => setRivalsOpen(true)
                : undefined
            }
          />
        </div>

        {!isSets && stats.serverStats ? (
          <ServerSection stats={stats.serverStats} />
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
                        : emptyUnitHint}
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
      {rivalsOpen ? (
        <RivalsPanel
          rivals={stats.rivals}
          onBack={() => setRivalsOpen(false)}
        />
      ) : null}
    </>
  );
}

function FechaStatsBody({
  player,
  stats,
  onClose,
}: {
  player: Player;
  stats: PlayerFechaGameStats;
  onClose: () => void;
}) {
  const [rivalsOpen, setRivalsOpen] = useState(false);
  const delta = stats.eloDelta;
  return (
    <>
      <SheetHeader
        player={player}
        onClose={onClose}
        subtitle={
          <>
            Esta Fecha · {stats.eloEnd} Elo.G
            {delta !== 0 ? (
              <span
                className={
                  delta > 0 ? " text-ok" : " text-danger"
                }
              >
                {" "}
                ({delta > 0 ? "+" : ""}
                {delta})
              </span>
            ) : null}
            {stats.winRate != null
              ? ` · ${Math.round(stats.winRate * 100)}% ganados`
              : null}
          </>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        <section className="mb-5">
          <h3 className="mb-2 text-[0.8rem] font-medium uppercase tracking-[0.04em] text-muted">
            Elo en la Fecha
          </h3>
          <EloHistoryChart history={stats.eloHistory} variant="fecha" />
        </section>

        <div className="mb-5 grid grid-cols-2 gap-3">
          <StatTile
            label="Games ganados"
            value={
              stats.played > 0 ? `${stats.wins}G · ${stats.losses}P` : "—"
            }
            hint={
              stats.winRate != null
                ? `${Math.round(stats.winRate * 100)}%`
                : undefined
            }
          />
          <StatTile label="Elo máximo" value={String(stats.eloMax)} />
          <StatTile
            label="Racha más larga"
            value={
              stats.longestWinStreak > 0
                ? `${stats.longestWinStreak}`
                : "—"
            }
            hint={
              stats.longestWinStreak > 0 ? "Games seguidos" : undefined
            }
          />
          <StatTile
            label="Mayor +Elo en un Game"
            value={
              stats.maxEloGainInGame != null
                ? `+${stats.maxEloGainInGame}`
                : "—"
            }
            hint={
              delta !== 0
                ? `Δ Fecha: ${delta > 0 ? "+" : ""}${delta}`
                : undefined
            }
          />
          <StatTile
            label="Participación"
            value={
              stats.participation.rate != null
                ? `${Math.round(stats.participation.rate * 100)}%`
                : "—"
            }
            hint={
              stats.participation.totalGames > 0
                ? `${stats.participation.played} de ${stats.participation.totalGames} Games`
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
            onClick={
              stats.rivals.length > 0
                ? () => setRivalsOpen(true)
                : undefined
            }
          />
        </div>

        {stats.serverStats ? (
          <ServerSection stats={stats.serverStats} />
        ) : null}

        <section>
          <h3 className="mb-2 text-[0.8rem] font-medium uppercase tracking-[0.04em] text-muted">
            Elo inicio → fin
          </h3>
          <div className="rounded-xl bg-mist-2/50 px-3 py-2.5">
            <p className="text-[1rem] font-semibold tabular-nums tracking-[-0.02em] text-ink">
              {stats.eloStart}
              <span className="mx-1.5 text-muted/70">→</span>
              {stats.eloEnd}
              <span
                className={`ml-2 text-[0.9rem] ${
                  delta > 0
                    ? "text-ok"
                    : delta < 0
                      ? "text-danger"
                      : "text-muted"
                }`}
              >
                {delta > 0 ? "+" : ""}
                {delta}
              </span>
            </p>
          </div>
        </section>
      </div>
      {rivalsOpen ? (
        <RivalsPanel
          rivals={stats.rivals}
          onBack={() => setRivalsOpen(false)}
        />
      ) : null}
    </>
  );
}

function SheetHeader({
  player,
  onClose,
  subtitle,
  showSticker = false,
  avatarSize = "lg",
}: {
  player: Player;
  onClose: () => void;
  subtitle: ReactNode;
  showSticker?: boolean;
  avatarSize?: "lg" | "xl";
}) {
  const [stickerOpen, setStickerOpen] = useState(false);
  const canExpandSticker = Boolean(showSticker && player.avatarUrl);

  useEffect(() => {
    if (!stickerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setStickerOpen(false);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [stickerOpen]);

  return (
    <>
      <div className="flex items-start justify-between gap-3 border-b border-ink/6 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {canExpandSticker ? (
            <button
              type="button"
              onClick={() => setStickerOpen(true)}
              className="shrink-0 rounded-xl transition active:opacity-80"
              aria-label={`Ver sticker de ${player.displayName}`}
            >
              <PlayerAvatar
                player={player}
                size={avatarSize}
                showSticker
              />
            </button>
          ) : (
            <PlayerAvatar
              player={player}
              size={avatarSize}
              showSticker={showSticker}
            />
          )}
          <div className="min-w-0">
            <h2
              id="player-stats-title"
              className="truncate text-[1.15rem] font-semibold tracking-[-0.02em] text-ink"
            >
              {player.displayName}
            </h2>
            <p className="mt-0.5 text-[0.8rem] text-muted">{subtitle}</p>
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

      {stickerOpen && player.avatarUrl
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-6"
              role="dialog"
              aria-modal="true"
              aria-label={`Sticker de ${player.displayName}`}
              onClick={() => setStickerOpen(false)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- Blob sticker URL */}
              <img
                src={player.avatarUrl}
                alt={`Sticker de ${player.displayName}`}
                className="max-h-[min(80vh,28rem)] max-w-[min(90vw,28rem)] object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function ServerSection({
  stats,
}: {
  stats: {
    sampleSize: number;
    asServerWinRate: number;
    asReturnerWinRate: number;
  };
}) {
  return (
    <section className="mb-5">
      <h3 className="mb-2 text-[0.8rem] font-medium uppercase tracking-[0.04em] text-muted">
        Games Sacando o Recibiendo
      </h3>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <StatTile
          label="Ganados Sacando"
          value={`${Math.round(stats.asServerWinRate * 100)}%`}
        />
        <StatTile
          label="Ganados Recibiendo"
          value={`${Math.round(stats.asReturnerWinRate * 100)}%`}
        />
      </div>
    </section>
  );
}

function RivalsPanel({
  rivals,
  onBack,
}: {
  rivals: RivalRecord[];
  onBack: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      onBack();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onBack]);

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col bg-sand"
      role="dialog"
      aria-labelledby="rivals-title"
    >
      <div className="flex items-start justify-between gap-3 border-b border-ink/6 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.04em] text-muted">
            Vs cada jugador
          </p>
          <h2
            id="rivals-title"
            className="text-[1.15rem] font-semibold tracking-[-0.02em] text-ink"
          >
            Rivales
          </h2>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 rounded-lg px-2 py-1 text-[0.9rem] font-medium text-muted"
        >
          Atrás
        </button>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {rivals.map((r) => {
          const rate = r.played > 0 ? Math.round((r.wins / r.played) * 100) : null;
          return (
            <li
              key={r.playerId}
              className="flex items-center justify-between gap-3 border-b border-ink/6 px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="truncate text-[0.95rem] font-medium text-ink">
                  {r.displayName}
                </p>
                <p className="text-[0.75rem] text-muted">
                  {r.played} {r.played === 1 ? "enfrentamiento" : "enfrentamientos"}
                  {rate != null ? ` · ${rate}%` : ""}
                </p>
              </div>
              <p className="shrink-0 text-[0.95rem] font-semibold tabular-nums text-ink">
                {r.wins}G · {r.losses}P
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
  onClick,
}: {
  label: string;
  value: string;
  hint?: string;
  onClick?: () => void;
}) {
  const body = (
    <>
      <p className="text-[0.7rem] text-muted">{label}</p>
      <p className="mt-0.5 truncate text-[1rem] font-semibold tracking-[-0.02em] text-ink">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 truncate text-[0.7rem] text-muted">{hint}</p>
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="rounded-xl bg-mist-2/50 px-3 py-2.5 text-left transition active:opacity-80"
        aria-label={`${label}: ${value}. Ver vs cada jugador`}
      >
        {body}
        <p className="mt-1 text-[0.65rem] font-medium text-muted/80">
          Ver todos ›
        </p>
      </button>
    );
  }

  return <div className="rounded-xl bg-mist-2/50 px-3 py-2.5">{body}</div>;
}
