// Ustawienia oferty (zysk) i cele KPI (kolor statusu). Oba zapisane jako JSON przy kliencie.
import { ratio, totalClosings, totalRevenue, type MetricUnit, type Sums } from "./metrics";
import { addDays, daysInRange } from "./periods";

export type CostKind = "percent" | "perSale" | "monthly";

export interface OfferCost {
  name: string;
  kind: CostKind;
  value: number;
}

export interface Offer {
  /** Cena netto jednej sprzedaży (PLN); potrzebna tylko do maksymalnego CAC. */
  price: number | null;
  /** Prowizje w % od całego przychodu. */
  closerPct: number;
  setterPct: number;
  costs: OfferCost[];
}

export const COST_KINDS: { key: CostKind; label: string; unit: string }[] = [
  { key: "percent", label: "% przychodu", unit: "%" },
  { key: "perSale", label: "zł na sprzedaż", unit: "PLN" },
  { key: "monthly", label: "zł miesięcznie", unit: "PLN" },
];

const num = (x: unknown): number | null => (typeof x === "number" && Number.isFinite(x) ? x : null);

export function parseOffer(json: unknown): Offer | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  const costs = Array.isArray(o.costs)
    ? o.costs.flatMap((c): OfferCost[] => {
        const kind = COST_KINDS.find((k) => k.key === c?.kind)?.key;
        const value = num(c?.value);
        return kind && value !== null ? [{ name: String(c.name ?? ""), kind, value }] : [];
      })
    : [];
  return { price: num(o.price), closerPct: num(o.closerPct) ?? 0, setterPct: num(o.setterPct) ?? 0, costs };
}

const sumKind = (o: Offer, kind: CostKind) => o.costs.filter((c) => c.kind === kind).reduce((a, c) => a + c.value, 0);

/** Ile „miesięcy” obejmuje zakres: każdy dzień to 1/liczba dni jego miesiąca (pełny miesiąc = 1). */
export function monthShare(from: string, to: string): number {
  let share = 0;
  for (let d = from, i = daysInRange(from, to); i > 0; d = addDays(d, 1), i--) {
    const y = Number(d.slice(0, 4)), m = Number(d.slice(5, 7));
    share += 1 / new Date(Date.UTC(y, m, 0)).getUTCDate();
  }
  return share;
}

/** Ile maksymalnie można wydać na pozyskanie klienta, żeby sprzedaż wyszła na zero. */
export function maxCac(o: Offer | null): number | null {
  if (!o || o.price === null) return null;
  return o.price * (1 - (o.closerPct + o.setterPct + sumKind(o, "percent")) / 100) - sumKind(o, "perSale");
}

export interface ProfitDef {
  key: string;
  label: string;
  unit: MetricUnit;
  better: "higher" | "lower";
}

export const PROFIT_DEFS: ProfitDef[] = [
  { key: "profit", label: "Zysk", unit: "PLN", better: "higher" },
  { key: "margin", label: "Marża", unit: "%", better: "higher" },
  { key: "profitPerSale", label: "Zysk na sprzedaż", unit: "PLN", better: "higher" },
  { key: "roi", label: "ROI", unit: "%", better: "higher" },
  { key: "costsTotal", label: "Koszty łącznie", unit: "PLN", better: "lower" },
  { key: "commissions", label: "Prowizje (closer + setter)", unit: "PLN", better: "lower" },
  { key: "otherCosts", label: "Inne koszty", unit: "PLN", better: "lower" },
];

/**
 * Zysk za okres: przychód minus reklamy, prowizje i inne koszty. Koszty miesięczne liczone
 * proporcjonalnie do dni okresu (share z monthShare). Bez ustawień oferty albo bez danych: null.
 */
