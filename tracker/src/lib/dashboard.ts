// Dane dashboardu: kafelki north star (z poprzednim okresem i serią do wykresu) oraz panele lejka.
import { AREAS } from "./fields";
import { METRICS } from "./metrics";
import { kpiStatus, monthShare, PROFIT_DEFS, profitMetrics, targetFor, type KpiStatus, type Offer, type Targets } from "./kpi";
import { addDays, bucketBounds, bucketKey, daysInRange, type Grouping } from "./periods";
import { buildReport, type ReportColumn, type ReportEntry } from "./report";
import type { PanelDef, ViewDef } from "./views";

export interface MeasureInfo {
  label: string;
  unit: string;
  better: "higher" | "lower";
  /** Wartości pieniężne po stronie przychodu (kolor „money”). */
  money: boolean;
}

const MONEY_KEYS = new Set(["totalRevenue", "revenue", "followUpRevenue", "avgDealValue", "roas", "profit", "profitPerSale"]);

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
  const m = METRICS.find((x) => x.key === key) ?? PROFIT_DEFS.find((x) => x.key === key);
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

export interface Comparison {
  from: string;
  to: string;
  /** Data z poprzedniego okresu → odpowiadająca jej data w bieżącym (do nałożenia na wykres). */
  toCurrent: (iso: string) => string;
  toPrevious: (iso: string) => string;
}

const monthIndex = (iso: string) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7));

/**
 * Analogiczny okres wstecz dla dowolnego zakresu:
 * - zakres od 1. dnia miesiąca → te same dni tyle miesięcy wcześniej (1–22 paź ↔ 1–22 wrz),
 * - każdy inny → tyle samo dni tuż przed nim (17 dni ↔ poprzednie 17 dni).
 */
export function comparisonFor(from: string, to: string): Comparison {
  if (from.endsWith("-01")) {
    const m = monthIndex(to) - monthIndex(from) + 1;
    return { from: shiftMonths(from, -m), to: shiftMonths(to, -m), toCurrent: (d) => shiftMonths(d, m), toPrevious: (d) => shiftMonths(d, -m) };
  }
  const days = daysInRange(from, to);
  return { from: addDays(from, -days), to: addDays(from, -1), toCurrent: (d) => addDays(d, days), toPrevious: (d) => addDays(d, -days) };
}

export function previousRange(from: string, to: string): { from: string; to: string } {
  const { from: f, to: t } = comparisonFor(from, to);
  return { from: f, to: t };
}

export interface KpiData extends MeasureInfo {
  key: string;
  hint: string;
  value: number | null;
  prev: number | null;
  series: (number | null)[];
  prevSeries: (number | null)[];
  /** Cel przeliczony na ten okres (wolumeny miesięczne skalowane) i status względem niego. */
  target: number | null;
  status: KpiStatus | null;
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
  /** Daty poprzedniego okresu odpowiadające każdej kolumnie. */
  prevBucketRanges: { from: string; to: string }[];
  /** Ostatnia kolumna obejmuje dzisiejszy dzień, więc jest niepełna. */
  partialLast: boolean;
  /** Status miary w kolumnie (albo w „Razem”) względem celu; null bez celu lub danych. */
  statusOf: (col: ReportColumn, key: string) => KpiStatus | null;
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
  settings: { offer?: Offer | null; targets?: Targets } = {},
): DashboardData {
  const { from, to, grouping, today } = range;
  const { offer = null, targets = {} } = settings;
  const cmp = comparisonFor(from, to);
  const current = buildReport(entries, from, to, grouping);
  // Wpisy z poprzedniego okresu przesunięte na daty bieżącego: każda kolumna porównuje się z jej odpowiednikiem.
  const shifted = entries
    .filter((e) => e.dateTo >= cmp.from && e.dateTo <= cmp.to)
    .map((e) => ({ ...e, dateTo: cmp.toCurrent(e.dateTo) }));
  const before = buildReport(shifted, from, to, grouping);

  // Daty każdej kolumny przycięte do zakresu — od nich zależą koszty miesięczne i cele miesięczne.
  const bounds = current.columns.map((c) => {
    const b = bucketBounds(c.key, grouping);
    return { from: b.start < from ? from : b.start, to: b.end > to ? to : b.end };
  });
  const shares = new Map<ReportColumn, number>();
  const addProfit = (col: ReportColumn, share: number) => {
    shares.set(col, share);
    if (col.entryCount) Object.assign(col.metrics, profitMetrics(col.sums, offer, share));
    else Object.assign(col.metrics, Object.fromEntries(PROFIT_DEFS.map((d) => [d.key, null])));
  };
  current.columns.forEach((c, i) => addProfit(c, monthShare(bounds[i].from, bounds[i].to)));
  addProfit(current.total, monthShare(from, to));
  before.columns.forEach((c, i) => addProfit(c, monthShare(cmp.toPrevious(bounds[i].from), cmp.toPrevious(bounds[i].to))));
  addProfit(before.total, monthShare(cmp.from, cmp.to));

  const statusOf = (col: ReportColumn, key: string) =>
    kpiStatus(valueOf(col, key), targetFor(key, targets, shares.get(col) ?? 1), measureInfo(key).better);

  const kpis = view.northStar.map((k): KpiData => ({
    key: k.key,
    hint: k.hint,
    ...measureInfo(k.key),
    value: valueOf(current.total, k.key),
    prev: before.total.entryCount ? valueOf(before.total, k.key) : null,
    series: current.columns.map((c) => valueOf(c, k.key)),
    prevSeries: before.columns.map((c) => valueOf(c, k.key)),
    target: targetFor(k.key, targets, shares.get(current.total)!),
    status: statusOf(current.total, k.key),
  }));

  const lastKey = current.columns.at(-1)?.key;
  const partialLast = to >= today && lastKey === bucketKey(today, grouping);

  // Podpis poprzedniego okresu dla każdej kolumny: jej daty przeniesione wstecz.
  const prevBucketRanges = bounds.map((b) => ({ from: cmp.toPrevious(b.from), to: cmp.toPrevious(b.to) }));

  return {
    bucketKeys: current.columns.map((c) => c.key),
    kpis,
    panels: view.panels.map((p) => buildPanel(p, current.total)),
    total: current.total,
    columns: current.columns,
    previous: { from: cmp.from, to: cmp.to },
    prevBucketRanges,
    partialLast,
    statusOf,
  };
}
