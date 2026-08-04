import { ensureVapidConfigured, webpush } from "./vapid";
import { loadPrefsForUsers } from "./preferences";
import {
  excludeActors,
  filterByPreference,
  shouldDeleteSubscription,
} from "./recipients";
import { deleteSubscriptionById, listSubscriptionsForUsers } from "./subscriptions";
import type { PreferenceKey, PushPayload } from "./types";

type WebPushError = Error & { statusCode?: number };

/**
 * Send a push to many users, filtering by preference and excluding actors.
 * Failures are logged; expired endpoints (404/410) are deleted.
 */
export async function sendPushToUsers(
  candidateIds: readonly string[],
  payload: PushPayload,
  prefKey: PreferenceKey,
  options?: { excludeUserIds?: Array<string | null | undefined> },
): Promise<void> {
  if (!ensureVapidConfigured()) {
    console.warn("[push] VAPID env incomplete — skipping send");
    return;
  }

  const withoutActors = excludeActors(
    candidateIds,
    ...(options?.excludeUserIds ?? []),
  );
  if (withoutActors.length === 0) return;

  const prefsByUser = await loadPrefsForUsers(withoutActors);
  const recipients = filterByPreference(withoutActors, prefsByUser, prefKey);
  if (recipients.length === 0) return;

  const subscriptions = await listSubscriptionsForUsers(recipients);
  if (subscriptions.length === 0) return;

  const body = JSON.stringify(payload);
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
        );
      } catch (err) {
        const statusCode = (err as WebPushError)?.statusCode;
        if (shouldDeleteSubscription(statusCode)) {
          await deleteSubscriptionById(sub.id).catch(() => {});
          return;
        }
        console.error("[push] send failed", sub.endpoint.slice(0, 48), err);
      }
    }),
  );
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
  prefKey: PreferenceKey,
  options?: { excludeUserIds?: Array<string | null | undefined> },
): Promise<void> {
  await sendPushToUsers([userId], payload, prefKey, options);
}
