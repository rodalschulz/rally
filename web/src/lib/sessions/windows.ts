/** Assumed court booking length (Miraflores slots are hourly). */
export const SESSION_DURATION_MS = 60 * 60 * 1000;

/** Games can be added/edited this long after the session ends. */
export const GAMES_GRACE_AFTER_END_MS = 60 * 60 * 1000;

export function sessionEndsAt(startsAt: Date): Date {
  return new Date(startsAt.getTime() + SESSION_DURATION_MS);
}

/** Games editable until (startsAt + 1h) + 60 minutes. */
export function isSessionGamesOpen(startsAt: Date, now = new Date()): boolean {
  const deadline =
    startsAt.getTime() + SESSION_DURATION_MS + GAMES_GRACE_AFTER_END_MS;
  return now.getTime() < deadline;
}

/**
 * Fecha leaves "Próximas" once the games entry window has closed
 * (end of court slot + 60 min grace).
 */
export function isSessionPast(startsAt: Date | string, now = new Date()): boolean {
  const start = typeof startsAt === "string" ? new Date(startsAt) : startsAt;
  return !isSessionGamesOpen(start, now);
}
