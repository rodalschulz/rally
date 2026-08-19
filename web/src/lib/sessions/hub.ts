import type { Attendance as DbAttendance, PlaySession } from "@prisma/client";
import type { Player, Session } from "@/lib/domain/types";
import { toAttendance, toSession } from "@/lib/mappers";
import { goingFrom } from "./goingPlayers";

/** Hub Fechas Pasadas: first paint, then "Ver todas" fetches the rest. */
export const PAST_SESSIONS_PREVIEW_LIMIT = 5;

export type HubSessionItem = {
  session: Session;
  goingPlayers: Player[];
  goingCount: number;
};

export function toHubSessionItem(
  row: PlaySession & { attendances: DbAttendance[] },
  players: Player[],
): HubSessionItem {
  const session = toSession(row);
  const attendances = row.attendances.map(toAttendance);
  const going = goingFrom(
    session.id,
    attendances,
    players,
    session.createdById,
  );
  return {
    session,
    goingPlayers: going.players,
    goingCount: going.count,
  };
}
