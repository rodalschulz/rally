import type { AttendanceStatus } from "@prisma/client";
import { APP_TIMEZONE } from "@/lib/timezone";

const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  going: "Voy",
  maybe: "Quizás",
  not_going: "No voy",
  pending: "Pendiente",
};

export function attendanceStatusLabel(status: AttendanceStatus): string {
  return ATTENDANCE_LABEL[status] ?? status;
}

export function formatFechaWhen(startsAt: Date): string {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: APP_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(startsAt);
}

export function displayNameOf(
  user: { displayName: string | null; name: string | null } | null | undefined,
  fallback = "Alguien",
): string {
  return user?.displayName?.trim() || user?.name?.trim() || fallback;
}
