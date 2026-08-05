"use client";

import { useCallback, useMemo, useState } from "react";
import type { Match, Player, RankingRow } from "@/lib/domain/types";
import type {
  PlayerStatsAttendanceInput,
  PlayerStatsSessionInput,
} from "@/lib/ranking/playerStats";
import { PlayerAvatar } from "./PlayerAvatar";
import { PlayerStatsSheet } from "./PlayerStatsSheet";

export function RankingWithPlayerStats({
  rows,
  playersById,
  matches,
  memberIds,
  joinedAtById,
  sessions,
  attendances,
  emptyHint,
  scoreLabel = "Elo",
  playedLabel = "Games",
}: {
  rows: RankingRow[];
  playersById: Record<string, Player>;
  matches: Match[];
  memberIds: string[];
  joinedAtById: Record<string, string>;
  sessions: PlayerStatsSessionInput[];
  attendances: PlayerStatsAttendanceInput[];
  emptyHint: string;
  scoreLabel?: string;
  playedLabel?: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const close = useCallback(() => setSelectedId(null), []);

  const displayNameById = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [id, p] of Object.entries(playersById)) {
      out[id] = p.displayName;
    }
    return out;
  }, [playersById]);

  const selectedPlayer = selectedId ? playersById[selectedId] ?? null : null;
  const joinedAt =
    (selectedId && joinedAtById[selectedId]) ||
    "1970-01-01T00:00:00.000Z";

  if (rows.length === 0) {
    return (
      <p className="animate-rise rounded-2xl bg-sand px-4 py-10 text-center text-[0.95rem] text-muted">
        {emptyHint}
      </p>
    );
  }

  return (
    <>
      <ol className="overflow-hidden rounded-2xl bg-sand">
        {rows.map((row, i) => {
          const player = playersById[row.playerId];
          if (!player) return null;
          return (
            <li
              key={row.playerId}
              className="animate-row flex items-center gap-3 border-b border-ink/6 px-4 py-3.5 last:border-b-0"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span className="w-6 shrink-0 text-center text-[0.95rem] font-medium tabular-nums text-muted">
                {i + 1}
              </span>
              <button
                type="button"
                onClick={() => setSelectedId(player.id)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left transition active:opacity-80"
                aria-label={`Ver estadísticas de ${player.displayName}`}
              >
                <PlayerAvatar player={player} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[1rem] font-medium tracking-[-0.01em] text-ink">
                    {player.displayName}
                  </p>
                  <p className="text-[0.8rem] text-muted">
                    {row.wins}G · {row.losses}P · {row.played} {playedLabel}
                  </p>
                </div>
              </button>
              <div className="text-right">
                <p className="text-[1.1rem] font-semibold tabular-nums tracking-[-0.02em] text-ink">
                  {row.points}
                </p>
                <p className="text-[0.7rem] text-muted">{scoreLabel}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <PlayerStatsSheet
        player={selectedPlayer}
        open={selectedId != null}
        onClose={close}
        matches={matches}
        memberIds={memberIds}
        displayNameById={displayNameById}
        joinedAt={joinedAt}
        sessions={sessions}
        attendances={attendances}
      />
    </>
  );
}
