"use client";

import { updateGroupCalendarAction } from "@/lib/actions/groups";
import { GROUP_CALENDAR_URL_MAX } from "@/lib/groups/calendarUrl";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";

export function GroupCalendarButton({
  calendarUrl,
  canEdit,
  groupId,
  slug,
}: {
  calendarUrl: string | null;
  canEdit: boolean;
  groupId: string;
  slug: string;
}) {
  const [open, setOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setError(null);
      setCopied(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!canEdit && !calendarUrl) return null;

  async function copyLink() {
    if (!calendarUrl) return;
    try {
      await navigator.clipboard.writeText(calendarUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function onClick() {
    if (canEdit) {
      setOpen(true);
      return;
    }
    void copyLink();
  }

  function save(formData: FormData, clear = false) {
    formData.set("groupId", groupId);
    formData.set("slug", slug);
    if (clear) formData.set("clear", "1");
    setError(null);
    startTransition(async () => {
      const result = await updateGroupCalendarAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-label={
          copied ? "Link copiado" : "Google Calendar"
        }
        title="Google Calendar"
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-mist-2 text-muted transition hover:text-ink active:scale-95"
      >
        {copied ? <CheckIcon /> : <CalendarIcon />}
      </button>

      {portalReady && open && canEdit
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
              role="presentation"
              onClick={() => setOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="calendar-title"
                className="w-full max-w-md overflow-hidden rounded-2xl bg-sand shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3 border-b border-ink/6 px-4 py-3">
                  <div className="min-w-0">
                    <h2
                      id="calendar-title"
                      className="text-[1.05rem] font-semibold tracking-[-0.02em] text-ink"
                    >
                      Google Calendar
                    </h2>
                    <p className="mt-0.5 text-[0.75rem] text-muted">
                      Pega el link de compartir del calendario del grupo.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="shrink-0 rounded-lg px-2 py-1 text-[0.9rem] font-medium text-muted"
                    aria-label="Cerrar"
                  >
                    Cerrar
                  </button>
                </div>
                <form
                  className="space-y-3 px-4 py-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    save(new FormData(e.currentTarget));
                  }}
                >
                  <label className="block text-[0.8rem] text-muted">
                    Link
                    <input
                      name="calendarUrl"
                      type="url"
                      inputMode="url"
                      autoComplete="off"
                      defaultValue={calendarUrl ?? ""}
                      maxLength={GROUP_CALENDAR_URL_MAX}
                      placeholder="https://calendar.google.com/..."
                      className="mt-1 w-full rounded-xl bg-mist-2 px-3 py-3 text-ink placeholder:text-muted"
                    />
                  </label>
                  {error ? (
                    <p className="text-[0.8rem] text-danger">{error}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={pending}
                      className="inline-flex flex-1 items-center justify-center rounded-xl bg-ink px-3 py-2.5 text-[0.9rem] font-medium text-sand transition enabled:active:scale-[0.99] disabled:opacity-60"
                    >
                      {pending ? "Guardando…" : "Guardar"}
                    </button>
                    {calendarUrl ? (
                      <button
                        type="button"
                        onClick={() => void copyLink()}
                        className="inline-flex items-center justify-center rounded-xl bg-mist-2 px-3 py-2.5 text-[0.9rem] font-medium text-ink transition hover:bg-mist-2/80 active:scale-[0.99]"
                      >
                        {copied ? "Copiado" : "Copiar"}
                      </button>
                    ) : null}
                    {calendarUrl ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => save(new FormData(), true)}
                        className="inline-flex items-center justify-center rounded-xl px-3 py-2.5 text-[0.9rem] font-medium text-danger transition enabled:active:scale-[0.99] disabled:opacity-60"
                      >
                        Quitar
                      </button>
                    ) : null}
                  </div>
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3.5"
        y="5.5"
        width="17"
        height="15"
        rx="2.25"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M8 3.75v3.5M16 3.75v3.5M3.5 10h17"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12.5 10 17.5 19 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
