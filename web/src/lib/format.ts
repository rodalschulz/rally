import {
  APP_TIMEZONE,
  appCalendarDayKey,
  appZonedParts,
  fromAppZonedDateTime,
} from "@/lib/timezone";

const soles = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const dateOpts = { timeZone: APP_TIMEZONE } as const;

const weekdayLong = new Intl.DateTimeFormat("es-PE", {
  ...dateOpts,
  weekday: "long",
});
const weekdayShort = new Intl.DateTimeFormat("es-PE", {
  ...dateOpts,
  weekday: "short",
});
const dayMonth = new Intl.DateTimeFormat("es-PE", {
  ...dateOpts,
  day: "numeric",
  month: "short",
});
/** Hora militar (24h), siempre en America/Lima. */
const timeFmt = new Intl.DateTimeFormat("es-PE", {
  ...dateOpts,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const chatTimeFmt = new Intl.DateTimeFormat("es-PE", {
  ...dateOpts,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatSoles(amount: number): string {
  return soles.format(amount);
}

export function formatSessionWhen(iso: string): {
  weekday: string;
  dayMonth: string;
  time: string;
  label: string;
} {
  const d = new Date(iso);
  const wd = capitalize(weekdayLong.format(d));
  const dm = dayMonth.format(d);
  const time = timeFmt.format(d);
  return {
    weekday: wd,
    dayMonth: dm,
    time,
    label: `${wd} ${dm} · ${time}`,
  };
}

export function formatSessionChip(iso: string): string {
  const d = new Date(iso);
  return `${capitalize(weekdayShort.format(d))} ${dayMonth.format(d)}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Value for `<input type="datetime-local">` as America/Lima wall clock. */
export function toDatetimeLocalValue(iso: string | Date): string {
  const p = appZonedParts(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/**
 * Default for nueva fecha: next full hour in America/Lima (`:00`).
 * Fechas always start on the hour.
 */
export function defaultSessionDatetimeLocal(now = new Date()): string {
  const p = appZonedParts(now);
  const floorHour = fromAppZonedDateTime(p.year, p.month, p.day, p.hour, 0, 0);
  const nextHour = new Date(floorHour.getTime() + 60 * 60 * 1000);
  const q = appZonedParts(nextHour);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${q.year}-${pad(q.month)}-${pad(q.day)}T${pad(q.hour)}:00`;
}

export function relativeDayLabel(iso: string): string | null {
  const thatKey = appCalendarDayKey(iso);
  const todayKey = appCalendarDayKey(new Date());
  const that = Date.parse(`${thatKey}T12:00:00Z`);
  const today = Date.parse(`${todayKey}T12:00:00Z`);
  const diff = Math.round((that - today) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff === -1) return "Ayer";
  return null;
}

/** Day-of-month in America/Lima (for session list chips). */
export function sessionDayOfMonth(iso: string): number {
  return appZonedParts(iso).day;
}

export function formatChatTime(iso: string): string {
  return chatTimeFmt.format(new Date(iso));
}
