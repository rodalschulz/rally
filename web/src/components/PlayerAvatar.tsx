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
