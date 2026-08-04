import { prisma } from "@/lib/db";
import type { BrowserPushSubscriptionJSON } from "./types";

export async function upsertPushSubscription(
  userId: string,
  subscription: BrowserPushSubscriptionJSON,
  userAgent?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const endpoint = subscription.endpoint?.trim();
  const p256dh = subscription.keys?.p256dh?.trim();
  const auth = subscription.keys?.auth?.trim();
  if (!endpoint || !p256dh || !auth) {
    return { ok: false, error: "Suscripción incompleta" };
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId,
      endpoint,
      p256dh,
      auth,
      userAgent: userAgent || null,
    },
    update: {
      userId,
      p256dh,
      auth,
      userAgent: userAgent || null,
    },
  });
  return { ok: true };
}

export async function deletePushSubscriptionByEndpoint(
  userId: string,
  endpoint: string,
): Promise<void> {
  await prisma.pushSubscription.deleteMany({
    where: { userId, endpoint },
  });
}

export async function deleteAllPushSubscriptions(userId: string): Promise<void> {
  await prisma.pushSubscription.deleteMany({ where: { userId } });
}

export async function userHasPushSubscription(userId: string): Promise<boolean> {
  const count = await prisma.pushSubscription.count({ where: { userId } });
  return count > 0;
}

export async function listSubscriptionsForUsers(userIds: readonly string[]) {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return [];
  return prisma.pushSubscription.findMany({
    where: { userId: { in: unique } },
  });
}

export async function deleteSubscriptionById(id: string): Promise<void> {
  await prisma.pushSubscription.deleteMany({ where: { id } });
}
