"use client";

import { Spinner } from "@/components/Spinner";
import { useEffect, useState, useTransition } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [dismissed, setDismissed] = useState(true);
  const [isStandalone, setIsStandalone] = useState(true);
  const [isiOS, setIsiOS] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    setIsStandalone(standalone);

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsiOS(ios);

    const stored = localStorage.getItem("rally-install-dismissed");
    setDismissed(stored === "1");

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (isStandalone || dismissed) return null;
  if (!deferred && !isiOS) return null;

  const dismiss = () => {
    localStorage.setItem("rally-install-dismissed", "1");
    setDismissed(true);
  };

  const install = () => {
    if (!deferred) return;
    startTransition(async () => {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      dismiss();
    });
  };

  return (
    <div className="animate-rise mb-5 rounded-2xl bg-sand px-4 py-3.5">
      <p className="text-[0.95rem] font-medium text-ink">
        Instala rally en el teléfono
      </p>
      <p className="mt-0.5 text-[0.85rem] leading-snug text-muted">
        {isiOS && !deferred
          ? "En Safari: Compartir → Agregar a pantalla de inicio."
          : "Queda como app en tu pantalla de inicio."}
      </p>
      <div className="mt-3 flex gap-4">
        {deferred ? (
          <button
            type="button"
            onClick={install}
            disabled={pending}
            className="inline-flex items-center gap-1.5 text-[0.9rem] font-medium text-ink disabled:opacity-60"
          >
            {pending ? <Spinner className="size-3.5" /> : null}
            Instalar
          </button>
        ) : null}
        <button
          type="button"
          onClick={dismiss}
          disabled={pending}
          className="text-[0.9rem] font-medium text-muted disabled:opacity-60"
        >
          Ahora no
        </button>
      </div>
    </div>
  );
}
