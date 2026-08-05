import { isSessionPast } from "@/lib/sessions/windows";

/**
 * Upcoming: creator, financier, or app admin.
 * Past: group owner or app admin.
 * App admin may delete any fecha (while a member of the group).
 */
export function canDeletePlaySession(
  row: { createdById: string; financierId: string; startsAt: Date | string },
  userId: string,
  opts: { isGroupOwner: boolean; isAppAdmin?: boolean; now?: Date },
): boolean {
  if (opts.isAppAdmin) return true;
  if (isSessionPast(row.startsAt, opts.now)) {
    return opts.isGroupOwner;
  }
  return row.createdById === userId || row.financierId === userId;
}

/**
 * Creator may edit while the fecha is not past.
 * App admin may edit any fecha (including past), for operational fixes.
 */
export function canEditPlaySession(
  row: { createdById: string; startsAt: Date | string },
  userId: string,
  opts: { isAppAdmin?: boolean; now?: Date } = {},
): boolean {
  if (opts.isAppAdmin) return true;
  if (isSessionPast(row.startsAt, opts.now)) return false;
  return row.createdById === userId;
}

/**
 * RSVP locked once the fecha is past — including for the creator and app
 * admin. Fechas Pasadas keep attendance engraved.
 */
export function canChangeAttendance(
  startsAt: Date | string,
  now = new Date(),
): boolean {
  return !isSessionPast(startsAt, now);
}
