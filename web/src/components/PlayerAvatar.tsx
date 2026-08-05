import type { Player } from "@/lib/domain/types";

const SIZE = {
  sm: { className: "size-7 text-[0.65rem]", px: 28 },
  md: { className: "size-9 text-xs", px: 36 },
  lg: { className: "size-11 text-sm", px: 44 },
  /** Ranking player-stats sheet — sticker readable */
  xl: { className: "size-16 text-base", px: 64 },
} as const;

export function PlayerAvatar({
  player,
  size = "md",
  /** Stickers only in Ranking (and Ajustes preview). Default: initials. */
  showSticker = false,
}: {
  player: Player;
  size?: keyof typeof SIZE;
  showSticker?: boolean;
}) {
  const { className: dim, px } = SIZE[size];

  if (showSticker && player.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Blob sticker URLs; no next/image remote config needed
      <img
        src={player.avatarUrl}
        alt=""
        width={px}
        height={px}
        className={`shrink-0 rounded-xl object-contain ${dim}`}
        aria-hidden
      />
    );
  }

  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-full font-medium text-ink ${dim}`}
      style={{
        background: `oklch(0.32 0.06 ${player.hue})`,
        color: "var(--court-ink)",
      }}
      aria-hidden
    >
      {player.shortName.slice(0, 2)}
    </span>
  );
}
