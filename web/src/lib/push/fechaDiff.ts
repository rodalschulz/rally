type FechaFields = {
  startsAt: Date;
  courtLabel: string | null;
  costAmount: { toString(): string } | number;
  maxAttendees: number | null;
  allowedUserIds: string[];
  financierCoversAll: boolean;
  note: string | null;
};

/** True when an edit should trigger a `fechaUpdated` push. */
export function isMaterialFechaUpdate(
  before: FechaFields,
  after: FechaFields,
): boolean {
  if (before.startsAt.getTime() !== after.startsAt.getTime()) return true;
  if ((before.courtLabel ?? "") !== (after.courtLabel ?? "")) return true;
  if (String(before.costAmount) !== String(after.costAmount)) return true;
  if (before.maxAttendees !== after.maxAttendees) return true;
  if (before.financierCoversAll !== after.financierCoversAll) return true;
  if ((before.note ?? "") !== (after.note ?? "")) return true;
  const a = [...before.allowedUserIds].sort().join(",");
  const b = [...after.allowedUserIds].sort().join(",");
  return a !== b;
}
