import { prisma } from "@/lib/db";
import {
  DEFAULT_NOTIFICATION_PREFS,
  PREFERENCE_KEYS,
  type NotificationPrefs,
  type PreferenceKey,
} from "./types";

function rowToPrefs(row: {
  fechaCreated: boolean;
  fechaUpdated: boolean;
  fechaDeleted: boolean;
  attendanceChanged: boolean;
  resultAdded: boolean;
  rankingLeaderChanged: boolean;
  debtSettled: boolean;
}): NotificationPrefs {
  return {
    fechaCreated: row.fechaCreated,
    fechaUpdated: row.fechaUpdated,
    fechaDeleted: row.fechaDeleted,
    attendanceChanged: row.attendanceChanged,
    resultAdded: row.resultAdded,
    rankingLeaderChanged: row.rankingLeaderChanged,
    debtSettled: row.debtSettled,
  };
}

export async function getOrCreateNotificationPrefs(
  userId: string,
): Promise<NotificationPrefs> {
  const existing = await prisma.notificationPreference.findUnique({
    where: { userId },
  });
  if (existing) return rowToPrefs(existing);

  const created = await prisma.notificationPreference.create({
    data: { userId },
  });
  return rowToPrefs(created);
}

export async function updateNotificationPrefs(
  userId: string,
  patch: Partial<NotificationPrefs>,
): Promise<NotificationPrefs> {
  const data: Partial<NotificationPrefs> = {};
  for (const key of PREFERENCE_KEYS) {
    if (typeof patch[key] === "boolean") {
      data[key] = patch[key];
    }
  }

  const row = await prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId, ...DEFAULT_NOTIFICATION_PREFS, ...data },
    update: data,
  });
  return rowToPrefs(row);
}

export async function loadPrefsForUsers(
  userIds: readonly string[],
): Promise<Map<string, NotificationPrefs>> {
  const unique = [...new Set(userIds)];
  const map = new Map<string, NotificationPrefs>();
  if (unique.length === 0) return map;

  const rows = await prisma.notificationPreference.findMany({
    where: { userId: { in: unique } },
  });
  for (const id of unique) {
    map.set(id, DEFAULT_NOTIFICATION_PREFS);
  }
  for (const row of rows) {
    map.set(row.userId, rowToPrefs(row));
  }
  return map;
}

export function parsePrefsPatch(body: unknown): Partial<NotificationPrefs> {
  if (!body || typeof body !== "object") return {};
  const patch: Partial<NotificationPrefs> = {};
  const record = body as Record<string, unknown>;
  for (const key of PREFERENCE_KEYS) {
    if (typeof record[key] === "boolean") {
      patch[key as PreferenceKey] = record[key] as boolean;
    }
  }
  return patch;
}
