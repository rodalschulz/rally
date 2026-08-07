/**
 * Deterministic next Singles Game pair for a Fecha: round-robin H2H,
 * balanced participation, rotate who sits; Servidor alternates on rematch.
 */

export type GamePairInput = {
  sideA: string[];
  sideB: string[];
  serverSide?: "A" | "B" | null;
  deletedAt?: string | null;
};

export type NextGamePair = {
  player1Id: string;
  player2Id: string;
  serverSide: "A" | "B";
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

function pairKey(a: string, b: string): string {
  return a < b ? `${a}\0${b}` : `${b}\0${a}`;
}

/** Games played by each id (sideA[0] / sideB[0] of each match). */
export function countGamesByPlayer(
  playerIds: string[],
  games: GamePairInput[],
): Map<string, number> {
  const counts = new Map(playerIds.map((id) => [id, 0]));
  for (const g of activeGames(games)) {
    const ids = singlesIds(g);
    if (!ids) continue;
    for (const id of ids) {
      if (counts.has(id)) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return counts;
}

/** Head-to-head meetings for unordered pairs among candidates. */
export function countH2H(
  playerIds: string[],
  games: GamePairInput[],
): Map<string, number> {
  const set = new Set(playerIds);
  const counts = new Map<string, number>();
  for (const g of activeGames(games)) {
    const ids = singlesIds(g);
    if (!ids) continue;
    const [a, b] = ids;
    if (!set.has(a) || !set.has(b)) continue;
    const key = pairKey(a, b);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * Consecutive games from the end of the Fecha that `playerId` did not play.
 */
export function sitStreak(playerId: string, games: GamePairInput[]): number {
  const active = activeGames(games);
  let streak = 0;
  for (let i = active.length - 1; i >= 0; i--) {
    const ids = singlesIds(active[i]!);
    if (!ids) continue;
    if (ids[0] === playerId || ids[1] === playerId) break;
    streak += 1;
  }
  return streak;
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

type PairCandidate = {
  a: string;
  b: string;
  h2h: number;
  gamesSum: number;
  sitSum: number;
  sitMin: number;
};

function compareCandidates(x: PairCandidate, y: PairCandidate): number {
  if (x.h2h !== y.h2h) return x.h2h - y.h2h;
  if (x.gamesSum !== y.gamesSum) return x.gamesSum - y.gamesSum;
  if (x.sitSum !== y.sitSum) return y.sitSum - x.sitSum; // maximize
  if (x.sitMin !== y.sitMin) return y.sitMin - x.sitMin; // maximize
  if (x.a !== y.a) return x.a < y.a ? -1 : 1;
  if (x.b !== y.b) return x.b < y.b ? -1 : 1;
  return 0;
}

/**
 * Next pair + Servidor. `random` in [0, 1) only for first serve between a pair.
 * Null if fewer than two candidates.
 */
export function pickNextGamePair(
  playerIds: string[],
  games: GamePairInput[],
  random: () => number = Math.random,
): NextGamePair | null {
  const unique = [...new Set(playerIds.filter(Boolean))].sort();
  if (unique.length < 2) return null;

  const gameCounts = countGamesByPlayer(unique, games);
  const h2h = countH2H(unique, games);
  const sits = new Map(
    unique.map((id) => [id, sitStreak(id, games)] as const),
  );

  let best: PairCandidate | null = null;
  for (let i = 0; i < unique.length; i++) {
    for (let j = i + 1; j < unique.length; j++) {
      const a = unique[i]!;
      const b = unique[j]!;
      const sitA = sits.get(a) ?? 0;
      const sitB = sits.get(b) ?? 0;
      const cand: PairCandidate = {
        a,
        b,
        h2h: h2h.get(pairKey(a, b)) ?? 0,
        gamesSum: (gameCounts.get(a) ?? 0) + (gameCounts.get(b) ?? 0),
        sitSum: sitA + sitB,
        sitMin: Math.min(sitA, sitB),
      };
      if (!best || compareCandidates(cand, best) < 0) best = cand;
    }
  }
  if (!best) return null;

  const player1Id = best.a;
  const player2Id = best.b;

  const prevServer = lastServerPlayerId(player1Id, player2Id, games);
  let serverPlayerId: string;
  if (prevServer === player1Id) {
    serverPlayerId = player2Id;
  } else if (prevServer === player2Id) {
    serverPlayerId = player1Id;
  } else {
    serverPlayerId = random() < 0.5 ? player1Id : player2Id;
  }

  return {
    player1Id,
    player2Id,
    serverSide: serverPlayerId === player1Id ? "A" : "B",
  };
}
