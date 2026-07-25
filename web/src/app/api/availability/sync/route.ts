import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type SlotsPayload = Record<string, Record<string, string[]>>;

function authorize(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token === secret;
}

/** PC bot pushes Miraflores availability here. */
export async function POST(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slots = (body as { slots?: SlotsPayload })?.slots;
  if (!slots || typeof slots !== "object" || Array.isArray(slots)) {
    return NextResponse.json({ error: "Missing slots object" }, { status: 400 });
  }

  const snapshot = await prisma.availabilitySnapshot.upsert({
    where: { id: "latest" },
    create: { id: "latest", slots, fetchedAt: new Date() },
    update: { slots, fetchedAt: new Date() },
  });

  return NextResponse.json({
    ok: true,
    fetchedAt: snapshot.fetchedAt.toISOString(),
    dates: Object.keys(slots).length,
  });
}
