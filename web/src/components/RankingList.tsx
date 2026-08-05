import type { RankingRow, Player } from "@/lib/domain/types";
import { PlayerAvatar } from "./PlayerAvatar";

export function RankingList({
  rows,
  playersById,
  emptyHint,
  scoreLabel = "pts",
  playedLabel = "partidos",
}: {
  rows: RankingRow[];
  playersById: Map<string, Player>;
  emptyHint: string;
  /** Column caption under the numeric score (e.g. pts / Elo). */
  scoreLabel?: string;
  /** Noun after the played count (e.g. Games / Sets / partidos). */
  playedLabel?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="animate-rise rounded-2xl bg-sand px-4 py-10 text-center text-[0.95rem] text-muted">
        {emptyHint}
      </p>
    );
  }

  return (
    <ol className="overflow-hidden rounded-2xl bg-sand">
      {rows.map((row, i) => {
        const player = playersById.get(row.playerId);
        if (!player) return null;
        return (
          <li
            key={row.playerId}
            className="animate-row flex items-center gap-2 border-b border-ink/6 px-3 py-3.5 last:border-b-0"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <span className="mr-1.5 w-5 shrink-0 text-right text-[0.9rem] font-medium tabular-nums text-muted">
              {i + 1}
            </span>
            <span className="inline-grid size-16 shrink-0 place-items-center">
              <PlayerAvatar
                player={player}
                size={player.avatarUrl ? "xl" : "md"}
                showSticker
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[1rem] font-medium tracking-[-0.01em] text-ink">
                {player.displayName}
              </p>
              <p className="text-[0.8rem] text-muted">
                {row.wins}G · {row.losses}P · {row.played} {playedLabel}
              </p>
            </div>
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
  );
}
