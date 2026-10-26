import { addDays } from "../dates";
import { derive, sumTotals, type Totals } from "./metrics";

export type Severity = "high" | "medium";

export type Alert = {
  severity: Severity;
  entityType: "account" | "ad";
  entityId: string;
  entityName: string;
  metric: "cpb" | "cpl" | "ctr" | "cpm" | "booking_rate" | "delivery" | "frequency" | "no_bookings";
  message: string;
  changePct: number | null;
};

export type DailyPoint = Totals & { date: string };

export const RECENT_DAYS = 3;
export const BASELINE_DAYS = 14;

const fmt = (v: number) => Math.round(v).toLocaleString("pl-PL");
const pctChange = (a: number, b: number) => ((a - b) / b) * 100;

// Porównuje ostatnie 3 dni z poprzednimi 14 (oba okna kończą się na `end`).
export function detectDrops(
  points: DailyPoint[],
  end: string,
  entity: { type: "account" | "ad"; id: string; name: string },
  opts: { targetCostPerBooking: number; active?: boolean },
): Alert[] {
  const recentStart = addDays(end, -(RECENT_DAYS - 1));
  const baseStart = addDays(recentStart, -BASELINE_DAYS);
  const recentPts = points.filter((p) => p.date >= recentStart && p.date <= end);
  const basePts = points.filter((p) => p.date >= baseStart && p.date < recentStart);
  const recent = derive(sumTotals(recentPts));
  const base = derive(sumTotals(basePts));
  const out: Alert[] = [];
  const push = (severity: Severity, metric: Alert["metric"], message: string, changePct: number | null) =>
    out.push({ severity, entityType: entity.type, entityId: entity.id, entityName: entity.name, metric, message, changePct });

  const baseDailySpend = base.spend / BASELINE_DAYS;
  const recentDailySpend = recent.spend / RECENT_DAYS;
  const minDailySpend = opts.targetCostPerBooking * 0.1;

  // Dostarczanie: reklama/konto nagle przestało wydawać budżet
  if (opts.active !== false && baseDailySpend >= minDailySpend && recentDailySpend < baseDailySpend * 0.3) {
    push("high", "delivery", `Wydatki spadły z ~${fmt(baseDailySpend)}/dzień do ~${fmt(recentDailySpend)}/dzień — sprawdź budżet, płatności i odrzucone reklamy.`, pctChange(recentDailySpend, baseDailySpend));
    return out; // pozostałe metryki przy braku wydatków nie mają sensu
  }

  // Koszt spotkania
  if (base.bookings >= 3 && base.cpb !== null) {
    if (recent.bookings === 0 && recent.spend >= base.cpb * 2) {
      push("high", "no_bookings", `Brak spotkań od ${RECENT_DAYS} dni przy wydatku ${fmt(recent.spend)} (wcześniej spotkanie co ~${fmt(base.cpb)}).`, null);
    } else if (recent.cpb !== null && recent.cpb >= base.cpb * 1.4 && recent.spend >= opts.targetCostPerBooking) {
      const c = pctChange(recent.cpb, base.cpb);
      push(c >= 80 ? "high" : "medium", "cpb", `Koszt spotkania wzrósł o ${Math.round(c)}%: ${fmt(base.cpb)} → ${fmt(recent.cpb)}.`, c);
    }
  }

  // Koszt leada
  if (base.leads >= 5 && base.cpl !== null && recent.cpl !== null && recent.leads >= 2 && recent.cpl >= base.cpl * 1.4) {
    const c = pctChange(recent.cpl, base.cpl);
    push(c >= 80 ? "high" : "medium", "cpl", `Koszt leada wzrósł o ${Math.round(c)}%: ${fmt(base.cpl)} → ${fmt(recent.cpl)}.`, c);
  }

  // Jakość leadów: spada % umówień
  if (base.leads >= 10 && base.bookings >= 3 && recent.leads >= 5 && base.bookingRate !== null && recent.bookingRate !== null && recent.bookingRate <= base.bookingRate * 0.6) {
    const c = pctChange(recent.bookingRate, base.bookingRate);
    push("medium", "booking_rate", `Mniej leadów umawia spotkanie: ${base.bookingRate.toFixed(0)}% → ${recent.bookingRate.toFixed(0)}%.`, c);
  }

  // CTR i CPM (zmęczenie kreacji / aukcja)
  if (base.impressions >= 2000 && recent.impressions >= 1000) {
    if (base.ctr !== null && recent.ctr !== null && recent.ctr <= base.ctr * 0.75) {
      const c = pctChange(recent.ctr, base.ctr);
      push("medium", "ctr", `CTR spadł o ${Math.abs(Math.round(c))}%: ${base.ctr.toFixed(2)}% → ${recent.ctr.toFixed(2)}%.`, c);
    }
    if (base.cpm !== null && recent.cpm !== null && recent.cpm >= base.cpm * 1.4) {
      const c = pctChange(recent.cpm, base.cpm);
      push("medium", "cpm", `CPM wzrósł o ${Math.round(c)}%: ${fmt(base.cpm)} → ${fmt(recent.cpm)}.`, c);
    }
  }
  return out;
}

export function frequencyAlert(
  ad: { id: string; name: string; frequency7d: number | null },
  maxFrequency: number,
): Alert | null {
  if (ad.frequency7d === null || ad.frequency7d <= maxFrequency) return null;
  return {
    severity: "medium",
    entityType: "ad",
    entityId: ad.id,
    entityName: ad.name,
    metric: "frequency",
    message: `Frequency ${ad.frequency7d.toFixed(1)} w ostatnich 7 dniach — odbiorcy widzą reklamę zbyt często, przygotuj nową wersję.`,
    changePct: null,
  };
}

