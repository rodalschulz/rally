import type {
  Attendance as DomainAttendance,
  Debt as DomainDebt,
  Match as DomainMatch,
  Player,
  Session as DomainSession,
} from "@/lib/domain/types";
import type {
  Attendance,
  Debt,
  Match,
  PlaySession,
  User,
} from "@prisma/client";

export function toPlayer(user: User): Player {
  return {
    id: user.id,
    displayName: user.displayName || user.name || "Jugador",
    shortName:
      user.shortName ||
      (user.displayName || user.name || "J").slice(0, 2).toUpperCase(),
    hue: user.hue,
  };
}

export function toSession(row: PlaySession): DomainSession {
  return {
    id: row.id,
    startsAt: row.startsAt.toISOString(),
    courtLabel: row.courtLabel ?? undefined,
    costAmount: Number(row.costAmount),
    currency: "PEN",
    financierId: row.financierId,
    createdById: row.createdById,
    financierCoversAll: row.financierCoversAll,
    status: row.status,
    note: row.note ?? undefined,
    maxAttendees: row.maxAttendees,
    allowedUserIds: row.allowedUserIds ?? [],
  };
}

export function toAttendance(row: Attendance): DomainAttendance {
  return {
    sessionId: row.playSessionId,
    playerId: row.userId,
    status: row.status,
  };
}

export function toDebt(row: Debt): DomainDebt {
  return {
    id: row.id,
    fromPlayerId: row.fromUserId,
    toPlayerId: row.toUserId,
    sessionId: row.playSessionId,
    amount: Number(row.amount),
    status: row.status,
  };
}

export function toMatch(row: Match): DomainMatch {
  return {
    id: row.id,
    sessionId: row.playSessionId,
    format: row.format,
    unit: row.unit,
    sideA: row.sideA,
    sideB: row.sideB,
    score: row.score,
    winnerSide: row.winnerSide,
  };
}
