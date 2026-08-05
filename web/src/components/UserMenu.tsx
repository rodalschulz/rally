"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PendingSubmitButton } from "./PendingSubmitButton";

/**
 * Header account menu. Hides logout behind a menu so it isn't a one-tap
 * action: opens a dropdown with user settings + an explicit sign out.
 */
export function UserMenu({
  logoutAction,
  settingsHref = "/ajustes",
}: {
  /** Server action that signs the user out. */
  logoutAction: () => Promise<void>;
  settingsHref?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menú"
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:text-ink active:scale-95"
      >
        <MenuIcon />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-52 overflow-hidden rounded-xl bg-sand shadow-lg ring-1 ring-ink/10"
        >
          <Link
            role="menuitem"
            href={settingsHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-3 text-[0.9rem] font-medium text-ink transition hover:bg-mist-2"
          >
            <GearIcon />
            Ajustes de usuario
          </Link>
          <form action={logoutAction} className="border-t border-ink/6">
            <PendingSubmitButton
              role="menuitem"
              pendingLabel="Saliendo…"
              className="w-full justify-start px-4 py-3 text-left text-[0.9rem] font-medium text-danger transition hover:bg-mist-2"
            >
              <LogoutIcon />
              Cerrar sesión
            </PendingSubmitButton>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 3.5v2.2M12 18.3V20.5M3.5 12h2.2M18.3 12h2.2M6.1 6.1l1.6 1.6M16.3 16.3l1.6 1.6M17.9 6.1l-1.6 1.6M7.7 16.3l-1.6 1.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M14 12h6.5M17.5 8.5 21 12l-3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