export function profitMetrics(s: Sums, o: Offer | null, share: number): Record<string, number | null> {
  const none = Object.fromEntries(PROFIT_DEFS.map((d) => [d.key, null]));
  if (!o || !("revenue" in s || "adSpend" in s)) return none;
  const rev = totalRevenue(s);
  const closings = totalClosings(s);
  const commissions = (rev * (o.closerPct + o.setterPct)) / 100;
  const otherCosts = (rev * sumKind(o, "percent")) / 100 + closings * sumKind(o, "perSale") + sumKind(o, "monthly") * share;
  const costsTotal = (s.adSpend ?? 0) + commissions + otherCosts;
  const profit = rev - costsTotal;
  return {
    profit,
    margin: ratio(profit, rev, 100),
    profitPerSale: ratio(profit, closings),
    roi: ratio(profit, costsTotal, 100),
    costsTotal,
    commissions,
    otherCosts,
  };
}

// ——— Cele KPI ———

export type KpiStatus = "god" | "on" | "below" | "critical";

export const STATUS_INFO: Record<KpiStatus, { label: string; higher: string; lower: string }> = {
  god: { label: "GOD MODE", higher: "≥ 125% celu", lower: "≤ 80% celu" },
  on: { label: "Na torze", higher: "90–124% celu", lower: "81–111% celu" },
  below: { label: "Poniżej planu", higher: "60–89% celu", lower: "112–167% celu" },
  critical: { label: "Krytyczny", higher: "< 60% celu", lower: "> 167% celu" },
};

/** Wskaźniki, którym można ustawić cel. perMonth: cel to wolumen na miesiąc, skalowany do długości okresu. */
export const TARGETABLE: { group: string; keys: { key: string; perMonth?: boolean }[] }[] = [
  {
    group: "Marketing",
    keys: [{ key: "leads", perMonth: true }, { key: "cpm" }, { key: "ctr" }, { key: "cpc" }, { key: "pageConversion" }, { key: "cpl" }, { key: "vslBookingRate" }, { key: "marketingCostPerCall" }],
  },
  { group: "Setting", keys: [{ key: "meetingsBooked", perMonth: true }, { key: "pickupRate" }, { key: "bookingRate" }] },
  {
    group: "Sprzedaż",
    keys: [{ key: "totalClosings", perMonth: true }, { key: "totalRevenue", perMonth: true }, { key: "sur" }, { key: "noShowRate" }, { key: "cp" }, { key: "followUpShowRate" }, { key: "followUpClosingRate" }, { key: "avgDealValue" }],
  },
  {
    group: "Cały lejek",
    keys: [{ key: "profit", perMonth: true }, { key: "margin" }, { key: "roi" }, { key: "roas" }, { key: "cac" }, { key: "totalCostPerCall" }, { key: "totalBookingRate" }, { key: "leadToClose" }],
  },
];

const PER_MONTH = new Set(TARGETABLE.flatMap((g) => g.keys.filter((k) => k.perMonth).map((k) => k.key)));
const TARGET_KEYS = new Set(TARGETABLE.flatMap((g) => g.keys.map((k) => k.key)));

export const isPerMonth = (key: string) => PER_MONTH.has(key);

export type Targets = Record<string, number>;

export function parseTargets(json: unknown): Targets {
  if (!json || typeof json !== "object") return {};
  return Object.fromEntries(
    Object.entries(json as Record<string, unknown>).filter(([k, v]) => TARGET_KEYS.has(k) && num(v) !== null && (v as number) > 0),
  ) as Targets;
}

/** Cel dla okresu: wolumeny miesięczne skalowane do jego długości (share z monthShare). */
export function targetFor(key: string, targets: Targets, share: number): number | null {
  const t = targets[key];
  if (t === undefined) return null;
  return PER_MONTH.has(key) ? t * share : t;
}

/** Status względem celu: progi z Metryki_KPI (dla „niżej = lepiej” odwrócone). */
export function kpiStatus(value: number | null, target: number | null, better: "higher" | "lower"): KpiStatus | null {
  if (value === null || target === null || target <= 0) return null;
  const r = value / target;
  if (better === "higher") return r >= 1.25 ? "god" : r >= 0.9 ? "on" : r >= 0.6 ? "below" : "critical";
  return r <= 0.8 ? "god" : r <= 1.11 ? "on" : r <= 1.67 ? "below" : "critical";
}
