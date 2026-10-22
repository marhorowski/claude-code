"use client";

import { useEffect, useRef, useState } from "react";
import { formatAxis, formatValue, niceTicks } from "@/lib/format";

interface Props {
  series: (number | null)[];
  prevSeries: (number | null)[];
  labels: string[];
  axisLabels: string[];
  prevLabels: string[];
  unit: string;
  color: string;
  better: "higher" | "lower";
  /** Ostatni punkt to niepełny okres (dziś) — rysowany kropkowaną linią. */
  partialLast: boolean;
}

const H = 240;
const PAD = { top: 12, right: 12, bottom: 28, left: 52 };

/** Odcinki ciągłe między punktami z danymi; null przerywa linię. */
function segments(values: (number | null)[], x: (i: number) => number, y: (v: number) => number, upTo = values.length) {
  const out: { d: string; first: number; last: number }[] = [];
  let cur: { d: string; first: number; last: number } | null = null;
  values.slice(0, upTo).forEach((v, i) => {
    if (v === null) { if (cur) out.push(cur); cur = null; return; }
    if (!cur) cur = { d: `M${x(i)} ${y(v)}`, first: i, last: i };
    else { cur.d += `L${x(i)} ${y(v)}`; cur.last = i; }
  });
  if (cur) out.push(cur);
  return out;
}

export function MainChart({ series, prevSeries, labels, axisLabels, prevLabels, unit, color, better, partialLast }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // Szerokość znana dopiero po zmierzeniu; do tego czasu pusty obszar tej samej wysokości (bez skoku układu).
  const [measured, setMeasured] = useState<number | null>(null);
  const width = measured ?? 800;
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setMeasured(Math.max(280, el.getBoundingClientRect().width));
    const ro = new ResizeObserver(([e]) => setMeasured(Math.max(280, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = series.length;
  const all = [...series, ...prevSeries.slice(0, n)].filter((v): v is number => v !== null);
  const ticks = niceTicks(Math.max(0, ...all));
  const top = ticks.at(-1) || 1;
  const innerW = width - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / top) * innerH;

  // Niepełny ostatni okres: główna linia do przedostatniego punktu, końcówka kropkami.
  const solidUpTo = partialLast && n > 1 ? n - 1 : n;
  const cur = segments(series, x, y, solidUpTo);
  const prev = segments(prevSeries.slice(0, n), x, y);
  const tail = partialLast && n > 1 && series[n - 2] !== null && series[n - 1] !== null
    ? `M${x(n - 2)} ${y(series[n - 2]!)}L${x(n - 1)} ${y(series[n - 1]!)}` : null;

  const tickEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(innerW / 90))));
  const gradId = `grad-${unit.replace(/\W/g, "")}`;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    const i = n <= 1 ? 0 : Math.round(((px - PAD.left) / innerW) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, i)));
  };

  const hv = hover !== null ? series[hover] : null;
  const hp = hover !== null ? prevSeries[hover] ?? null : null;
  let change: string | null = null;
  let tone = "text-muted";
  if (hv !== null && hp !== null && hp !== undefined) {
    const d = unit === "%" ? Math.round((hv - hp) * 10) / 10 : hp ? Math.round(((hv - hp) / Math.abs(hp)) * 100) : null;
    const suffix = unit === "%" ? " pp" : "%";
    if (d === 0) change = `±0${suffix}`;
    else if (d !== null) {
      change = `${d > 0 ? "+" : "−"}${Math.abs(d).toLocaleString("pl-PL")}${suffix}`;
      tone = (better === "lower" ? d < 0 : d > 0) ? "text-up" : "text-down";
    }
  }

  return (
    <div ref={ref} className="relative touch-pan-y" style={{ minHeight: H }}>
      {measured !== null && <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${width} ${H}`}
        role="img"
        aria-label="Wykres wybranego wskaźnika w czasie"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        className="block"
      >
        <defs>
          <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.15" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--line)" />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className="tnum fill-muted text-[11px]">{formatAxis(t, unit)}</text>
          </g>
        ))}
        {axisLabels.map((l, i) =>
          i % tickEvery === 0 ? (
            <text key={i} x={x(i)} y={H - 8} textAnchor={n > 1 && i === 0 ? "start" : n > 1 && i === n - 1 ? "end" : "middle"} className="fill-muted text-[11px]">{l}</text>
          ) : null,
        )}

        {prev.map((s) => <path key={`p${s.first}`} d={s.d} fill="none" stroke="rgb(var(--muted))" strokeOpacity="0.6" strokeWidth="1.5" strokeDasharray="4 4" />)}
        {cur.map((s) => (
          <g key={`c${s.first}`}>
            {s.last > s.first && <path d={`${s.d}L${x(s.last)} ${y(0)}L${x(s.first)} ${y(0)}Z`} fill={`url(#${gradId})`} />}
            <path d={s.d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
            {s.first === s.last && <circle cx={x(s.first)} cy={y(series[s.first]!)} r="3" fill={color} />}
          </g>
        ))}
        {tail && <path d={tail} fill="none" stroke={color} strokeWidth="2" strokeDasharray="2 4" strokeLinecap="round" />}

        {hover !== null && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--line-strong)" />
            {hp !== null && hp !== undefined && <circle cx={x(hover)} cy={y(hp)} r="3" fill="rgb(var(--card))" stroke="rgb(var(--muted))" strokeWidth="1.5" />}
            {hv !== null && <circle cx={x(hover)} cy={y(hv)} r="4" fill={color} stroke="rgb(var(--card))" strokeWidth="2" />}
          </g>
        )}
      </svg>}

      {hover !== null && (
        <div
          className="pointer-events-none absolute top-2 z-10 min-w-[180px] rounded-xl bg-card px-3 py-2 text-[12.5px] shadow-pop"
          style={x(hover) > width / 2 ? { right: width - x(hover) + 12 } : { left: x(hover) + 12 }}
        >
          <div className="mb-1 font-medium">{labels[hover]}{partialLast && hover === n - 1 ? " (w toku)" : ""}</div>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: color }} />Ten okres</span>
            <span className="tnum font-medium">{formatValue(hv, unit)}</span>
          </div>
          {prevLabels[hover] && (
            <div className="mt-0.5 flex items-center justify-between gap-4 text-muted">
              <span>{prevLabels[hover]}</span>
              <span className="tnum">{formatValue(hp ?? null, unit)}</span>
            </div>
          )}
          {change && <div className={`tnum mt-1 text-right font-medium ${tone}`}>{change}</div>}
        </div>
      )}
    </div>
  );
}
