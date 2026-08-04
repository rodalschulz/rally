import { auth } from "@/auth";
import {
  deleteAllPushSubscriptions,
  deletePushSubscriptionByEndpoint,
} from "@/lib/push";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let endpoint: string | undefined;
  try {
    const body = (await req.json()) as { endpoint?: string; all?: boolean };
    if (body.all) {
      await deleteAllPushSubscriptions(userId);
      return NextResponse.json({ ok: true });
    }
    endpoint = body.endpoint?.trim();
  } catch {
    // empty body → delete all for this user
  }

  if (!endpoint) {
    await deleteAllPushSubscriptions(userId);
    return NextResponse.json({ ok: true });
  }

  await deletePushSubscriptionByEndpoint(userId, endpoint);
  return NextResponse.json({ ok: true });
}
