"use client";

import { useState } from "react";
import type { KpiData } from "@/lib/dashboard";
import { formatKpi, formatValue } from "@/lib/format";
import { MainChart } from "./MainChart";

/** Zmiana względem poprzedniego okresu. Procenty jako punkty procentowe; mała baza mówi „było N” zamiast krzyczeć. */
function Delta({ k }: { k: KpiData }) {
  const { value: cur, prev, unit, better } = k;
  if (cur === null || prev === null) return null;
  const title = `Poprzedni okres: ${formatValue(prev, unit)}`;
  if (unit === "szt." && prev < 5) return <span className="tnum shrink-0 whitespace-nowrap text-[12px] text-muted" title={title}>było {formatValue(prev, unit)}</span>;
  let diff: number;
  let text: string;
  if (unit === "%") {
    diff = cur - prev;
    const r = Math.round(diff * 10) / 10;
    if (r === 0) return <span className="shrink-0 whitespace-nowrap text-[12px] text-muted" title={title}>±0 pp</span>;
    text = `${r > 0 ? "+" : "−"}${Math.abs(r).toLocaleString("pl-PL")} pp`;
  } else {
    if (!prev) return null;
    diff = ((cur - prev) / Math.abs(prev)) * 100;
    const r = Math.round(diff);
    if (r === 0) return <span className="shrink-0 whitespace-nowrap text-[12px] text-muted" title={title}>±0%</span>;
    text = Math.abs(diff) > 999 ? (diff > 0 ? "10×+" : "−99%") : `${r > 0 ? "+" : "−"}${Math.abs(r)}%`;
  }
  const good = better === "lower" ? diff < 0 : diff > 0;
  return <span className={`tnum shrink-0 whitespace-nowrap text-[12px] font-medium ${good ? "text-up" : "text-down"}`} title={title}>{text}</span>;
}

function Spark({ values, color }: { values: (number | null)[]; color: string }) {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length < 2) return <div className="h-8" />;
  const max = Math.max(...nums), min = Math.min(0, ...nums);
  const x = (i: number) => (values.length === 1 ? 50 : (i / (values.length - 1)) * 100);
  const y = (v: number) => 30 - ((v - min) / (max - min || 1)) * 28;
  const segments: string[] = [];
  let d = "";
  values.forEach((v, i) => {
    if (v === null) { if (d) segments.push(d); d = ""; return; }
    d += `${d ? "L" : "M"}${x(i).toFixed(2)} ${y(v).toFixed(2)}`;
  });
  if (d) segments.push(d);
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="mt-2 h-8 w-full" aria-hidden>
      {segments.map((s) => <path key={s} d={s} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />)}
    </svg>
  );
}

interface Props {
  kpis: KpiData[];
  labels: string[];
  axisLabels: string[];
  prevLabels: string[];
  partialLast: boolean;
  previousLabel: string;
  empty: React.ReactNode;
}

export function Overview({ kpis, labels, axisLabels, prevLabels, partialLast, previousLabel, empty }: Props) {
  const [selected, setSelected] = useState(kpis[0].key);
  const k = kpis.find((x) => x.key === selected) ?? kpis[0];
  const colorOf = (x: KpiData) => (x.money ? "rgb(var(--money))" : "rgb(var(--accent))");

  return (
    <section className="card overflow-hidden">
      {/* Linie między kafelkami = przerwa 1 px na tle w kolorze linii. */}
      <div className="grid grid-cols-2 gap-px border-b border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((x) => {
          const on = x.key === k.key;
          return (
            <button
              key={x.key}
              aria-pressed={on}
              onClick={() => setSelected(x.key)}
              className="group relative bg-card p-2 text-left focus-visible:outline-none"
            >
              <div
                className={`h-full rounded-xl px-3 py-3 transition-colors group-focus-visible:ring-2 group-focus-visible:ring-accent ${
                  on ? (x.money ? "bg-money/[.07] ring-1 ring-inset ring-money/30" : "bg-accent/[.12] ring-1 ring-inset ring-accent/40") : "group-hover:bg-soft/70"
                }`}
              >
                <div className={`flex items-center justify-between gap-2 text-[13px] ${on ? "font-medium text-ink" : "text-ink-2"}`}>
                  <span className="truncate" title={x.label}>{x.label}</span>
                  <Delta k={x} />
                </div>
                <div className={`tnum mt-1 truncate font-display text-[22px] font-extrabold sm:text-[28px] leading-[1.1] tracking-[-.02em] ${on ? (x.money ? "text-brown" : "text-ink") : "text-ink-2"}`} title={formatValue(x.value, x.unit)}>
                  {formatKpi(x.value, x.unit)}
                </div>
                <div className="mt-0.5 line-clamp-2 min-h-[2lh] text-[12px] leading-snug text-muted">{x.hint}</div>
                <Spark values={x.series} color={on ? colorOf(x) : "rgb(var(--muted))"} />
              </div>
            </button>
          );
        })}
      </div>

      <div className="relative p-4 sm:p-6">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[16px] font-bold">{k.label}</h2>
          <div className="flex items-center gap-4 text-[12px] text-muted">
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded" style={{ background: colorOf(k) }} />Ten okres</span>
            <span className="flex items-center gap-1.5"><span className="w-4 border-t border-dashed border-muted" />{previousLabel}</span>
          </div>
        </div>
        <MainChart
          series={k.series}
          prevSeries={k.prevSeries}
          labels={labels}
          axisLabels={axisLabels}
          prevLabels={prevLabels}
          unit={k.unit}
          color={colorOf(k)}
          better={k.better}
          partialLast={partialLast}
        />
        {empty}
      </div>
    </section>
  );
}
