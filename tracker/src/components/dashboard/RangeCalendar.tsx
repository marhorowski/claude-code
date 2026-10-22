"use client";

import { useState } from "react";

const DAY = 864e5;
const ymd = (t: number) => new Date(t).toISOString().slice(0, 10);
const monthOf = (d: string) => `${d.slice(0, 7)}-01`;
const addMonths = (first: string, n: number) => {
  const d = new Date(first);
  d.setUTCMonth(d.getUTCMonth() + n);
  return ymd(d.getTime());
};
const MONTHS = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
const WEEKDAYS = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

/** Jeden miesiąc, od poniedziałku. Klik w pierwszy dzień, potem w ostatni; klik przed początkiem przesuwa początek. */
export function RangeCalendar({ from, to, max, onChange }: { from: string; to: string; max: string; onChange: (from: string, to: string) => void }) {
  const [month, setMonth] = useState(() => monthOf(to || from || max));
  const [hover, setHover] = useState("");
  const start = Date.parse(month);
  const lead = (new Date(start).getUTCDay() + 6) % 7;
  const days = Array.from({ length: 42 }, (_, i) => ymd(start + (i - lead) * DAY)); // 6 wierszy: bez skakania wysokości
  const end = to || (from && hover > from ? hover : "");
  const pick = (d: string) => (!from || to || d < from ? onChange(d, "") : onChange(from, d));
  const title = `${MONTHS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;

  return (
    <div className="select-none" onPointerLeave={() => setHover("")}>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" aria-label="Poprzedni miesiąc" onClick={() => setMonth((m) => addMonths(m, -1))} className="grid size-8 place-items-center rounded-full hover:bg-soft">‹</button>
        <div className="text-[13.5px] font-medium" aria-live="polite">{title}</div>
        <button type="button" aria-label="Następny miesiąc" disabled={month >= monthOf(max)} onClick={() => setMonth((m) => addMonths(m, 1))} className="grid size-8 place-items-center rounded-full hover:bg-soft disabled:opacity-30">›</button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted">
        {WEEKDAYS.map((w) => <div key={w} className="pb-1.5">{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5" role="grid" aria-label={title}>
        {days.map((d, i) => {
          const out = d.slice(0, 7) !== month.slice(0, 7);
          const off = d > max;
          const isStart = d === from;
          const isEnd = !!end && d === end;
          const inside = !!from && !!end && d > from && d < end;
          const band = "absolute inset-y-0 bg-accent/10";
          return (
            <div key={d} className="relative flex h-9 items-center justify-center">
              {(inside || (isEnd && !isStart)) && <span aria-hidden className={`${band} left-0 right-1/2 ${i % 7 === 0 ? "rounded-l-full" : ""}`} />}
              {(inside || (isStart && !!end && end !== from)) && <span aria-hidden className={`${band} left-1/2 right-0 ${i % 7 === 6 ? "rounded-r-full" : ""}`} />}
              <button
                type="button"
                disabled={off}
                aria-pressed={isStart || isEnd}
                aria-label={d}
                onClick={() => pick(d)}
                onPointerEnter={() => setHover(d)}
                className={`tnum relative grid size-9 place-items-center rounded-full text-[13px] disabled:pointer-events-none disabled:text-line-strong ${
                  isStart || isEnd ? "bg-accent font-medium text-on-accent" : inside ? "text-ink" : out ? "text-muted/60 hover:bg-soft" : "text-ink hover:bg-soft"
                }`}
              >
                {Number(d.slice(8))}
                {d === max && <span aria-hidden className={`absolute bottom-1 size-1 rounded-full ${isStart || isEnd ? "bg-on-accent" : "bg-accent"}`} />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
