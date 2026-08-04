import { auth } from "@/auth";
import {
  getOrCreateNotificationPrefs,
  parsePrefsPatch,
  updateNotificationPrefs,
} from "@/lib/push";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const preferences = await getOrCreateNotificationPrefs(userId);
  return NextResponse.json({ preferences });
}

export async function PATCH(req: Request) {
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

  const patch = parsePrefsPatch(body);
  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "Sin preferencias válidas" },
      { status: 400 },
    );
  }

  const preferences = await updateNotificationPrefs(userId, patch);
  return NextResponse.json({ preferences });
}
