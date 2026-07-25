/** Parse tennis game/set score "6-4" → sides A/B games. First number = player 1. */
export function parseGameScore(score: string): {
  gamesA: number;
  gamesB: number;
  winnerSide: "A" | "B";
} {
  const m = score.trim().match(/^(\d{1,2})\s*[-–:]\s*(\d{1,2})$/);
  if (!m) throw new Error("Score inválido (ej. 6-4)");
  const gamesA = Number(m[1]);
  const gamesB = Number(m[2]);
  if (!Number.isInteger(gamesA) || !Number.isInteger(gamesB)) {
    throw new Error("Score inválido");
  }
  if (gamesA === gamesB) {
    throw new Error("El game no puede empatar — tiene que haber un ganador");
  }
  return {
    gamesA,
    gamesB,
    winnerSide: gamesA > gamesB ? "A" : "B",
  };
}

export function formatGameScore(gamesA: number, gamesB: number): string {
  return `${gamesA}-${gamesB}`;
}
