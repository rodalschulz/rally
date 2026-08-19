"use server";

import {
  listGroupMembers,
  listPastPlaySessions,
  listSettledDebts,
} from "@/lib/data/queries";
import type { DebtWithSession } from "@/lib/domain/types";
import { requireGroupMember } from "@/lib/groups";
import {
  toHubSessionItem,
  type HubSessionItem,
} from "@/lib/sessions/hub";

export async function loadAllPastSessionsAction(
  slug: string,
): Promise<HubSessionItem[]> {
  const group = await requireGroupMember(slug);
  const [rows, members] = await Promise.all([
    listPastPlaySessions(group.id),
    listGroupMembers(group.id),
  ]);
  const players = members.map((m) => m.player);
  return rows.map((row) => toHubSessionItem(row, players));
}

export async function loadAllSettledDebtsAction(
  slug: string,
): Promise<DebtWithSession[]> {
  const group = await requireGroupMember(slug);
  return listSettledDebts(group.id);
}
