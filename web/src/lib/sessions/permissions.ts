import { isSessionPast } from "@/lib/sessions/windows";

/** Upcoming: creator or financier. Past (hub “Fechas Pasadas”): only group owner. */
export function canDeletePlaySession(
  row: { createdById: string; financierId: string; startsAt: Date | string },
  userId: string,
  opts: { isGroupOwner: boolean; now?: Date },
): boolean {
  if (isSessionPast(row.startsAt, opts.now)) {
    return opts.isGroupOwner;
  }
  return row.createdById === userId || row.financierId === userId;
}

/** Only the creator, and only while the fecha is not past. */
export function canEditPlaySession(
  row: { createdById: string; startsAt: Date | string },
  userId: string,
  now = new Date(),
): boolean {
  if (isSessionPast(row.startsAt, now)) return false;
  return row.createdById === userId;
}

/** RSVP locked once the fecha is past (including for the creator). */
export function canChangeAttendance(
  startsAt: Date | string,
  now = new Date(),
): boolean {
  return !isSessionPast(startsAt, now);
}
