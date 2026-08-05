"use client";

import { useMemo, useState } from "react";
import type { EloHistoryPoint, EloHistoryRange } from "@/lib/ranking/playerStats";
import { buildEloHistoryForChart } from "@/lib/ranking/playerStats";
import { APP_TIMEZONE } from "@/lib/timezone";

const RANGES: { id: EloHistoryRange; label: string }[] = [
  { id: "month", label: "Este mes" },
  { id: "30d", label: "30 días" },
  { id: "all", label: "Inicio" },
];

const dayLabelFmt = new Intl.DateTimeFormat("es-PE", {
  timeZone: APP_TIMEZONE,
  day: "numeric",
  month: "short",
});

export function EloHistoryChart({
  history,
  now,
}: {
  history: EloHistoryPoint[];
  now?: Date;
}) {
  const [range, setRange] = useState<EloHistoryRange>("all");
  const points = useMemo(
    () => buildEloHistoryForChart(history, range, now ?? new Date()),
    [history, range, now],
  );

  const chart = useMemo(() => layoutChart(points), [points]);

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {RANGES.map((r) => {
          const active = range === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={`rounded-lg px-2.5 py-1 text-[0.75rem] font-medium transition ${
                active
                  ? "bg-mist-2 text-ink"
                  : "text-muted hover:text-ink"
              }`}
            >
              {r.label}
            </button>
          );
        })}
      </div>

      {chart ? (
        <div className="mt-3">
          <svg
            viewBox={`0 0 ${chart.w} ${chart.h}`}
            className="h-44 w-full"
            role="img"
            aria-label="Historial de Elo por día"
          >
            <line
              x1={chart.padL}
              y1={chart.padT}
              x2={chart.padL}
              y2={chart.h - chart.padB}
              stroke="currentColor"
              strokeOpacity={0.12}
            />
            <line
              x1={chart.padL}
              y1={chart.h - chart.padB}
              x2={chart.w - chart.padR}
              y2={chart.h - chart.padB}
              stroke="currentColor"
              strokeOpacity={0.12}
            />
            <text
              x={chart.padL - 6}
              y={chart.padT + 4}
              textAnchor="end"
              className="fill-muted"
              fontSize="10"
            >
              {chart.maxElo}
            </text>
            <text
              x={chart.padL - 6}
              y={chart.h - chart.padB}
              textAnchor="end"
              className="fill-muted"
              fontSize="10"
            >
              {chart.minElo}
            </text>
            <polyline
              fill="none"
              stroke="var(--ball)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={chart.poly}
            />
            {chart.dots.map((d, i) => (
              <circle
                key={i}
                cx={d.x}
                cy={d.y}
                r={i === chart.dots.length - 1 ? 3.5 : 2.75}
                fill="var(--ball)"
              />
            ))}
            {chart.xLabels.map((lab) => (
              <text
                key={`${lab.x}-${lab.text}`}
                x={lab.x}
                y={chart.h - 6}
                textAnchor="middle"
                className="fill-muted"
                fontSize="9"
              >
                {lab.text}
              </text>
            ))}
          </svg>
          <p className="mt-0.5 text-center text-[0.7rem] text-muted">
            Elo al cierre de cada día
          </p>
          <p className="mt-0.5 text-center text-[0.75rem] text-muted">
            {chart.lastElo} Elo
            {chart.delta !== 0 ? (
              <span
                className={
                  chart.delta > 0 ? "text-ok" : "text-danger"
                }
              >
                {" "}
                ({chart.delta > 0 ? "+" : ""}
                {chart.delta} en el rango)
              </span>
            ) : null}
          </p>
        </div>
      ) : (
        <p className="mt-3 rounded-xl bg-mist-2/60 px-3 py-6 text-center text-[0.85rem] text-muted">
          {history.length < 1
            ? "Todavía no hay suficiente historial de Elo."
            : "Sin Games en este rango."}
        </p>
      )}
    </div>
  );
}

function formatDayLabel(iso: string): string {
  const raw = dayLabelFmt.format(new Date(iso));
  return raw.charAt(0).toUpperCase() + raw.slice(1).replace(/\.$/, "");
}

/** Pick up to `max` evenly spaced indices, always including first and last. */
function labelIndices(n: number, max: number): number[] {
  if (n <= max) return Array.from({ length: n }, (_, i) => i);
  const out = new Set<number>([0, n - 1]);
  const inner = max - 2;
  for (let k = 1; k <= inner; k++) {
    out.add(Math.round((k * (n - 1)) / (inner + 1)));
  }
  return [...out].sort((a, b) => a - b);
}

function layoutChart(points: EloHistoryPoint[]) {
  if (points.length < 2) return null;

  const w = 320;
  const h = 168;
  const padL = 36;
  const padR = 14;
  const padT = 12;
  const padB = 28;
  const elos = points.map((p) => p.elo);
  let minElo = Math.min(...elos);
  let maxElo = Math.max(...elos);
  if (minElo === maxElo) {
    minElo -= 12;
    maxElo += 12;
  }
  const span = maxElo - minElo;
  // Equal spacing between play-days (not wall-clock gaps) so same-day
  // spikes disappear and the curve stays readable.
  const n = points.length;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const dots = points.map((p, i) => {
    const x = padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
    const y = padT + (1 - (p.elo - minElo) / span) * plotH;
    return { x, y };
  });
  const poly = dots.map((d) => `${d.x},${d.y}`).join(" ");
  const first = points[0]!.elo;
  const last = points[points.length - 1]!.elo;

  const xLabels = labelIndices(n, 5).map((i) => ({
    x: dots[i]!.x,
    text: formatDayLabel(points[i]!.at),
  }));

  return {
    w,
    h,
    padL,
    padR,
    padT,
    padB,
    minElo,
    maxElo,
    poly,
    dots,
    xLabels,
    lastElo: last,
    delta: last - first,
  };
}
