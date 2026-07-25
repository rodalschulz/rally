/** Wall-clock timezone for fechas and UI times (Peru, no DST). */
export const APP_TIMEZONE = "America/Lima";

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "0";

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}

/** Offset of `timeZone` at `date`: wallClockAsUTC − instant (ms). */
function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - date.getTime();
}

/**
 * Build an Instant from a wall-clock datetime in `APP_TIMEZONE`.
 * Example: 17:00 in Lima → 22:00Z.
 */
export function fromAppZonedDateTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second = 0,
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const offset = timeZoneOffsetMs(new Date(utcGuess), APP_TIMEZONE);
  let instant = utcGuess - offset;
  const offset2 = timeZoneOffsetMs(new Date(instant), APP_TIMEZONE);
  if (offset2 !== offset) {
    instant = utcGuess - offset2;
  }
  return new Date(instant);
}

/**
 * Parse `<input type="datetime-local">` value as America/Lima wall time.
 * Accepts `YYYY-MM-DDTHH:mm` or with seconds.
 */
export function parseAppDatetimeLocal(raw: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(
    raw.trim(),
  );
  if (!m) {
    throw new Error("Fecha inválida");
  }
  return fromAppZonedDateTime(
    Number(m[1]),
    Number(m[2]),
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
    m[6] ? Number(m[6]) : 0,
  );
}

export function appZonedParts(iso: string | Date): ZonedParts {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return zonedParts(d, APP_TIMEZONE);
}

/** Calendar day key `YYYY-MM-DD` in America/Lima. */
export function appCalendarDayKey(iso: string | Date): string {
  const p = appZonedParts(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}
