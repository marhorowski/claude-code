// Ustawienia oferty (zysk), cele KPI (kolor statusu) i miesięczne cele przychodu (realizacja celu).
// Wszystko zapisane jako JSON przy kliencie.
import { ratio, totalClosings, totalRevenue, type MetricUnit, type Sums } from "./metrics";
import { addDays, daysInRange } from "./periods";

export type CostKind = "percent" | "perSale";

export interface OfferCost {
  name: string;
  kind: CostKind;
  value: number;
}

export interface Offer {
  /** Cena netto jednej sprzedaży (PLN). */
  price: number | null;
  /** Prowizje w % od całego przychodu. */
  closerPct: number;
  setterPct: number;
  costs: OfferCost[];
}

export const COST_KINDS: { key: CostKind; label: string; unit: string }[] = [
  { key: "percent", label: "% przychodu", unit: "%" },
  { key: "perSale", label: "zł na sprzedaż", unit: "PLN" },
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
  { key: "cacTotal", label: "CAC ogólny", unit: "%", better: "lower" },
  { key: "commissionsPct", label: "Prowizje", unit: "%", better: "lower" },
  { key: "costsPct", label: "Koszty łącznie", unit: "%", better: "lower" },
  { key: "costsTotal", label: "Koszty łącznie (zł)", unit: "PLN", better: "lower" },
  { key: "commissions", label: "Prowizje closera i settera (zł)", unit: "PLN", better: "lower" },
  { key: "otherCosts", label: "Inne koszty (zł)", unit: "PLN", better: "lower" },
];

/** Zysk za okres: przychód minus reklamy, prowizje i inne koszty. Bez ustawień oferty albo bez danych: null. */
export function profitMetrics(s: Sums, o: Offer | null): Record<string, number | null> {
  const none = Object.fromEntries(PROFIT_DEFS.map((d) => [d.key, null]));
  if (!o || !("revenue" in s || "adSpend" in s)) return none;
  const rev = totalRevenue(s);
  const commissions = (rev * (o.closerPct + o.setterPct)) / 100;
  const otherCosts = (rev * sumKind(o, "percent")) / 100 + totalClosings(s) * sumKind(o, "perSale");
  const costsTotal = (s.adSpend ?? 0) + commissions + otherCosts;
  const profit = rev - costsTotal;
  return {
    profit,
    margin: ratio(profit, rev, 100),
    profitPerSale: ratio(profit, totalClosings(s)),
    roi: ratio(profit, costsTotal, 100),
    // Koszt pozyskania sprzedaży (reklamy + prowizje + koszty sprzedaży) jako % jej średniej wartości.
    cacTotal: ratio(costsTotal, rev, 100),
    commissionsPct: ratio(commissions, rev, 100),
    costsPct: ratio(costsTotal, rev, 100),
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

/** Cel wpisany jako % czegoś innego: ceny z oferty albo faktycznej średniej wartości sprzedaży. */
export type RelativeTo = "price" | "avgDeal";
export const RELATIVE_LABEL: Record<RelativeTo, string> = { price: "% ceny", avgDeal: "% śr. wartości sprzedaży" };

/** Wskaźniki z polem celu. Wolumeny (przychód, sprzedaże, leady…) biorą się z miesięcznego celu przychodu. */
export const TARGETABLE: { group: string; keys: { key: string; relative?: RelativeTo }[] }[] = [
  {
    group: "Marketing",
    keys: [{ key: "cpm" }, { key: "ctr" }, { key: "cpc" }, { key: "pageConversion" }, { key: "cpl" }, { key: "vslBookingRate" }, { key: "marketingCostPerCall" }],
  },
  { group: "Setting", keys: [{ key: "pickupRate" }, { key: "bookingRate" }] },
  {
    group: "Sprzedaż",
    keys: [{ key: "sur" }, { key: "noShowRate" }, { key: "cp" }, { key: "followUpShowRate" }, { key: "followUpClosingRate" }, { key: "avgDealValue", relative: "price" }],
  },
  {
    group: "Cały lejek i zysk",
    keys: [
      { key: "totalBookingRate" }, { key: "totalCostPerCall" }, { key: "leadToClose" }, { key: "roas" }, { key: "cacMarketing" }, { key: "cacTotal" },
      { key: "commissionsPct" }, { key: "costsPct" }, { key: "margin" }, { key: "roi" }, { key: "profitPerSale", relative: "avgDeal" },
    ],
  },
];

const RELATIVE = new Map(TARGETABLE.flatMap((g) => g.keys.filter((k) => k.relative).map((k) => [k.key, k.relative!] as const)));
const TARGET_KEYS = new Set(TARGETABLE.flatMap((g) => g.keys.map((k) => k.key)));
export const relativeOf = (key: string) => RELATIVE.get(key);

export type Targets = Record<string, number>;

/** Standard agencji: wartości startowe dla klienta, który nie ma jeszcze własnych celów. */
export const DEFAULT_TARGETS: Targets = {
  cpm: 30, ctr: 1.4, cpc: 2.2, pageConversion: 11, cpl: 20, vslBookingRate: 8, marketingCostPerCall: 250,
  pickupRate: 25, bookingRate: 15,
  sur: 75, noShowRate: 20, cp: 35, followUpShowRate: 85, followUpClosingRate: 30, avgDealValue: 85,
  totalBookingRate: 23, totalCostPerCall: 90, leadToClose: 6, roas: 10, cacMarketing: 10, cacTotal: 30,
  commissionsPct: 20, costsPct: 50, margin: 50, roi: 100, profitPerSale: 50,
};

export function parseTargets(json: unknown): Targets {
  if (!json || typeof json !== "object") return { ...DEFAULT_TARGETS };
  return Object.fromEntries(
    Object.entries(json as Record<string, unknown>).filter(([k, v]) => TARGET_KEYS.has(k) && num(v) !== null && (v as number) > 0),
  ) as Targets;
}

// ——— Miesięczne cele przychodu i plan lejka ———

/** Cel przychodu na miesiąc, klucz „RRRR-MM”. */
export type Goals = Record<string, number>;

export function parseGoals(json: unknown): Goals {
  if (!json || typeof json !== "object") return {};
  return Object.fromEntries(
    Object.entries(json as Record<string, unknown>).filter(([k, v]) => /^\d{4}-\d{2}$/.test(k) && num(v) !== null && (v as number) > 0),
  ) as Goals;
}

const daysInMonthOf = (iso: string) => new Date(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)), 0)).getUTCDate();

