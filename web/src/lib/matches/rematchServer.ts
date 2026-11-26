/**
 * Servidor for the next Game between two players in the same Fecha.
 * Alternates from the last Game of that pair that recorded a server.
 */

export type GamePairInput = {
  sideA: string[];
  sideB: string[];
  serverSide?: "A" | "B" | null;
  deletedAt?: string | null;
};

function activeGames(games: GamePairInput[]): GamePairInput[] {
  return games.filter((g) => !g.deletedAt);
}

function singlesIds(g: GamePairInput): [string, string] | null {
  const a = g.sideA[0];
  const b = g.sideB[0];
  if (!a || !b || a === b) return null;
  return [a, b];
}

/** Last server player id between the pair, or null if none recorded. */
export function lastServerPlayerId(
  playerA: string,
  playerB: string,
  games: GamePairInput[],
): string | null {
  const active = activeGames(games);
  for (let i = active.length - 1; i >= 0; i--) {
    const g = active[i]!;
    const ids = singlesIds(g);
    if (!ids) continue;
    const [a, b] = ids;
    const isPair =
      (a === playerA && b === playerB) || (a === playerB && b === playerA);
    if (!isPair) continue;
    if (g.serverSide === "A") return a;
    if (g.serverSide === "B") return b;
  }
  return null;
}

/**
 * Side that should serve next, relative to the current Jugador 1 / Jugador 2.
 * Null when the pair has no prior Game with a recorded server.
 */
export function rematchServerSide(
  player1Id: string,
  player2Id: string,
  games: GamePairInput[],
): "A" | "B" | null {
  if (!player1Id || !player2Id || player1Id === player2Id) return null;
  const prev = lastServerPlayerId(player1Id, player2Id, games);
  if (prev === player1Id) return "B";
  if (prev === player2Id) return "A";
  return null;
}
