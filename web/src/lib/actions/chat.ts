"use server";

import { auth } from "@/auth";
import { actionErrorMessage } from "@/lib/action-errors";
import { prisma } from "@/lib/db";
import { getMembership } from "@/lib/groups";
import {
  canPostSessionChat,
  isSessionChatOpen,
  normalizeChatBody,
} from "@/lib/sessions/chat";
import { revalidatePath } from "next/cache";

export async function postSessionChatMessageAction(
  formData: FormData,
): Promise<
  | { ok: true; message: { id: string; body: string; createdAt: string } }
  | { ok: false; error: string }
> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return { ok: false, error: "No autenticado" };

    const playSessionId = String(formData.get("playSessionId") || "");
    if (!playSessionId) return { ok: false, error: "Fecha inválida" };

    let body: string;
    try {
      body = normalizeChatBody(String(formData.get("body") || ""));
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Mensaje inválido",
      };
    }

    const playSession = await prisma.playSession.findUnique({
      where: { id: playSessionId },
      include: {
        attendances: { where: { userId } },
        group: { select: { slug: true } },
      },
    });
    if (!playSession) return { ok: false, error: "Fecha no encontrada" };

    const membership = await getMembership(playSession.groupId, userId);
    if (!membership) return { ok: false, error: "No eres miembro del grupo" };

    if (!isSessionChatOpen(playSession.startsAt)) {
      return { ok: false, error: "El chat está cerrado — la fecha ya pasó" };
    }

    const myStatus = playSession.attendances[0]?.status;
    if (!canPostSessionChat(myStatus)) {
      return {
        ok: false,
        error: "Marca Voy o Quizás para escribir en el chat",
      };
    }

    const created = await prisma.sessionChatMessage.create({
      data: { playSessionId, userId, body },
    });

    revalidatePath(
      `/grupos/${playSession.group.slug}/sessions/${playSessionId}`,
    );

    return {
      ok: true,
      message: {
        id: created.id,
        body: created.body,
        createdAt: created.createdAt.toISOString(),
      },
    };
  } catch (e) {
    return { ok: false, error: actionErrorMessage(e, "No se pudo enviar") };
  }
}
