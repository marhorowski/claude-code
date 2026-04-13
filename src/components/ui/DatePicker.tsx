"use client";

import { useState, useRef, useEffect } from "react";

const MONTHS = [
  "Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec",
  "Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień",
];
const DAYS_SHORT = ["Pn","Wt","Śr","Cz","Pt","So","Nd"];

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYMD(s: string): Date | null {
  if (!s) return null;
  const parts = s.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatDisplay(s: string) {
  const d = parseYMD(s);
  if (!d) return null;
  return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`;
}

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  max?: string;
  min?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  /** Use "dark" for inline-styled dark pages (public form, dane-zbiorcze). Default uses CSS vars. */
  variant?: "vars" | "dark";
}

export function DatePicker({
  value,
  onChange,
  max,
  min,
  required,
  placeholder = "Wybierz datę",
  className = "",
  style,
  variant = "vars",
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = value ? parseYMD(value) : null;
  const now = new Date();
  const today = toYMD(now);

  const [viewMonth, setViewMonth] = useState(selected ? selected.getMonth() : now.getMonth());
  const [viewYear, setViewYear] = useState(selected ? selected.getFullYear() : now.getFullYear());

  // Sync calendar view when value changes externally
  useEffect(() => {
    const d = parseYMD(value);
    if (d) { setViewMonth(d.getMonth()); setViewYear(d.getFullYear()); }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
  function getFirstWeekday(y: number, m: number) {
    const d = new Date(y, m, 1).getDay();
    return d === 0 ? 6 : d - 1; // Monday = 0
  }

  function selectDay(day: number) {
    const ymd = `${viewYear}-${String(viewMonth + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    if (max && ymd > max) return;
    if (min && ymd < min) return;
    onChange(ymd);
    setOpen(false);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const isDark = variant === "dark";

  const triggerStyle: React.CSSProperties = isDark
    ? { background: "#111", border: "1px solid #222", color: value ? "#e5e5e5" : "#555", ...style }
    : {
        background: "var(--bg-card, #0f0f0f)",
        border: "1px solid var(--border-card, #1e1e1e)",
        color: value ? "var(--text-primary, #e5e5e5)" : "var(--text-muted, #555)",
        ...style,
      };

  const dropStyle: React.CSSProperties = isDark
    ? { background: "#111", border: "1px solid #222" }
    : { background: "var(--bg-card, #111)", border: "1px solid var(--border-card, #222)" };

  const inputBg: React.CSSProperties = isDark
    ? { background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#e5e5e5" }
    : {
        background: "var(--bg-input, #1a1a1a)",
        border: "1px solid var(--border-card, #2a2a2a)",
        color: "var(--text-primary, #e5e5e5)",
      };

  const yearMin = min ? parseInt(min.split("-")[0]) : now.getFullYear() - 5;
  const yearMax = max ? parseInt(max.split("-")[0]) : now.getFullYear() + 2;
  const years = Array.from({ length: yearMax - yearMin + 1 }, (_, i) => yearMax - i);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstWeekday = getFirstWeekday(viewYear, viewMonth);

  return (
    <div ref={ref} style={{ position: "relative", display: "block", width: "100%" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={className}
        style={{
          width: "100%",
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          ...triggerStyle,
        }}
      >
        <span>{formatDisplay(value) ?? placeholder}</span>
        <span style={{ opacity: 0.4, fontSize: "14px" }}>▾</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            zIndex: 100,
            borderRadius: "16px",
            padding: "16px",
            minWidth: "272px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
            ...dropStyle,
          }}
        >
          {/* Month / Year navigation */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
            <button
              type="button"
              onClick={prevMonth}
              style={{ padding: "4px 8px", borderRadius: "8px", fontSize: "16px", color: "#888", background: "transparent", border: "none", cursor: "pointer" }}
            >‹</button>

            <div style={{ flex: 1, display: "flex", gap: "6px", justifyContent: "center" }}>
              <select
                value={viewMonth}
                onChange={e => setViewMonth(Number(e.target.value))}
                style={{ ...inputBg, borderRadius: "8px", padding: "3px 6px", fontSize: "13px", cursor: "pointer", outline: "none" }}
              >
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select
                value={viewYear}
                onChange={e => setViewYear(Number(e.target.value))}
                style={{ ...inputBg, borderRadius: "8px", padding: "3px 6px", fontSize: "13px", cursor: "pointer", outline: "none" }}
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              style={{ padding: "4px 8px", borderRadius: "8px", fontSize: "16px", color: "#888", background: "transparent", border: "none", cursor: "pointer" }}
            >›</button>
          </div>

          {/* Weekday headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", marginBottom: "4px" }}>
            {DAYS_SHORT.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: "11px", color: "#555", padding: "3px 0" }}>{d}</div>
            ))}
          </div>

          {/* Days */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
            {Array.from({ length: firstWeekday }, (_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const ymd = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const isSelected = value === ymd;
              const isToday = today === ymd;
              const disabled = (max && ymd > max) || (min && ymd < min) ? true : false;

              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectDay(day)}
                  style={{
                    padding: "6px 2px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    border: isSelected ? "1px solid #00ff8866" : isToday ? "1px solid #2a2a2a" : "1px solid transparent",
                    background: isSelected ? "rgba(0,255,136,0.18)" : "transparent",
                    color: disabled ? "#2a2a2a" : isSelected ? "#00ff88" : isToday ? "#00cc6a" : isDark ? "#e5e5e5" : "var(--text-primary, #e5e5e5)",
                    cursor: disabled ? "not-allowed" : "pointer",
                    fontWeight: isSelected || isToday ? 600 : 400,
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Today shortcut */}
          <div style={{ marginTop: "10px", textAlign: "center" }}>
            <button
              type="button"
              onClick={() => {
                if ((!max || today <= max) && (!min || today >= min)) {
                  onChange(today);
                  setOpen(false);
                }
              }}
              style={{ fontSize: "12px", color: "#00ff88", background: "transparent", border: "none", cursor: "pointer", opacity: 0.8 }}
            >
              Dzisiaj
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
