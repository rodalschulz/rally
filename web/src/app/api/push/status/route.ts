import { auth } from "@/auth";
import {
  getOrCreateNotificationPrefs,
  userHasPushSubscription,
} from "@/lib/push";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const [subscribed, preferences] = await Promise.all([
    userHasPushSubscription(userId),
    getOrCreateNotificationPrefs(userId),
  ]);

  return NextResponse.json({ subscribed, preferences });
}
