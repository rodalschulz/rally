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
  const scope = { slug };
  const [, rows, members] = await Promise.all([
    requireGroupMember(slug),
    listPastPlaySessions(scope),
    listGroupMembers(scope),
  ]);
  const players = members.map((m) => m.player);
  return rows.map((row) => toHubSessionItem(row, players));
}

export async function loadAllSettledDebtsAction(
  slug: string,
): Promise<DebtWithSession[]> {
  const scope = { slug };
  const [, debts] = await Promise.all([
    requireGroupMember(slug),
    listSettledDebts(scope),
  ]);
  return debts;
}
