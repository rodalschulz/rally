import { auth } from "@/auth";
import {
  getOrCreateNotificationPrefs,
  upsertPushSubscription,
  type BrowserPushSubscriptionJSON,
} from "@/lib/push";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const subscription = (body as { subscription?: BrowserPushSubscriptionJSON })
    ?.subscription;
  if (!subscription || typeof subscription !== "object") {
    return NextResponse.json(
      { error: "Falta subscription" },
      { status: 400 },
    );
  }

  const result = await upsertPushSubscription(
    userId,
    subscription,
    req.headers.get("user-agent"),
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const preferences = await getOrCreateNotificationPrefs(userId);
  return NextResponse.json({ ok: true, preferences });
}
