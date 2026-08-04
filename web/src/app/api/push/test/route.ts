import { auth } from "@/auth";
import { userIsAppAdmin } from "@/lib/admin";
import { sendRawPushToUser } from "@/lib/push";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Admin-only: ping the caller's own push subscriptions. */
export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (!(await userIsAppAdmin(userId))) {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }

  try {
    const { sent } = await sendRawPushToUser(userId, {
      title: "rally · Prueba",
      body: "Si ves esto, las notificaciones push funcionan en este dispositivo.",
      url: "/ajustes",
    });
    if (sent === 0) {
      return NextResponse.json(
        { error: "No hay suscripciones activas. Activa notificaciones primero." },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true, sent });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "No se pudo enviar la prueba";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
