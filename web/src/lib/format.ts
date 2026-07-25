const soles = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const weekdayLong = new Intl.DateTimeFormat("es-PE", { weekday: "long" });
const weekdayShort = new Intl.DateTimeFormat("es-PE", { weekday: "short" });
const dayMonth = new Intl.DateTimeFormat("es-PE", {
  day: "numeric",
  month: "short",
});
const timeFmt = new Intl.DateTimeFormat("es-PE", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
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

/** Value for `<input type="datetime-local">` in the browser local zone. */
export function toDatetimeLocalValue(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function relativeDayLabel(iso: string): string | null {
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round(
    (startThat.getTime() - startToday.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff === -1) return "Ayer";
  return null;
}
