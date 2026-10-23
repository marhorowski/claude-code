"use client";

import { useEffect, useRef, useState } from "react";
import type { Grouping } from "@/lib/periods";
import { daysInRange, formatDay } from "@/lib/periods";
import { rangeLabel, rangePresets } from "@/lib/ranges";
import { RangeCalendar } from "./RangeCalendar";
import { usePending } from "./Pending";

const GROUPINGS: { key: Grouping; label: string }[] = [
  { key: "day", label: "Dni" },
  { key: "week", label: "Tygodnie" },
  { key: "month", label: "Miesiące" },
];

interface Props {
  views: { key: string; label: string }[];
  view: string;
  from: string;
  to: string;
  grouping: Grouping;
  today: string;
}

/** Segmentowy przełącznik, który się zwęża (z obcięciem tekstu), zamiast przewijać na boki. */
function Segmented<T extends string>({ items, value, onChange, label, className = "" }: { items: { key: T; label: string }[]; value: T; onChange: (v: T) => void; label: string; className?: string }) {
  return (
    <div role="tablist" aria-label={label} className={`flex min-w-0 rounded-xl bg-soft p-1 ${className}`}>
      {items.map((it) => (
        <button
          key={it.key}
          role="tab"
          aria-selected={it.key === value}
          title={it.label}
          onClick={() => onChange(it.key)}
          className={`min-w-0 flex-1 truncate rounded-lg px-3 py-1.5 text-[13px] font-medium sm:flex-none ${
            it.key === value ? "bg-card text-ink shadow-card ring-1 ring-line" : "text-muted hover:text-ink"
          }`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function DashboardHeader({ views, view, from, to, grouping, today }: Props) {
  const { navigate } = usePending();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [draft, setDraft] = useState({ from: "", to: "" });
  const box = useRef<HTMLDivElement>(null);

  const go = (next: Partial<{ view: string; from: string; to: string; group: Grouping }>) => {
    const p = new URLSearchParams({ view, from, to, group: grouping, ...next });
    navigate(`/panel?${p}`);
  };

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const presets = rangePresets(today);
  const activePreset = presets.find((p) => p.from === from && p.to === to);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Segmented
        label="Widok"
        items={[...views, { key: "realizacja", label: "Realizacja celu" }]}
        value={view}
        onChange={(v) => (v === "realizacja" ? navigate("/panel/realizacja") : go({ view: v }))}
        className="w-full sm:w-auto"
      />

      <div className="flex w-full min-w-0 items-center gap-2 sm:ml-auto sm:w-auto">
        <div ref={box} className="relative shrink-0">
          <button
            onClick={() => { setOpen((o) => !o); setCustom(false); }}
            aria-expanded={open}
            aria-label="Zakres dat"
            className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-line bg-card px-3 py-2 text-[13px] font-medium shadow-card hover:bg-soft"
          >
            <span className="tnum">{rangeLabel(from, to, today)}</span>
            <span aria-hidden className="text-muted">▾</span>
          </button>

          {open && (
            <div className="fixed inset-x-0 bottom-0 z-30 rounded-t-2xl bg-card p-3 shadow-pop sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[300px] sm:rounded-2xl">
              {!custom ? (
                <ul className="text-[13.5px]">
                  {presets.map((p, i) => (
                    <li key={p.key} className={i === 5 ? "mt-1 border-t border-line pt-1" : ""}>
                      <button
                        onClick={() => { setOpen(false); go({ from: p.from, to: p.to, group: p.grouping }); }}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-soft"
                      >
                        {p.label}
                        {activePreset?.key === p.key && <span className="text-brown">✓</span>}
                      </button>
                    </li>
                  ))}
                  <li className="mt-1 border-t border-line pt-1">
                    <button
                      onClick={() => { setCustom(true); setDraft({ from, to }); }}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-soft"
                    >
                      Własny zakres…
                      {!activePreset && <span className="text-brown">✓</span>}
                    </button>
                  </li>
                </ul>
              ) : (
                <div className="space-y-3 p-1">
                  <button onClick={() => setCustom(false)} className="text-[13px] text-muted hover:text-ink">‹ Zakresy</button>
                  <RangeCalendar from={draft.from} to={draft.to} max={today} onChange={(f, t) => setDraft({ from: f, to: t })} />
                  <div className="flex items-center justify-between gap-2 border-t border-line pt-3 text-[12.5px] text-muted">
                    <span className="tnum">
                      {draft.from && draft.to ? `${formatDay(draft.from)} – ${formatDay(draft.to)} · ${daysInRange(draft.from, draft.to)} dni` : "Wybierz pierwszy i ostatni dzień"}
                    </span>
                    <button
                      disabled={!draft.from || !draft.to}
                      onClick={() => { setOpen(false); go({ from: draft.from, to: draft.to }); }}
                      className="btn-primary px-3 py-1.5 text-[13px]"
                    >
                      Zastosuj
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <Segmented label="Podział" items={GROUPINGS} value={grouping} onChange={(g) => go({ group: g })} className="flex-1 sm:flex-none" />
      </div>
    </div>
  );
}
