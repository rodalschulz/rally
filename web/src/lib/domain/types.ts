/** Domain types — see docs/DOMAIN.md */

export type PlayerId = string;
export type SessionId = string;

export type Player = {
  id: PlayerId;
  displayName: string;
  shortName: string;
  /** Initials or hue seed for avatar */
  hue: number;
};

export type SessionStatus = "scheduled" | "completed" | "cancelled";

export type Session = {
  id: SessionId;
  startsAt: string; // ISO
  courtLabel?: string;
  costAmount: number;
  currency: "PEN";
  financierId: PlayerId;
  createdById: PlayerId;
  /** Financiador regala la cancha — no se generan deudas. */
  financierCoversAll: boolean;
  status: SessionStatus;
  note?: string;
  /** null / undefined = sin cupo */
  maxAttendees?: number | null;
  /** vacío = todos los miembros del grupo */
  allowedUserIds: PlayerId[];
};

export type AttendanceStatus = "going" | "not_going" | "maybe" | "pending";

export type Attendance = {
  sessionId: SessionId;
  playerId: PlayerId;
  status: AttendanceStatus;
};

export type DebtStatus = "open" | "settled";

export type Debt = {
  id: string;
  fromPlayerId: PlayerId;
  toPlayerId: PlayerId;
  /** PlaySession that generated this debt — always one fecha, never aggregated. */
  sessionId: SessionId;
  amount: number;
  status: DebtStatus;
  /** Set when status becomes settled. */
  settledAt?: string;
  /** Who marked it settled (creditor or app admin). Absent on legacy rows. */
  settledById?: PlayerId;
};

/** Debt plus fecha context for list UIs. */
export type DebtWithSession = Debt & {
  sessionStartsAt: string;
  sessionCourtLabel?: string;
};

export type MatchFormat = "singles" | "doubles";

/** Loose game vs set to 6. Set-internal games are not expanded into the games ladder. */
export type MatchUnit = "game" | "set";

export type Match = {
  id: string;
  sessionId: SessionId;
  format: MatchFormat;
  unit: MatchUnit;
  sideA: PlayerId[];
  sideB: PlayerId[];
  /** Set: e.g. "6-4". Game: "1-0". Empty while En curso. */
  score: string;
  /** null = En curso (no winner yet); excluded from ranking. */
  winnerSide: "A" | "B" | null;
  /** Optional server for loose games (side A or B). Null / ignored for sets. */
  serverSide?: "A" | "B" | null;
  /** Soft-delete timestamp; excluded from ranking while set. */
  deletedAt?: string | null;
  deletedById?: string | null;
  /** Present on ranking queries — Elo processes matches in this order. */
  sessionStartsAt?: string;
  createdAt?: string;
};

export type RankingRow = {
  playerId: PlayerId;
  played: number;
  wins: number;
  losses: number;
  points: number;
};
