/** Keys matching NotificationPreference boolean columns. */
export type PreferenceKey =
  | "fechaCreated"
  | "fechaUpdated"
  | "fechaDeleted"
  | "attendanceChanged"
  | "resultAdded"
  | "rankingLeaderChanged"
  | "debtSettled";

export type NotificationPrefs = Record<PreferenceKey, boolean>;

export const PREFERENCE_KEYS: PreferenceKey[] = [
  "fechaCreated",
  "fechaUpdated",
  "fechaDeleted",
  "attendanceChanged",
  "resultAdded",
  "rankingLeaderChanged",
  "debtSettled",
];

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  fechaCreated: true,
  fechaUpdated: true,
  fechaDeleted: true,
  attendanceChanged: true,
  resultAdded: true,
  rankingLeaderChanged: true,
  debtSettled: true,
};

/** Payload delivered to the service worker `push` handler. */
export type PushPayload = {
  title: string;
  body: string;
  url: string;
};

export type BrowserPushSubscriptionJSON = {
  endpoint: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};
