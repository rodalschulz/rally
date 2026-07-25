/** Assumed court booking length (Miraflores slots are hourly). */
export const SESSION_DURATION_MS = 60 * 60 * 1000;

/** Chat stays writable this long after startsAt. */
export const CHAT_GRACE_AFTER_START_MS = 30 * 60 * 1000;

/** Games can be added/edited this long after the session ends. */
export const GAMES_GRACE_AFTER_END_MS = 60 * 60 * 1000;

export function sessionEndsAt(startsAt: Date): Date {
  return new Date(startsAt.getTime() + SESSION_DURATION_MS);
}

/** Chat open until startsAt + 30 minutes. */
export function isSessionChatOpen(startsAt: Date, now = new Date()): boolean {
  return now.getTime() < startsAt.getTime() + CHAT_GRACE_AFTER_START_MS;
}

/** Games editable until (startsAt + 1h) + 60 minutes. */
export function isSessionGamesOpen(startsAt: Date, now = new Date()): boolean {
  const deadline =
    startsAt.getTime() + SESSION_DURATION_MS + GAMES_GRACE_AFTER_END_MS;
  return now.getTime() < deadline;
}
