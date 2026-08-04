import { getVapidPublicKey } from "@/lib/push";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const key = getVapidPublicKey();
  if (!key) {
    return NextResponse.json(
      { error: "VAPID no configurado" },
      { status: 503 },
    );
  }
  return NextResponse.json({ publicKey: key });
}
