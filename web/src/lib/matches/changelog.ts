import type { MatchUnit } from "@/lib/domain/types";

export type MatchChangeAction = "created" | "updated" | "deleted" | "restored";

export type MatchSnapshot = {
  unit: MatchUnit;
  sideA: string[];
  sideB: string[];
  score: string;
  winnerSide: "A" | "B" | null;
  serverSide: "A" | "B" | null;
};

export type MatchChangeLogEntry = {
  id: string;
  matchId: string | null;
  actorId: string;
  actorDisplayName: string;
  action: MatchChangeAction;
  unit: MatchUnit;
  summary: string;
  createdAt: string;
  /** Soft-deleted match still restorable while games window is open. */
  restorable: boolean;
};

export function snapshotFromMatch(m: {
  unit: MatchUnit;
  sideA: string[];
  sideB: string[];
  score: string;
  winnerSide: "A" | "B" | null;
  serverSide?: "A" | "B" | null;
}): MatchSnapshot {
  return {
    unit: m.unit,
    sideA: m.sideA,
    sideB: m.sideB,
    score: m.score,
    winnerSide: m.winnerSide,
    serverSide: m.serverSide ?? null,
  };
}

/** Compact description without action verb, e.g. "Game: Ana ganó a Bruno". */
export function describeMatchSnapshot(
  snap: MatchSnapshot,
  nameOf: (id: string) => string,
): string {
  const a = nameOf(snap.sideA[0] ?? "") || "?";
  const b = nameOf(snap.sideB[0] ?? "") || "?";
  const unit = snap.unit === "game" ? "Game" : "Set";

  let base: string;
  if (snap.winnerSide !== "A" && snap.winnerSide !== "B") {
    base = `${unit} En curso: ${a} vs ${b}`;
  } else if (snap.unit === "game") {
    const winner = snap.winnerSide === "A" ? a : b;
    const loser = snap.winnerSide === "A" ? b : a;
    base = `${unit}: ${winner} ganó a ${loser}`;
  } else {
    base = `${unit} ${snap.score}: ${a} vs ${b}`;
  }

  if (
    snap.unit === "game" &&
    (snap.serverSide === "A" || snap.serverSide === "B")
  ) {
    const server = snap.serverSide === "A" ? a : b;
    return `${base} · Servidor ${server}`;
  }

  return base;
}

const ACTION_VERB: Record<MatchChangeAction, string> = {
  created: "Agregó",
  updated: "Editó",
  deleted: "Borró",
  restored: "Restauró",
};

export function formatMatchChangeSummary(
  action: MatchChangeAction,
  after: MatchSnapshot,
  nameOf: (id: string) => string,
  before?: MatchSnapshot | null,
): string {
  const verb = ACTION_VERB[action];
  const afterDesc = describeMatchSnapshot(after, nameOf);
  if (action === "updated" && before) {
    const beforeDesc = describeMatchSnapshot(before, nameOf);
    return `${verb} ${beforeDesc} → ${afterDesc}`;
  }
  return `${verb} ${afterDesc}`;
}
