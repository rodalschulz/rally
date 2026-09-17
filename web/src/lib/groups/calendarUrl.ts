export const GROUP_CALENDAR_URL_MAX = 2048;

const GOOGLE_CALENDAR_HOSTS = new Set([
  "calendar.google.com",
  "calendar.app.google",
]);

export function canEditGroupCalendarUrl(opts: {
  isGroupOwner: boolean;
  isAppAdmin: boolean;
}): boolean {
  return opts.isGroupOwner || opts.isAppAdmin;
}

/** Trim; empty → null; throws if not a Google Calendar https URL. */
export function normalizeGroupCalendarUrl(
  raw: string | undefined | null,
): string | null {
  const text = (raw ?? "").trim();
  if (!text) return null;
  if (text.length > GROUP_CALENDAR_URL_MAX) {
    throw new Error(
      `Link muy largo (máx. ${GROUP_CALENDAR_URL_MAX} caracteres)`,
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(text);
  } catch {
    throw new Error("Pega un link válido de Google Calendar");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("El link debe empezar con https://");
  }

  if (!isGoogleCalendarUrl(parsed)) {
    throw new Error("Usa un link de Google Calendar");
  }

  return parsed.toString();
}

function isGoogleCalendarUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (GOOGLE_CALENDAR_HOSTS.has(host)) return true;
  if (host === "google.com" || host === "www.google.com") {
    return url.pathname.toLowerCase().includes("/calendar");
  }
  return false;
}
