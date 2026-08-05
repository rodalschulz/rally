import type { Player } from "@/lib/domain/types";

export function PlayerAvatar({
  player,
  size = "md",
}: {
  player: Player;
  size?: "sm" | "md" | "lg";
}) {
  const dim =
    size === "sm"
      ? "size-7 text-[0.65rem]"
      : size === "lg"
        ? "size-11 text-sm"
        : "size-9 text-xs";

  if (player.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Blob sticker URLs; no next/image remote config needed
      <img
        src={player.avatarUrl}
        alt=""
        width={size === "sm" ? 28 : size === "lg" ? 44 : 36}
        height={size === "sm" ? 28 : size === "lg" ? 44 : 36}
        className={`shrink-0 rounded-xl object-contain ${dim}`}
        style={{ background: `oklch(0.32 0.04 ${player.hue})` }}
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
