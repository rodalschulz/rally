/** Lenient "6-4" parse (no tennis-rule checks). Null if the shape is not A-B. */
export function tryParseSetGames(
  score: string,
): { gamesA: number; gamesB: number } | null {
  const m = score.trim().match(/^(\d{1,2})\s*[-–:]\s*(\d{1,2})$/);
  if (!m) return null;
  const gamesA = Number(m[1]);
  const gamesB = Number(m[2]);
  if (!Number.isInteger(gamesA) || !Number.isInteger(gamesB)) return null;
  return { gamesA, gamesB };
}

/** Parse tennis set score "6-4" → sides A/B. First number = player 1 / side A. */
export function parseSetScore(score: string): {
  gamesA: number;
  gamesB: number;
  winnerSide: "A" | "B";
} {
  const parsed = tryParseSetGames(score);
  if (!parsed) throw new Error("Marcador inválido (ej. 6-4)");
  const { gamesA, gamesB } = parsed;
  if (gamesA === gamesB) {
    throw new Error("El set no puede empatar — tiene que haber un ganador");
  }
  if (gamesA < 6 && gamesB < 6) {
    throw new Error("En un set al menos un lado debe llegar a 6");
  }
  return {
    gamesA,
    gamesB,
    winnerSide: gamesA > gamesB ? "A" : "B",
  };
}

/** @deprecated Use parseSetScore — name kept for doubles addMatchAction. */
export function parseGameScore(score: string) {
  return parseSetScore(score);
}

export function formatSetScore(gamesA: number, gamesB: number): string {
  return `${gamesA}-${gamesB}`;
}

/** @deprecated Use formatSetScore. */
export function formatGameScore(gamesA: number, gamesB: number): string {
  return formatSetScore(gamesA, gamesB);
}