/** Cel miesiąca; bez wpisu obowiązuje ostatni wcześniejszy (cel trwa, dopóki go nie zmienisz). */
export function goalForMonth(goals: Goals, month: string): number | null {
  const key = Object.keys(goals).filter((k) => k <= month).sort().at(-1);
  return key ? goals[key] : null;
}

/** Cel przychodu dla dowolnego zakresu: każdy dzień to cel jego miesiąca / liczba dni miesiąca. */
export function revenueGoalFor(goals: Goals, from: string, to: string): number | null {
  let total = 0;
  let any = false;
  for (let d = from, i = daysInRange(from, to); i > 0; d = addDays(d, 1), i--) {
    const g = goalForMonth(goals, d.slice(0, 7));
    if (g !== null) {
      total += g / daysInMonthOf(d);
      any = true;
    }
  }
  return any ? total : null;
}

/** Klucze wolumenów, których cel wynika z planu (przychód → sprzedaże → rozmowy → leady → budżet). */
export const PLAN_KEYS = ["totalRevenue", "profit", "totalClosings", "attendedMeetings", "bookedTotal", "meetingsBooked", "vslMeetingsBooked", "leads", "adSpend"] as const;
export type Plan = Record<(typeof PLAN_KEYS)[number], number | null>;

/**
 * Lejek liczony wstecz od przychodu i celów KPI: sprzedaże = przychód / docelowa wartość sprzedaży,
 * odbyte = sprzedaże / CP, umówione = odbyte / SUR, leady = umówione / Booking Rate łącznie, budżet = leady × CPL.
 * Brak potrzebnego celu albo ceny → null od tego kroku w dół.
 */
export function planFromRevenue(revenue: number, targets: Targets, offer: Offer | null): Plan {
  const pct = (k: string) => (targets[k] ? targets[k] / 100 : null);
  const div = (a: number | null, b: number | null) => (a === null || !b ? null : a / b);
  const dealValue = offer?.price && pct("avgDealValue") ? offer.price * pct("avgDealValue")! : null;
  const sales = div(revenue, dealValue);
  const attended = div(sales, pct("cp"));
  const booked = div(attended, pct("sur"));
  const leads = div(booked, pct("totalBookingRate"));
  const times = (a: number | null, b: number | null) => (a === null || b === null ? null : a * b);
  return {
    totalRevenue: revenue,
    profit: times(revenue, pct("margin")),
    totalClosings: sales,
    attendedMeetings: attended,
    bookedTotal: booked,
    meetingsBooked: times(leads, pct("bookingRate")),
    vslMeetingsBooked: times(leads, pct("vslBookingRate")),
    leads,
    adSpend: times(leads, targets.cpl ?? null),
  };
}

export interface TargetContext {
  targets: Targets;
  offer: Offer | null;
  goals: Goals;
}

/**
 * Cel miary w zakresie dat: wolumeny z planu (cel przychodu proporcjonalnie do dni),
 * cele względne przeliczone na złotówki, reszta wprost. Budżet reklamowy nie ma statusu (to plan, nie wynik).
 */
export function targetFor(key: string, ctx: TargetContext, range: { from: string; to: string }, avgDeal: number | null): number | null {
  if ((PLAN_KEYS as readonly string[]).includes(key)) {
    if (key === "adSpend") return null;
    const revenue = revenueGoalFor(ctx.goals, range.from, range.to);
    return revenue === null ? null : planFromRevenue(revenue, ctx.targets, ctx.offer)[key as keyof Plan];
  }
  const t = ctx.targets[key];
  if (t === undefined) return null;
  const rel = RELATIVE.get(key);
  if (rel === "price") return ctx.offer?.price ? (ctx.offer.price * t) / 100 : null;
  if (rel === "avgDeal") return avgDeal ? (avgDeal * t) / 100 : null;
  return t;
}

/** Status względem celu: progi z Metryki_KPI (dla „niżej = lepiej” odwrócone). */
export function kpiStatus(value: number | null, target: number | null, better: "higher" | "lower"): KpiStatus | null {
  if (value === null || target === null || target <= 0) return null;
  const r = value / target;
  if (better === "higher") return r >= 1.25 ? "god" : r >= 0.9 ? "on" : r >= 0.6 ? "below" : "critical";
  return r <= 0.8 ? "god" : r <= 1.11 ? "on" : r <= 1.67 ? "below" : "critical";
}
