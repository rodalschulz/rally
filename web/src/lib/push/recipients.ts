import type { NotificationPrefs, PreferenceKey } from "./types";

/** Drop the actor (and optional extras) from a candidate recipient list. */
export function excludeActors(
  candidateIds: readonly string[],
  ...excludeIds: Array<string | null | undefined>
): string[] {
  const skip = new Set(excludeIds.filter((id): id is string => Boolean(id)));
  return [...new Set(candidateIds)].filter((id) => !skip.has(id));
}

/**
 * Keep users whose preference for `prefKey` is on.
 * Missing prefs → treat as default true (caller should pass defaults).
 */
export function filterByPreference(
  userIds: readonly string[],
  prefsByUserId: ReadonlyMap<string, NotificationPrefs>,
  prefKey: PreferenceKey,
): string[] {
  return userIds.filter((id) => {
    const prefs = prefsByUserId.get(id);
    if (!prefs) return true;
    return prefs[prefKey] !== false;
  });
}

/**
 * Recipients for a Fecha when `allowedUserIds` is set: only those ids
 * (creator should already be included in the allow list by domain rules).
 * Empty allow list → all group members.
 */
export function recipientsForFechaAudience(
  memberIds: readonly string[],
  allowedUserIds: readonly string[],
): string[] {
  if (allowedUserIds.length === 0) return [...memberIds];
  const allowed = new Set(allowedUserIds);
  return memberIds.filter((id) => allowed.has(id));
}

/** HTTP statuses from push services that mean the endpoint is gone. */
export function shouldDeleteSubscription(statusCode: number | undefined): boolean {
  return statusCode === 404 || statusCode === 410;
}
