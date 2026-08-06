"use client";

import { useMemo, useState } from "react";
import {
  buildEloHistoryForChart,
  type EloHistoryPoint,
  type EloHistoryRange,
  type SessionEloPathSeries,
} from "@/lib/ranking/playerStats";
import { APP_TIMEZONE } from "@/lib/timezone";

const ELO_BASELINE = 1000;

/** High-contrast palette for dark UI — spaced hues, stable per playerId. */
const PATH_COLORS = [
  "#c6e84a", // lime (brand)
  "#64d2ff", // sky
  "#ff9f0a", // orange
  "#bf5af2", // purple
  "#30d158", // green
  "#ff375f", // rose
  "#5e5ce6", // indigo
  "#ffd60a", // gold
  "#40c8e0", // teal
  "#ff6482", // pink
];

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

export function SessionEloPathsChart({
  series,
  variant = "fecha",
  now,
}: {
  series: SessionEloPathSeries[];
  /** fecha = Games of one Fecha. career = Fechas of the group (ranking). */
  variant?: "fecha" | "career";
  now?: Date;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [range, setRange] = useState<EloHistoryRange>("all");
  const isFecha = variant === "fecha";

  const displayed = useMemo(() => {
    if (isFecha) return series;
    const clock = now ?? new Date();
    return series.map((s) => {
      const points = buildEloHistoryForChart(s.points, range, clock);
      return {
        ...s,
        points,
        eloStart: points[0]?.elo ?? s.eloStart,
        eloEnd: points[points.length - 1]?.elo ?? s.eloEnd,
      };
    });
  }, [series, isFecha, range, now]);

  const chart = useMemo(
    () => layoutMultiChart(displayed, isFecha ? "fecha" : "career"),
    [displayed, isFecha],
  );
  const colorById = useMemo(() => {
    const ids = series.map((s) => s.playerId).sort();
    const map = new Map<string, string>();
    ids.forEach((id, i) => {
      map.set(id, PATH_COLORS[i % PATH_COLORS.length]!);
    });
    return map;
  }, [series]);

  const emptyHint = isFecha
    ? series.length < 1
      ? "Sin Games terminados en esta Fecha."
      : "Sin Games terminados en esta Fecha."
    : series.length < 1
      ? "Todavía no hay suficiente historial de Elo."
      : "Sin Fechas en este rango.";

  if (!chart) {
    return (
      <div>
        {!isFecha ? (
          <div className="mb-3 inline-flex gap-0.5 rounded-xl bg-mist-2/70 p-0.5">
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
        <p className="rounded-xl bg-mist-2/60 px-3 py-6 text-center text-[0.85rem] text-muted">
          {emptyHint}
        </p>
      </div>
    );
  }

  const activeIndex =
    hovered != null
      ? Math.min(Math.max(hovered, 0), chart.xCount - 1)
      : null;

  function handlePointer(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    const idx = Math.round(frac * (chart!.xCount - 1));
    setHovered(Math.min(Math.max(idx, 0), chart!.xCount - 1));
  }

  const tooltipRows =
    activeIndex != null
      ? displayed
          .map((s) => ({
            playerId: s.playerId,
            displayName: s.displayName,
            elo: s.points[activeIndex]!.elo,
            color: colorById.get(s.playerId) ?? PATH_COLORS[0]!,
          }))
          .sort((a, b) => b.elo - a.elo)
      : [];

  const axisPoint = displayed[0]!.points[activeIndex ?? 0]!;

  return (
    <div>
      {!isFecha ? (
        <div className="mb-3 inline-flex gap-0.5 rounded-xl bg-mist-2/70 p-0.5">
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

      <div className="relative rounded-2xl bg-gradient-to-b from-mist-2/40 to-transparent px-1 pb-1 pt-3">
        <svg
          viewBox={`0 0 ${chart.w} ${chart.h}`}
          className="h-60 w-full touch-none"
          role="img"
          aria-label={
            isFecha
              ? "Trayectorias de Elo de todos los jugadores en la Fecha"
              : "Trayectorias de Elo del ranking por Fecha"
          }
          onPointerMove={handlePointer}
          onPointerDown={handlePointer}
          onPointerLeave={() => setHovered(null)}
        >
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

          {chart.lines.map((line) => {
            const color = colorById.get(line.playerId) ?? PATH_COLORS[0]!;
            return (
              <g key={line.playerId}>
                <path
                  d={line.path}
                  fill="none"
                  stroke={color}
                  strokeWidth="2.25"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
                {line.dots.map((d, i) => {
                  const isLast = i === line.dots.length - 1;
                  const isActive = i === activeIndex;
                  if (!isLast && !isActive) {
                    return (
                      <circle
                        key={i}
                        cx={d.x}
                        cy={d.y}
                        r={2}
                        fill={color}
                        fillOpacity={0.55}
                      />
                    );
                  }
                  return (
                    <g key={i}>
                      <circle
                        cx={d.x}
                        cy={d.y}
                        r={5.5}
                        fill={color}
                        fillOpacity={0.18}
                      />
                      <circle
                        cx={d.x}
                        cy={d.y}
                        r={3.25}
                        fill={color}
                        stroke="var(--sand)"
                        strokeWidth="1.5"
                      />
                    </g>
                  );
                })}
              </g>
            );
          })}

          {activeIndex != null ? (
            <line
              x1={chart.xOf(activeIndex)}
              y1={chart.padT}
              x2={chart.xOf(activeIndex)}
              y2={chart.h - chart.padB}
              stroke="currentColor"
              strokeOpacity={0.18}
              vectorEffect="non-scaling-stroke"
            />
          ) : null}

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

        {activeIndex != null ? (
          <div
            className="pointer-events-none absolute z-10 max-w-[11rem] -translate-x-1/2 -translate-y-full rounded-lg bg-mist px-2 py-1.5 shadow-lg ring-1 ring-ink/10"
            style={{
              left: `${(chart.xOf(activeIndex) / chart.w) * 100}%`,
              top: `${(chart.padT / chart.h) * 100}%`,
              marginTop: "-4px",
            }}
          >
            <p className="mb-1 text-[0.65rem] font-medium text-muted">
              {formatTooltipLabel(axisPoint, isFecha ? "fecha" : "career")}
            </p>
            <ul className="space-y-0.5">
              {tooltipRows.map((r) => (
                <li
                  key={r.playerId}
                  className="flex items-center gap-1.5 text-[0.75rem] leading-none"
                >
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ background: r.color }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-ink">
                    {r.displayName}
                  </span>
                  <span className="shrink-0 tabular-nums font-semibold text-ink">
                    {r.elo}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
        {displayed.map((s) => {
          const color = colorById.get(s.playerId) ?? PATH_COLORS[0]!;
          const delta = s.eloEnd - s.eloStart;
          return (
            <li
              key={s.playerId}
              className="inline-flex items-center gap-1.5 text-[0.75rem] text-muted"
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: color }}
                aria-hidden
              />
              <span className="max-w-[8rem] truncate text-ink">
                {s.displayName}
              </span>
              <span className="tabular-nums">{s.eloEnd}</span>
              {delta !== 0 ? (
                <span
                  className={`tabular-nums font-medium ${
                    delta > 0 ? "text-ok" : "text-danger"
                  }`}
                >
                  {delta > 0 ? "+" : ""}
                  {delta}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>

      <p className="mt-2 text-[0.7rem] text-muted">
        {isFecha
          ? "Inicio · un punto por Game · Elo se arrastra si no jugó"
          : "Desde 1000 · por Fecha del grupo · Elo se arrastra si no jugó"}
      </p>
    </div>
  );
}

function formatPointLabel(
  p: EloHistoryPoint,
  variant: "fecha" | "career",
): string {
  if (p.label) return p.label;
  if (p.isStart) return "Inicio";
  if (variant === "fecha" && p.gameIndex != null) return `G${p.gameIndex}`;
  const raw = dayLabelFmt.format(new Date(p.at));
  return raw.charAt(0).toUpperCase() + raw.slice(1).replace(/\.$/, "");
}

function formatTooltipLabel(
  p: EloHistoryPoint,
  variant: "fecha" | "career",
): string {
  if (p.isStart) {
    return variant === "fecha" ? `Inicio (${p.elo})` : "Inicio (1000)";
  }
  if (variant === "fecha" && p.gameIndex != null) {
    return `Game ${p.gameIndex}`;
  }
  return tooltipDateFmt.format(new Date(p.at));
}

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

function straightLinePath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  return pts
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${Math.round(p.x * 100) / 100} ${Math.round(p.y * 100) / 100}`,
    )
    .join(" ");
}

function layoutMultiChart(
  series: SessionEloPathSeries[],
  variant: "fecha" | "career",
) {
  if (series.length === 0) return null;
  const xCount = series[0]!.points.length;
  if (xCount < 2) return null;
  if (series.some((s) => s.points.length !== xCount)) return null;

  const w = 340;
  const h = 220;
  const padL = 34;
  const padR = 14;
  /** Extra top pad so hover tooltips (above the guide) stay inside the SVG. */
  const padT = 52;
  const padB = 26;

  const elos = series.flatMap((s) => s.points.map((p) => p.elo));
  const rawMin = Math.min(...elos);
  const rawMax = Math.max(...elos);
  const { niceMin, niceMax, values } = niceScale(
    rawMin === rawMax ? rawMin - 12 : rawMin,
    rawMin === rawMax ? rawMax + 12 : rawMax,
    4,
  );
  const domain = Math.max(niceMax - niceMin, 1);
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const yOf = (elo: number) =>
    padT + (1 - (elo - niceMin) / domain) * plotH;
  const xOf = (i: number) =>
    padL + (xCount === 1 ? plotW / 2 : (i / (xCount - 1)) * plotW);

  const lines = series.map((s) => {
    const dots = s.points.map((p, i) => ({ x: xOf(i), y: yOf(p.elo) }));
    return {
      playerId: s.playerId,
      dots,
      path: straightLinePath(dots),
    };
  });

  const ticks = values.map((value) => ({ value, y: yOf(value) }));
  const baselineY =
    ELO_BASELINE >= niceMin && ELO_BASELINE <= niceMax
      ? yOf(ELO_BASELINE)
      : null;

  const axisPoints = series[0]!.points;
  const maxLabels = variant === "fecha" ? 6 : 5;
  const xLabels = labelIndices(xCount, maxLabels).map((i) => ({
    x: xOf(i),
    text: formatPointLabel(axisPoints[i]!, variant),
  }));

  return {
    w,
    h,
    padL,
    padR,
    padT,
    padB,
    xCount,
    xOf,
    ticks,
    baselineY,
    lines,
    xLabels,
  };
}
