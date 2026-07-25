import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listSessionChatMessages } from "@/lib/data/queries";
import { prisma } from "@/lib/db";
import { getMembership } from "@/lib/groups";
import {
  canPostSessionChat,
  isSessionChatOpen,
} from "@/lib/sessions/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lightweight poll for session chat — avoids full RSC refresh. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id: playSessionId } = await params;
  const playSession = await prisma.playSession.findUnique({
    where: { id: playSessionId },
    include: { attendances: { where: { userId } } },
  });
  if (!playSession) {
    return NextResponse.json({ error: "Fecha no encontrada" }, { status: 404 });
  }

  const membership = await getMembership(playSession.groupId, userId);
  if (!membership) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const messages = await listSessionChatMessages(playSessionId);
  const myStatus = playSession.attendances[0]?.status ?? null;
  const open = isSessionChatOpen(playSession.startsAt);

  return NextResponse.json(
    {
      messages,
      open,
      canPost: open && canPostSessionChat(myStatus),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
