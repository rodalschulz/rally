"use client";

import { useEffect, useState, useTransition } from "react";
import type { NotificationPrefs, PreferenceKey } from "@/lib/push/types";
import { DEFAULT_NOTIFICATION_PREFS } from "@/lib/push/types";

const PREF_ROWS: { key: PreferenceKey; label: string; hint: string }[] = [
  {
    key: "fechaCreated",
    label: "Nueva fecha",
    hint: "Cuando alguien crea una Fecha en un grupo tuyo",
  },
  {
    key: "fechaUpdated",
    label: "Fecha actualizada",
    hint: "Cambios de hora, cancha, costo u otros datos",
  },
  {
    key: "fechaDeleted",
    label: "Fecha borrada",
    hint: "Cuando eliminan una Fecha del grupo",
  },
  {
    key: "attendanceChanged",
    label: "Asistencia",
    hint: "Cuando alguien marca Voy / Quizás / No voy",
  },
  {
    key: "resultAdded",
    label: "Games y Sets",
    hint: "Cuando agregan un Game o Set nuevo (no ediciones ni borrados)",
  },
  {
    key: "rankingLeaderChanged",
    label: "Ranking Singles",
    hint: "Si cambia el 1.er puesto de Singles Games (Elo.G)",
  },
  {
    key: "debtSettled",
    label: "Deudas",
    hint: "Cuando se salda una deuda que te involucra",
  },
];

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const cleaned = base64String.trim().replace(/^["']|["']$/g, "");
  const padding = "=".repeat((4 - (cleaned.length % 4)) % 4);
  const base64 = (cleaned + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const webkit = /WebKit/.test(ua);
  const isChromeIos = /CriOS/.test(ua);
  return iOS && webkit && !isChromeIos;
}

function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
}

export function NotificationSettings() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs>(
    DEFAULT_NOTIFICATION_PREFS,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window;
    setSupported(ok);
    if (!ok) {
      setLoaded(true);
      return;
    }

    void (async () => {
      try {
        const res = await fetch("/api/push/status");
        if (res.ok) {
          const data = (await res.json()) as {
            subscribed: boolean;
            preferences: NotificationPrefs;
          };
          setPrefs(data.preferences);
          const reg = await navigator.serviceWorker.ready.catch(() => null);
          const browserSub = reg
            ? await reg.pushManager.getSubscription()
            : null;
          setSubscribed(Boolean(data.subscribed && browserSub));
        }
      } catch {
        /* ignore */
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const enablePush = () => {
    setError(null);
    startTransition(async () => {
      try {
        if (isIosSafari() && !isStandalonePwa()) {
          setError(
            "En iPhone/iPad: añade rally a la pantalla de inicio y ábrela desde ahí para activar notificaciones.",
          );
          return;
        }

        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          setError("Permiso de notificaciones denegado en el navegador.");
          return;
        }

        const keyRes = await fetch("/api/push/vapid-public-key");
        if (!keyRes.ok) {
          setError("Push no está configurado en el servidor (VAPID).");
          return;
        }
        const { publicKey } = (await keyRes.json()) as { publicKey: string };

        const reg = await navigator.serviceWorker.register("/sw.js");
        await reg.update();
        const ready = await navigator.serviceWorker.ready;

        const subscription = await ready.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            publicKey,
          ) as BufferSource,
        });

        const save = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: subscription.toJSON() }),
        });
        if (!save.ok) {
          setError("No se pudo guardar la suscripción.");
          return;
        }
        const data = (await save.json()) as { preferences?: NotificationPrefs };
        if (data.preferences) setPrefs(data.preferences);
        setSubscribed(true);
      } catch (e) {
        console.error(e);
        setError(
          "No se pudieron activar las notificaciones. Prueba en producción o con next start.",
        );
      }
    });
  };

  const disablePush = () => {
    setError(null);
    startTransition(async () => {
      try {
        const reg = await navigator.serviceWorker.ready.catch(() => null);
        const subscription = reg
          ? await reg.pushManager.getSubscription()
          : null;
        const endpoint = subscription?.endpoint;
        if (subscription) await subscription.unsubscribe();

        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            endpoint ? { endpoint } : { all: true },
          ),
        });
        setSubscribed(false);
      } catch (e) {
        console.error(e);
        setError("No se pudieron desactivar las notificaciones.");
      }
    });
  };

  const togglePref = (key: PreferenceKey, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    startTransition(async () => {
      try {
        const res = await fetch("/api/push/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [key]: value }),
        });
        if (!res.ok) throw new Error("fail");
        const data = (await res.json()) as { preferences: NotificationPrefs };
        setPrefs(data.preferences);
      } catch {
        setPrefs(prefs);
        setError("No se pudo guardar la preferencia.");
      }
    });
  };

  if (!loaded) {
    return (
      <section className="animate-rise mt-10">
        <h2 className="text-[1.1rem] font-semibold text-ink">Notificaciones</h2>
        <p className="mt-1 text-[0.85rem] text-muted">Cargando…</p>
      </section>
    );
  }

  if (!supported) {
    return (
      <section className="animate-rise mt-10">
        <h2 className="text-[1.1rem] font-semibold text-ink">Notificaciones</h2>
        <p className="mt-1 text-[0.85rem] text-muted">
          Este navegador no soporta notificaciones push.
          {isIosSafari()
            ? " En iOS, añade rally a la pantalla de inicio y ábrela desde el icono."
            : null}
        </p>
      </section>
    );
  }

  return (
    <section className="animate-rise mt-10 space-y-4">
      <div>
        <h2 className="text-[1.1rem] font-semibold text-ink">Notificaciones</h2>
        <p className="mt-1 text-[0.85rem] text-muted">
          Activa push en este dispositivo y elige qué avisos quieres recibir.
        </p>
      </div>

      {isIosSafari() && !isStandalonePwa() ? (
        <p className="rounded-xl bg-sand px-3 py-2.5 text-[0.85rem] text-muted ring-1 ring-ink/8">
          En iPhone/iPad las notificaciones solo funcionan si abres rally desde
          la pantalla de inicio (Compartir → Añadir a pantalla de inicio).
        </p>
      ) : null}

      <button
        type="button"
        disabled={busy}
        onClick={() => (subscribed ? disablePush() : enablePush())}
        className={
          subscribed
            ? "w-full rounded-2xl bg-sand py-3.5 text-[1rem] font-medium text-muted ring-1 ring-ink/10 disabled:opacity-60"
            : "w-full rounded-2xl bg-ball py-3.5 text-[1rem] font-semibold text-on-ball disabled:opacity-60"
        }
      >
        {busy
          ? "…"
          : subscribed
            ? "Desactivar notificaciones"
            : "Activar notificaciones"}
      </button>

      {error ? (
        <p className="text-[0.85rem] text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <ul className="space-y-3">
        {PREF_ROWS.map((row) => (
          <li
            key={row.key}
            className="flex items-start justify-between gap-3 rounded-xl bg-sand/60 px-3 py-3 ring-1 ring-ink/6"
          >
            <div className="min-w-0">
              <p className="text-[0.95rem] font-medium text-ink">{row.label}</p>
              <p className="mt-0.5 text-[0.8rem] text-muted">{row.hint}</p>
            </div>
            <label className="relative mt-0.5 inline-flex shrink-0 cursor-pointer">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={prefs[row.key]}
                disabled={busy}
                onChange={(e) => togglePref(row.key, e.target.checked)}
              />
              <span
                className={`h-6 w-11 rounded-full transition-colors ${
                  prefs[row.key] ? "bg-ball" : "bg-ink/15"
                } peer-disabled:opacity-50`}
              />
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  prefs[row.key] ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </label>
          </li>
        ))}
      </ul>

      {!subscribed ? (
        <p className="text-[0.8rem] text-muted">
          Las preferencias se guardan igual; los avisos solo llegan si activas
          notificaciones en este dispositivo.
        </p>
      ) : null}
    </section>
  );
}
