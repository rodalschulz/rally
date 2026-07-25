/** Past fechas: only creator. Upcoming: creator or financier. */
export function canDeletePlaySession(
  row: { createdById: string; financierId: string; startsAt: Date },
  userId: string,
  now = new Date(),
): boolean {
  if (row.createdById === userId) return true;
  const isPast = row.startsAt.getTime() < now.getTime();
  if (isPast) return false;
  return row.financierId === userId;
}
