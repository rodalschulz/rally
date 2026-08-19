"use client";

import { useMemo, useRef, useState } from "react";
import type { EloHistoryPoint, EloHistoryRange } from "@/lib/ranking/playerStats";
import { buildEloHistoryForChart } from "@/lib/ranking/playerStats";
import { APP_TIMEZONE } from "@/lib/timezone";
import { useClampedChartTooltip } from "./useClampedChartTooltip";
import { useChartScrub } from "./useChartScrub";

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

const tooltipDateFmt = new Intl.DateTimeFormat("es-PE", {
  timeZone: APP_TIMEZONE,
  day: "numeric",
  month: "long",
});

const ELO_BASELINE = 1000;

export function EloHistoryChart({
  history,
  now,
  /** Career = Fechas del grupo + rangos. Fecha = Games de una Fecha (sin rangos). */
  variant = "career",
}: {
  history: EloHistoryPoint[];
  now?: Date;
  variant?: "career" | "fecha";
}) {
  const [range, setRange] = useState<EloHistoryRange>("all");
  const [hovered, setHovered] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const isFecha = variant === "fecha";

  const points = useMemo(
    () =>
      isFecha
        ? history.slice()
        : buildEloHistoryForChart(history, range, now ?? new Date()),
    [history, range, now, isFecha],
  );

  const chart = useMemo(
    () => layoutChart(points, isFecha ? "fecha" : "career"),
    [points, isFecha],
  );

  const activeIndex =
    chart && hovered != null
      ? Math.min(Math.max(hovered, 0), chart.dots.length - 1)
      : null;

  const pointXRatio =
    chart && activeIndex != null
      ? chart.dots[activeIndex]!.x / chart.w
      : null;
  const { containerRef, tooltipRef } = useClampedChartTooltip(pointXRatio, {
    lift: true,
  });
  const { surfaceRef, surfaceProps } = useChartScrub(
    chart?.dots.length ?? 0,
    setHovered,
  );

  return (
    <div>
      {!isFecha ? (
        <div className="inline-flex gap-0.5 rounded-xl bg-mist-2/70 p-0.5">
          {RANGES.map((r) => {
            const active = range === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setRange(r.id)}
                className={`rounded-lg px-2.5 py-1 text-[0.75rem] font-medium transition ${
                  active
                    ? "bg-sand text-ink shadow-sm"
                    : "text-muted hover:text-ink"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {chart ? (
        <div className={isFecha ? "" : "mt-3"}>
          <div
            ref={containerRef}
            className="relative overflow-x-clip rounded-2xl bg-gradient-to-b from-mist-2/40 to-transparent p-1"
          >
            <div
              ref={surfaceRef}
              className="touch-none overscroll-none [overflow-anchor:none]"
              style={{ touchAction: "none" }}
              {...surfaceProps}
            >
            <svg
              ref={svgRef}
              viewBox={`0 0 ${chart.w} ${chart.h}`}
              className="pointer-events-none h-48 w-full"
              role="img"
              aria-label={
                isFecha
                  ? "Historial de Elo por Game de la Fecha"
                  : "Historial de Elo por Fecha"
              }
            >
              <defs>
                <linearGradient id="eloArea" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--ball)"
                    stopOpacity="0.32"
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--ball)"
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>

              {/* Horizontal gridlines + y labels */}
              {chart.ticks.map((t) => (
                <g key={t.value}>
                  <line
                    x1={chart.padL}
                    y1={t.y}
                    x2={chart.w - chart.padR}
                    y2={t.y}
                    stroke="currentColor"
                    strokeOpacity={0.07}
                    vectorEffect="non-scaling-stroke"
                  />
                  <text
                    x={chart.padL - 7}
                    y={t.y + 3}
                    textAnchor="end"
                    className="fill-muted"
                    fontSize="9"
                  >
                    {t.value}
                  </text>
                </g>
              ))}

              {/* Baseline at 1000 */}
              {chart.baselineY != null ? (
                <line
                  x1={chart.padL}
                  y1={chart.baselineY}
                  x2={chart.w - chart.padR}
                  y2={chart.baselineY}
                  stroke="currentColor"
                  strokeOpacity={0.22}
                  strokeDasharray="3 4"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}

              {/* Area + line */}
              <path d={chart.areaPath} fill="url(#eloArea)" />
              <path
                d={chart.linePath}
                fill="none"
                stroke="var(--ball)"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />

              {/* Hover guide */}
              {activeIndex != null ? (
                <line
                  x1={chart.dots[activeIndex]!.x}
                  y1={chart.padT}
                  x2={chart.dots[activeIndex]!.x}
                  y2={chart.h - chart.padB}
                  stroke="currentColor"
                  strokeOpacity={0.18}
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}

              {/* Points */}
              {chart.dots.map((d, i) => {
                const isLast = i === chart.dots.length - 1;
                const isActive = i === activeIndex;
                if (!isLast && !isActive) {
                  return (
                    <circle
                      key={i}
                      cx={d.x}
                      cy={d.y}
                      r={2}
                      fill="var(--ball)"
                      fillOpacity={0.5}
                    />
                  );
                }
                return (
                  <g key={i}>
                    <circle
                      cx={d.x}
                      cy={d.y}
                      r={6}
                      fill="var(--ball)"
                      fillOpacity={0.16}
                    />
                    <circle
                      cx={d.x}
                      cy={d.y}
                      r={3.5}
                      fill="var(--ball)"
                      stroke="var(--sand)"
                      strokeWidth="1.5"
                    />
                  </g>
                );
              })}

              {/* X labels */}
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
            </div>

            {/* Tooltip */}
            {activeIndex != null ? (
              <div
                ref={tooltipRef}
                className="pointer-events-none absolute z-10 max-w-[calc(100%-1rem)] rounded-lg bg-mist px-2 py-1 text-center shadow-lg ring-1 ring-ink/10"
                style={{
                  left: `${(chart.dots[activeIndex]!.x / chart.w) * 100}%`,
                  top: `${(chart.dots[activeIndex]!.y / chart.h) * 100}%`,
                  marginTop: "-8px",
                }}
              >
                <p className="text-[0.9rem] font-semibold leading-none text-ink">
                  {points[activeIndex]!.elo}
                </p>
                <p className="mt-0.5 text-[0.65rem] leading-none text-muted">
                  {formatTooltipDate(
                    points[activeIndex]!,
                    isFecha ? "fecha" : "career",
                  )}
                </p>
              </div>
            ) : null}
          </div>

          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-[0.7rem] text-muted">
              {isFecha
                ? "Inicio · un punto por Game"
                : "Desde 1000 · por Fecha del grupo"}
            </p>
            <p className="text-[0.8rem] font-medium text-ink">
              {chart.lastElo}
              <span className="text-[0.7rem] font-normal text-muted"> Elo</span>
              {chart.delta !== 0 ? (
                <span
                  className={`ml-1 text-[0.75rem] font-semibold ${
                    chart.delta > 0 ? "text-ok" : "text-danger"
                  }`}
                >
                  {chart.delta > 0 ? "+" : ""}
                  {chart.delta}
                </span>
              ) : null}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-3 rounded-xl bg-mist-2/60 px-3 py-6 text-center text-[0.85rem] text-muted">
          {history.length < 1
            ? "Todavía no hay suficiente historial de Elo."
            : isFecha
              ? "Sin Games terminados en esta Fecha."
              : "Sin Games en este rango."}
        </p>
      )}
    </div>
  );
}

function formatPointLabel(
  p: EloHistoryPoint,
  variant: "career" | "fecha",
): string {
  if (p.label) return p.label;
  if (p.isStart) return "Inicio";
  if (variant === "fecha" && p.gameIndex != null) return `G${p.gameIndex}`;
  const raw = dayLabelFmt.format(new Date(p.at));
  return raw.charAt(0).toUpperCase() + raw.slice(1).replace(/\.$/, "");
}

function formatTooltipDate(
  p: EloHistoryPoint,
  variant: "career" | "fecha",
): string {
  if (p.isStart) {
    return variant === "fecha" ? `Inicio (${p.elo})` : "Inicio (1000)";
  }
  if (variant === "fecha" && p.gameIndex != null) {
    return `Game ${p.gameIndex}`;
  }
  return tooltipDateFmt.format(new Date(p.at));
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

function niceNum(range: number, round: boolean): number {
  const exp = Math.floor(Math.log10(range));
  const frac = range / 10 ** exp;
  let nice: number;
  if (round) {
    if (frac < 1.5) nice = 1;
    else if (frac < 3) nice = 2;
    else if (frac < 7) nice = 5;
    else nice = 10;
  } else {
    if (frac <= 1) nice = 1;
    else if (frac <= 2) nice = 2;
    else if (frac <= 5) nice = 5;
    else nice = 10;
  }
  return nice * 10 ** exp;
}

/** "Nice" rounded axis bounds + step for readable gridlines. */
function niceScale(min: number, max: number, maxTicks = 4) {
  const range = niceNum(Math.max(max - min, 1), false);
  const step = niceNum(range / Math.max(maxTicks - 1, 1), true);
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const values: number[] = [];
  for (let v = niceMin; v <= niceMax + step * 0.5; v += step) {
    values.push(Math.round(v));
  }
  return { niceMin, niceMax, values };
}

/** Straight line segments through all points (precise, no smoothing). */
function straightLinePath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  return pts
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${round2(p.x)} ${round2(p.y)}`,
    )
    .join(" ");
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function layoutChart(
  points: EloHistoryPoint[],
  variant: "career" | "fecha",
) {
  if (points.length < 2) return null;

  const w = 340;
  const h = 176;
  const padL = 34;
  const padR = 14;
  const padT = 14;
  const padB = 26;
  const elos = points.map((p) => p.elo);
  const rawMin = Math.min(...elos);
  const rawMax = Math.max(...elos);
  const { niceMin, niceMax, values } = niceScale(
    rawMin === rawMax ? rawMin - 12 : rawMin,
    rawMin === rawMax ? rawMax + 12 : rawMax,
    4,
  );
  const domain = Math.max(niceMax - niceMin, 1);

  const n = points.length;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const yOf = (elo: number) =>
    padT + (1 - (elo - niceMin) / domain) * plotH;

  const dots = points.map((p, i) => ({
    x: padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW),
    y: yOf(p.elo),
  }));

  const linePath = straightLinePath(dots);
  const areaPath = `${linePath} L ${round2(dots[dots.length - 1]!.x)} ${h - padB} L ${round2(dots[0]!.x)} ${h - padB} Z`;

  const first = points[0]!.elo;
  const last = points[points.length - 1]!.elo;

  const ticks = values.map((value) => ({ value, y: yOf(value) }));
  const baselineY =
    ELO_BASELINE >= niceMin && ELO_BASELINE <= niceMax
      ? yOf(ELO_BASELINE)
      : null;

  const maxLabels = variant === "fecha" ? 6 : 5;
  const xLabels = labelIndices(n, maxLabels).map((i) => ({
    x: dots[i]!.x,
    text: formatPointLabel(points[i]!, variant),
  }));

  return {
    w,
    h,
    padL,
    padR,
    padT,
    padB,
    ticks,
    baselineY,
    linePath,
    areaPath,
    dots,
    xLabels,
    lastElo: last,
    delta: last - first,
  };
}
