// Dane dashboardu: kafelki north star (z poprzednim okresem i serią do wykresu) oraz panele lejka.
import { AREAS } from "./fields";
import { METRICS } from "./metrics";
import { addDays, bucketKey, bucketsInRange, daysInRange, type Grouping } from "./periods";
import { buildReport, type ReportColumn, type ReportEntry } from "./report";
import type { PanelDef, ViewDef } from "./views";

export interface MeasureInfo {
  label: string;
  unit: string;
  better: "higher" | "lower";
  /** Wartości pieniężne po stronie przychodu (kolor „money”). */
  money: boolean;
}

const MONEY_KEYS = new Set(["totalRevenue", "revenue", "followUpRevenue", "avgDealValue", "roas"]);

const DERIVED: Record<string, { info: MeasureInfo; calc: (col: ReportColumn) => number | null }> = {
  bookedTotal: {
    info: { label: "Umówione rozmowy łącznie", unit: "szt.", better: "higher", money: false },
    calc: (c) =>
      "meetingsBooked" in c.sums || "vslMeetingsBooked" in c.sums
        ? (c.sums.meetingsBooked ?? 0) + (c.sums.vslMeetingsBooked ?? 0)
        : null,
  },
};

export function measureInfo(key: string): MeasureInfo {
  if (DERIVED[key]) return DERIVED[key].info;
  const m = METRICS.find((x) => x.key === key);
  if (m) return { label: m.label, unit: m.unit, better: m.better, money: MONEY_KEYS.has(key) };
  const f = AREAS.flatMap((a) => a.fields).find((x) => x.key === key);
  if (f) return { label: f.label, unit: f.unit, better: "higher", money: MONEY_KEYS.has(key) };
  throw new Error(`Nieznana miara: ${key}`);
}

/** Wartość miary w kolumnie zestawienia; null = brak danych („—”), nigdy udawane 0. */
export function valueOf(col: ReportColumn, key: string): number | null {
  if (DERIVED[key]) return DERIVED[key].calc(col);
  if (key in col.metrics) return col.metrics[key];
  return col.sums[key] ?? null;
}

const shiftMonths = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
};

/**
 * Poprzedni okres tej samej długości, tuż przed bieżącym. Przy podziale na tygodnie i miesiące
 * przesuwamy o pełne tygodnie / miesiące, żeby kolumny wykresu się pokrywały.
 */
export function previousRange(from: string, to: string, grouping: Grouping): { from: string; to: string } {
  const n = bucketsInRange(from, to, grouping).length;
  if (grouping === "month") return { from: shiftMonths(from, -n), to: shiftMonths(to, -n) };
  const days = grouping === "week" ? 7 * n : daysInRange(from, to);
  return { from: addDays(from, -days), to: addDays(to, -days) };
}

export interface KpiData extends MeasureInfo {
  key: string;
  hint: string;
  value: number | null;
  prev: number | null;
  series: (number | null)[];
  prevSeries: (number | null)[];
}

export interface PanelRow {
  key: string;
  label: string;
  unit: string;
  value: number | null;
  /** Szerokość paska 0–100 i podpis udziału; null gdy nie ma z czym porównać. */
  pct: number | null;
}

export interface PanelData {
  title: string;
  note: string;
  money: boolean;
  /** Dla paneli z samymi wartościami pasek pokazuje proporcję, ale bez podpisu „%”. */
  showShare: boolean;
  rows: PanelRow[];
}

export interface DashboardData {
  bucketKeys: string[];
  kpis: KpiData[];
  panels: PanelData[];
  total: ReportColumn;
  columns: ReportColumn[];
  previous: { from: string; to: string };
  /** Ostatnia kolumna obejmuje dzisiejszy dzień, więc jest niepełna. */
  partialLast: boolean;
}

function buildPanel(def: PanelDef, total: ReportColumn): PanelData {
  const values = def.rows.map((r) => valueOf(total, r.key));
  const base = def.kind === "parts" && def.total ? valueOf(total, def.total) : null;
  const max = Math.max(0, ...values.map((v) => v ?? 0));
  const rows = def.rows.map((r, i): PanelRow => {
    const v = values[i];
    let pct: number | null = null;
    if (v !== null) {
      if (def.kind === "funnel") pct = values[0] ? (100 * v) / values[0] : null;
      else if (def.kind === "steps") pct = i === 0 ? null : values[i - 1] ? (100 * v) / values[i - 1]! : null;
      else if (def.kind === "parts") pct = base ? (100 * v) / base : null;
      else pct = max ? (100 * v) / max : null;
    }
    return { key: r.key, label: r.label, unit: measureInfo(r.key).unit, value: v, pct };
  });
  return { title: def.title, note: def.note, money: def.rows.some((r) => MONEY_KEYS.has(r.key)), showShare: def.kind !== "values", rows };
}

export function buildDashboard(
  entries: ReportEntry[],
  view: ViewDef,
  range: { from: string; to: string; grouping: Grouping; today: string },
): DashboardData {
  const { from, to, grouping, today } = range;
  const previous = previousRange(from, to, grouping);
  const current = buildReport(entries, from, to, grouping);
  const before = buildReport(entries, previous.from, previous.to, grouping);

  const kpis = view.northStar.map((k): KpiData => ({
    key: k.key,
    hint: k.hint,
    ...measureInfo(k.key),
    value: valueOf(current.total, k.key),
    prev: before.total.entryCount ? valueOf(before.total, k.key) : null,
    series: current.columns.map((c) => valueOf(c, k.key)),
    prevSeries: before.columns.map((c) => valueOf(c, k.key)),
  }));

  const lastKey = current.columns.at(-1)?.key;
  const partialLast = to >= today && lastKey === bucketKey(today, grouping);

  return {
    bucketKeys: current.columns.map((c) => c.key),
    kpis,
    panels: view.panels.map((p) => buildPanel(p, current.total)),
    total: current.total,
    columns: current.columns,
    previous,
    partialLast,
  };
}
