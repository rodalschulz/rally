"use client";

import type { AttendanceStatus } from "@/lib/domain/types";
import { setAttendanceAction } from "@/lib/actions/sessions";
import { Spinner } from "@/components/Spinner";
import { useState, useTransition } from "react";

const labels: Record<Exclude<AttendanceStatus, "pending">, string> = {
  going: "Voy",
  maybe: "Quizás",
  not_going: "No voy",
};

const badgeStyles: Record<AttendanceStatus, string> = {
  going: "bg-ball/90 text-on-ball",
  maybe: "bg-mist-2 text-ink-soft",
  not_going: "bg-mist-2 text-muted",
  pending: "bg-mist text-muted",
};

const badgeLabels: Record<AttendanceStatus, string> = {
  going: "Voy",
  maybe: "Quizás",
  not_going: "No voy",
  pending: "Pendiente",
};

export function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[0.75rem] font-medium ${badgeStyles[status]}`}
    >
      {badgeLabels[status]}
    </span>
  );
}

export function RsvpStrip({
  playSessionId,
  current,
}: {
  playSessionId: string;
  current: AttendanceStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [pendingOpt, setPendingOpt] = useState<string | null>(null);
  const options = ["going", "maybe", "not_going"] as const;
  const active = current === "pending" ? null : current;

  return (
    <div
      className="relative flex gap-1 rounded-xl bg-mist-2 p-1"
      role="group"
      aria-label="Tu asistencia"
      aria-busy={pending}
    >
      {options.map((opt) => {
        const isActive = active === opt;
        const isThisPending = pending && pendingOpt === opt;
        return (
          <button
            key={opt}
            type="button"
            disabled={pending}
            onClick={() => {
              setPendingOpt(opt);
              startTransition(async () => {
                await setAttendanceAction(playSessionId, opt);
                setPendingOpt(null);
              });
            }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-[0.65rem] px-2 py-2.5 text-[0.9rem] font-medium transition active:scale-[0.98] disabled:opacity-70 ${
              isActive ? "bg-sand text-ink shadow-sm" : "text-muted"
            }`}
          >
            {isThisPending ? <Spinner className="size-3.5" /> : null}
            {labels[opt]}
          </button>
        );
      })}
    </div>
  );
}
