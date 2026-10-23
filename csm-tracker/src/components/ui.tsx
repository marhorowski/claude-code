"use client";

import { useState } from "react";
import type { KpiResult } from "@/lib/report";
import { statusColor, statusLabel, type KpiStatus } from "@/lib/grading";
import { formatKpi, formatNumber } from "@/lib/format";
import { MONTHS_PL } from "@/lib/dates";

const STATUS_BORDER: Record<KpiStatus, string> = {
  GOD: "rgba(234,179,8,0.4)",
  GREEN: "rgba(34,197,94,0.3)",
  ORANGE: "rgba(249,115,22,0.3)",
  RED: "rgba(239,68,68,0.35)",
  NONE: "var(--border-card)",
};

export function PageTitle({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>{title}</h1>
        {subtitle && <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: KpiStatus }) {
  const cls = { GOD: "badge-gold", GREEN: "badge-neon", ORANGE: "badge-orange", RED: "badge-red", NONE: "" }[status];
  return <span className={`badge ${cls}`} style={status === "NONE" ? { color: "var(--text-muted)", border: "1px solid var(--border-card)" } : undefined}>{statusLabel(status)}</span>;
}

export function KpiCard({ r, previous, compact }: { r: KpiResult; previous?: number | null; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const color = statusColor(r.status);
  const pct = r.perf === null ? (r.status === "GOD" ? 999 : null) : r.perf;
  const trend = previous !== undefined && previous !== null && r.value !== null ? r.value - previous : null;
  const better = trend === null ? null : r.lowerIsBetter ? trend < 0 : trend > 0;

  return (
    <div
      className="fade-in"
      style={{ background: "var(--bg-card)", border: `1px solid ${STATUS_BORDER[r.status]}`, borderRadius: "0.75rem", padding: compact ? "0.9rem" : "1.1rem" }}
    >
      <button onClick={() => setOpen(!open)} className="w-full text-left" title="Pokaż definicję i wzór">
        <div className="flex items-start justify-between gap-2 mb-3">
          <span style={{ color: "var(--text-label)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{r.label}</span>
          <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>{open ? "▴" : "ⓘ"}</span>
        </div>
      </button>

      <div className="flex items-end justify-between gap-2 mb-3">
        <div style={{ color, fontWeight: 800, fontSize: compact ? "1.45rem" : "1.8rem", letterSpacing: "-0.02em", lineHeight: 1 }}>
          {formatKpi(r.value, r.unit, r.decimals)}
        </div>
        <div className="text-right">
          <div style={{ color: "var(--text-muted)", fontSize: "0.66rem" }}>Norma {r.lowerIsBetter ? "≤" : "≥"}</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: 600 }}>{formatKpi(r.target, r.unit, r.decimals)}</div>
        </div>
      </div>

      <div className="progress-bar mb-2">
        <div className="progress-bar-fill" style={{ width: `${Math.max(0, Math.min(pct ?? 0, 100))}%`, backgroundColor: color }} />
      </div>

      <div className="flex items-center justify-between gap-2" style={{ fontSize: "0.72rem" }}>
        <span style={{ color, fontWeight: 700 }}>
          {r.status === "NONE" ? "Brak danych" : pct === 999 ? "≥ 200% normy" : `${formatNumber(pct ?? 0)}% normy`}
        </span>
        {trend !== null && Math.abs(trend) > 1e-9 && (
          <span style={{ color: better ? "#22C55E" : "#EF4444", fontWeight: 600 }} title="Zmiana vs poprzedni miesiąc">
            {trend > 0 ? "↑" : "↓"} {formatKpi(Math.abs(trend), r.unit === "%" ? "pkt" : r.unit, r.decimals)}{r.unit === "%" ? " pp" : ""}
          </span>
        )}
      </div>

      {r.sub && <div className="mt-2" style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>{r.sub}</div>}

      {r.breakdown && (
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5" style={{ fontSize: "0.7rem" }}>
          {r.breakdown.map((b) => (
            <div key={b.label} className="flex justify-between">
              <span style={{ color: "var(--text-muted)" }}>{b.label}</span>
              <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{formatKpi(b.value, b.unit, 0)}</span>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: "1px solid var(--border-card)", fontSize: "0.72rem" }}>
          <p style={{ color: "var(--text-secondary)" }}>{r.definition}</p>
          <p style={{ color: "var(--text-muted)" }}><span style={{ color: "var(--text-label)", fontWeight: 600 }}>Wzór: </span>{r.formula}</p>
          {r.agencyLevel && <p style={{ color: "var(--text-muted)" }}>Liczony dla całej agencji.</p>}
          {r.period === "QUARTERLY" && <p style={{ color: "var(--text-muted)" }}>KPI kwartalny — liczony narastająco od początku kwartału.</p>}
        </div>
      )}
    </div>
  );
}

export function MonthPicker({ year, month, onChange }: { year: number; month: number; onChange: (y: number, m: number) => void }) {
  const now = new Date().getFullYear();
  const years = [now - 2, now - 1, now, now + 1];
  return (
    <div className="flex items-center gap-2">
      <button className="btn-ghost" onClick={() => (month === 1 ? onChange(year - 1, 12) : onChange(year, month - 1))} aria-label="Poprzedni miesiąc">‹</button>
      <select className="input-dark" style={{ width: "auto" }} value={month} onChange={(e) => onChange(year, Number(e.target.value))}>
        {MONTHS_PL.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
      </select>
      <select className="input-dark" style={{ width: "auto" }} value={year} onChange={(e) => onChange(Number(e.target.value), month)}>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      <button className="btn-ghost" onClick={() => (month === 12 ? onChange(year + 1, 1) : onChange(year, month + 1))} aria-label="Następny miesiąc">›</button>
    </div>
  );
}

export function NumberField({ label, hint, unit, value, onChange, int }: {
  label: string; hint?: string; unit: string; value: string; onChange: (v: string) => void; int?: boolean;
}) {
  return (
    <label className="block">
      <span className="lbl">{label}</span>
      <div className="relative">
        <input
          className="input-dark pr-12"
          inputMode={int ? "numeric" : "decimal"}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
          placeholder="—"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--text-muted)" }}>{unit}</span>
      </div>
      {hint && <span className="block mt-1 text-xs" style={{ color: "var(--text-muted)" }}>{hint}</span>}
    </label>
  );
}

export function Card({ title, description, children, right }: { title?: string; description?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="card p-5">
      {(title || right) && (
        <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
          <div>
            {title && <h2 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{title}</h2>}
            {description && <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{description}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Notice({ kind, children }: { kind: "ok" | "error" | "info"; children: React.ReactNode }) {
  const color = kind === "ok" ? "var(--neon)" : kind === "error" ? "var(--red)" : "var(--text-secondary)";
  return <div className="text-sm px-3 py-2 rounded-lg" style={{ color, border: `1px solid ${color}`, background: "var(--bg-elevated)" }}>{children}</div>;
}

// Wartości formularza trzymane jako tekst, żeby nie gubić przecinków podczas pisania
export function toFormValues(values: Record<string, number | null> | undefined, keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, values?.[k] === null || values?.[k] === undefined ? "" : String(values[k]).replace(".", ",")]));
}

export function fromFormValues(form: Record<string, string>): Record<string, number | null> {
  return Object.fromEntries(Object.entries(form).map(([k, v]) => {
    const n = Number(v.replace(",", "."));
    return [k, v.trim() === "" || !Number.isFinite(n) ? null : n];
  }));
}
