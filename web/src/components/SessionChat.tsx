"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { postSessionChatMessageAction } from "@/lib/actions/chat";
import { formatChatTime } from "@/lib/format";
import {
  CHAT_BODY_MAX,
  type ChatMessageDTO,
} from "@/lib/sessions/chat";
import { Spinner } from "@/components/Spinner";

const POLL_MS = 12_000;

export function SessionChat({
  playSessionId,
  initialMessages,
  canPost,
  chatOpen,
  meId,
  meDisplayName,
  meShortName,
  meHue,
}: {
  playSessionId: string;
  initialMessages: ChatMessageDTO[];
  canPost: boolean;
  chatOpen: boolean;
  meId: string;
  meDisplayName: string;
  meShortName: string;
  meHue: number;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [canWrite, setCanWrite] = useState(canPost);
  const [open, setOpen] = useState(chatOpen);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const listRef = useRef<HTMLUListElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    setCanWrite(canPost);
    setOpen(chatOpen);
  }, [canPost, chatOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  useEffect(() => {
    if (!open) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const pull = async () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      try {
        const res = await fetch(`/api/sessions/${playSessionId}/chat`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          messages: ChatMessageDTO[];
          open: boolean;
          canPost: boolean;
        };
        setMessages(data.messages);
        setOpen(data.open);
        setCanWrite(data.canPost);
      } catch {
        /* ignore transient network errors */
      }
    };

    const start = () => {
      if (timer) return;
      timer = setInterval(pull, POLL_MS);
    };
    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void pull();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [playSessionId, open]);

  const send = () => {
    setError(null);
    const text = body.trim();
    if (!text) {
      setError("Mensaje vacío");
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const optimistic: ChatMessageDTO = {
      id: tempId,
      body: text,
      createdAt: new Date().toISOString(),
      userId: meId,
      displayName: meDisplayName,
      shortName: meShortName,
      hue: meHue,
    };
    setMessages((prev) => [...prev, optimistic]);
    setBody("");

    const fd = new FormData();
    fd.set("playSessionId", playSessionId);
    fd.set("body", text);

    startTransition(async () => {
      const result = await postSessionChatMessageAction(fd);
      if (!result.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setBody(text);
        setError(result.error);
        return;
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? {
                ...m,
                id: result.message.id,
                body: result.message.body,
                createdAt: result.message.createdAt,
              }
            : m,
        ),
      );
    });
  };

  return (
    <section className="animate-rise mt-8" aria-labelledby="chat-heading">
      <h2
        id="chat-heading"
        className="mb-2 text-[1.05rem] font-semibold tracking-[-0.02em] text-ink"
      >
        Chat
      </h2>

      <div className="overflow-hidden rounded-2xl bg-sand">
        <ul
          ref={listRef}
          className="max-h-72 space-y-0 overflow-y-auto overscroll-contain"
        >
          {messages.length === 0 ? (
            <li className="px-4 py-6 text-center text-[0.9rem] text-muted">
              {open
                ? "Todavía no hay mensajes."
                : "Sin mensajes en esta fecha."}
            </li>
          ) : (
            messages.map((m) => (
              <li
                key={m.id}
                className="border-b border-ink/6 px-4 py-3 last:border-b-0"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-[0.85rem] font-medium text-ink">
                    {m.displayName}
                  </p>
                  <time
                    className="shrink-0 text-[0.7rem] tabular-nums text-muted"
                    dateTime={m.createdAt}
                  >
                    {formatChatTime(m.createdAt)}
                  </time>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-[0.9rem] leading-relaxed text-ink-soft">
                  {m.body}
                </p>
              </li>
            ))
          )}
          <div ref={bottomRef} />
        </ul>

        <div className="border-t border-ink/6 px-4 py-3">
          {!open ? (
            <p className="text-[0.85rem] text-muted">
              Chat cerrado — solo registro.
            </p>
          ) : canWrite ? (
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={CHAT_BODY_MAX}
                rows={2}
                placeholder="Escribe un mensaje…"
                className="w-full resize-none rounded-xl bg-mist-2 px-3 py-2.5 text-[0.95rem] text-ink placeholder:text-muted"
              />
              {error ? (
                <p className="text-[0.85rem] text-danger">{error}</p>
              ) : null}
              <button
                type="submit"
                disabled={pending || !body.trim()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ball py-2.5 text-[0.9rem] font-semibold text-on-ball disabled:opacity-60"
              >
                {pending ? (
                  <>
                    <Spinner />
                    Enviando…
                  </>
                ) : (
                  "Enviar"
                )}
              </button>
            </form>
          ) : (
            <p className="text-[0.85rem] text-muted">
              Marca <strong className="font-medium text-ink">Voy</strong> o{" "}
              <strong className="font-medium text-ink">Quizás</strong> para
              escribir.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
