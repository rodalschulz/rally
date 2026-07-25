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
  sessionId: SessionId;
  amount: number;
  status: DebtStatus;
};

export type MatchFormat = "singles" | "doubles";

export type Match = {
  id: string;
  sessionId: SessionId;
  format: MatchFormat;
  sideA: PlayerId[];
  sideB: PlayerId[];
  /** e.g. "6-4, 6-3" */
  score: string;
  winnerSide: "A" | "B";
};

export type RankingRow = {
  playerId: PlayerId;
  played: number;
  wins: number;
  losses: number;
  points: number;
};
