// Wskaźniki liczone z sum pól. Zasada: najpierw sumujemy pola za cały okres,
// potem dzielimy — nigdy nie uśredniamy dziennych procentów.

export type Sums = Record<string, number>;
export type MetricUnit = "PLN" | "%" | "×" | "szt.";
export type MetricGroup = "marketing" | "setting" | "sales" | "total";

export interface MetricDef {
  key: string;
  label: string;
  group: MetricGroup;
  unit: MetricUnit;
  better: "higher" | "lower";
  calc: (s: Sums) => number | null;
}

const v = (s: Sums, key: string) => s[key] ?? 0;

/** Dzielenie, które przy zerowym mianowniku zwraca null (w widoku: „—”). */
export function ratio(num: number, den: number, mult = 1): number | null {
  if (!den) return null;
  return (num / den) * mult;
}

export const totalClosings = (s: Sums) => v(s, "closings") + v(s, "followUpClosings");
export const totalRevenue = (s: Sums) => v(s, "revenue") + v(s, "followUpRevenue");

export const METRICS: MetricDef[] = [
  { key: "cpm", label: "CPM", group: "marketing", unit: "PLN", better: "lower", calc: (s) => ratio(v(s, "adSpend"), v(s, "impressions"), 1000) },
  { key: "ctr", label: "CTR (link)", group: "marketing", unit: "%", better: "higher", calc: (s) => ratio(v(s, "clicks"), v(s, "impressions"), 100) },
  { key: "cpc", label: "CPC", group: "marketing", unit: "PLN", better: "lower", calc: (s) => ratio(v(s, "adSpend"), v(s, "clicks")) },
  { key: "pageConversion", label: "Konwersja strony", group: "marketing", unit: "%", better: "higher", calc: (s) => ratio(v(s, "leads"), v(s, "clicks"), 100) },
  { key: "cpl", label: "CPL", group: "marketing", unit: "PLN", better: "lower", calc: (s) => ratio(v(s, "adSpend"), v(s, "leads")) },
  { key: "vslBookingRate", label: "VSL Booking Rate", group: "marketing", unit: "%", better: "higher", calc: (s) => ratio(v(s, "vslMeetingsBooked"), v(s, "leads"), 100) },
  { key: "marketingCostPerCall", label: "Koszt za rozmowę (marketing)", group: "marketing", unit: "PLN", better: "lower", calc: (s) => ratio(v(s, "adSpend"), v(s, "vslMeetingsBooked")) },

  { key: "pickupRate", label: "Pickup Rate", group: "setting", unit: "%", better: "higher", calc: (s) => ratio(v(s, "conductedCalls"), v(s, "callsMade"), 100) },
  { key: "bookingRate", label: "Booking Rate (setter)", group: "setting", unit: "%", better: "higher", calc: (s) => ratio(v(s, "meetingsBooked"), v(s, "leads"), 100) },

  { key: "sur", label: "SUR (Show-Up Rate)", group: "sales", unit: "%", better: "higher", calc: (s) => ratio(v(s, "attendedMeetings"), v(s, "plannedMeetings"), 100) },
  { key: "noShowRate", label: "No-show rate", group: "sales", unit: "%", better: "lower", calc: (s) => ratio(v(s, "noShows"), v(s, "plannedMeetings"), 100) },
  { key: "cp", label: "CP (Closing Percentage)", group: "sales", unit: "%", better: "higher", calc: (s) => ratio(v(s, "closings"), v(s, "attendedMeetings"), 100) },
  { key: "followUpShowRate", label: "Show rate follow-upów", group: "sales", unit: "%", better: "higher", calc: (s) => ratio(v(s, "followUpsDone"), v(s, "plannedFollowUps"), 100) },
  { key: "followUpClosingRate", label: "Closing follow-upów", group: "sales", unit: "%", better: "higher", calc: (s) => ratio(v(s, "followUpClosings"), v(s, "followUpsDone"), 100) },
  { key: "avgDealValue", label: "Średnia wartość sprzedaży", group: "sales", unit: "PLN", better: "higher", calc: (s) => ratio(totalRevenue(s), totalClosings(s)) },

  // Bez żadnego wpisu sprzedażowego w okresie: „—”, a nie 0.
  { key: "totalClosings", label: "Sprzedaże łącznie", group: "total", unit: "szt.", better: "higher", calc: (s) => ("closings" in s ? totalClosings(s) : null) },
  { key: "totalRevenue", label: "Przychód łącznie", group: "total", unit: "PLN", better: "higher", calc: (s) => ("revenue" in s ? totalRevenue(s) : null) },
  { key: "totalCostPerCall", label: "Łączny koszt za rozmowę", group: "total", unit: "PLN", better: "lower", calc: (s) => ratio(v(s, "adSpend"), v(s, "meetingsBooked") + v(s, "vslMeetingsBooked")) },
  { key: "totalBookingRate", label: "Booking Rate łącznie", group: "total", unit: "%", better: "higher", calc: (s) => ratio(v(s, "meetingsBooked") + v(s, "vslMeetingsBooked"), v(s, "leads"), 100) },
  { key: "leadToClose", label: "Lead-to-Close Rate", group: "total", unit: "%", better: "higher", calc: (s) => ratio(totalClosings(s), v(s, "leads"), 100) },
  { key: "cac", label: "CAC", group: "total", unit: "PLN", better: "lower", calc: (s) => ratio(v(s, "adSpend"), totalClosings(s)) },
  // Koszt reklamy na sprzedaż jako % jej średniej wartości = wydatek / przychód.
  { key: "cacMarketing", label: "CAC marketingowy", group: "total", unit: "%", better: "lower", calc: (s) => ratio(v(s, "adSpend"), totalRevenue(s), 100) },
  { key: "roas", label: "ROAS", group: "total", unit: "×", better: "higher", calc: (s) => ratio(totalRevenue(s), v(s, "adSpend")) },
];

/** Sumuje wartości pól z listy wpisów (dowolnych obszarów). */
export function sumValues(entries: { values: Record<string, number> }[]): Sums {
  const sums: Sums = {};
  for (const e of entries) {
    for (const [key, val] of Object.entries(e.values)) {
      if (typeof val === "number" && Number.isFinite(val)) sums[key] = (sums[key] ?? 0) + val;
    }
  }
  return sums;
}

export function computeMetrics(sums: Sums): Record<string, number | null> {
  return Object.fromEntries(METRICS.map((m) => [m.key, m.calc(sums)]));
}
