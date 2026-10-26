import { byLabelOrder, getBreakdowns, getClientAnalytics, recommendations, type AdRow, type BreakdownRow } from "./data";
import type { Alert } from "./analytics/alerts";
import type { Label } from "./analytics/classify";
import type { Metrics } from "./analytics/metrics";
import type { Period } from "./dates";

export type ReportAd = {
  name: string;
  group: string;
  thumb: string | null;
  label: Label;
  reason: string;
  spend: number;
  leads: number;
  bookings: number;
  cpl: number | null;
  cpb: number | null;
};

export type ReportData = {
  version: 1;
  clientName: string;
  currency: string;
  generatedAt: string;
  period: Period;
  previous: Period;
  targetCostPerBooking: number;
  kpis: Metrics;
  kpisPrev: Metrics;
  daily: { date: string; spend: number; leads: number; bookings: number; cpl: number | null; cpb: number | null }[];
  topAds: ReportAd[];
  bottomAds: ReportAd[];
  adSets: ReportAd[];
  breakdowns: Record<string, BreakdownRow[]>;
  alerts: Alert[];
  recommendations: string[];
  labelCounts: Record<string, number>;
};

const toAd = (r: AdRow): ReportAd => ({
  name: r.ad.name,
  group: r.adSetName,
  thumb: r.ad.thumbnailUrl ?? r.ad.imageUrl,
  label: r.classification.label,
  reason: r.classification.reasons[0] ?? "",
  spend: r.metrics.spend,
  leads: r.metrics.leads,
  bookings: r.metrics.bookings,
  cpl: r.metrics.cpl,
  cpb: r.metrics.cpb,
});

export async function buildReport(clientId: string, days: number): Promise<ReportData> {
  const a = await getClientAnalytics(clientId, days);
  if (!a) throw new Error("Nie znaleziono klienta");
  const breakdowns = await getBreakdowns(a.client, a.period);

  const withBookings = a.ads.filter((r) => r.metrics.bookings > 0);
  const top = [...withBookings].sort(byLabelOrder).slice(0, 5);
  const bottom = a.ads
    .filter((r) => ["kill", "weak"].includes(r.classification.label))
    .sort((x, y) => y.metrics.spend - x.metrics.spend)
    .slice(0, 5);
  const adSets = a.adSets
    .filter((s) => s.metrics.spend > 0)
    .sort((x, y) => y.metrics.bookings - x.metrics.bookings || x.metrics.spend - y.metrics.spend)
    .slice(0, 5)
    .map((s) => ({
      name: s.adSet.name,
      group: s.adSet.targetingSummary ?? s.campaignName,
      thumb: null,
      label: s.classification.label,
      reason: s.classification.reasons[0] ?? "",
      spend: s.metrics.spend,
      leads: s.metrics.leads,
      bookings: s.metrics.bookings,
      cpl: s.metrics.cpl,
      cpb: s.metrics.cpb,
    }));

  const trimmed: Record<string, BreakdownRow[]> = {};
  for (const [dim, rows] of Object.entries(breakdowns)) trimmed[dim] = rows.slice(0, 8);

  return {
    version: 1,
    clientName: a.client.name,
    currency: a.client.currency,
    generatedAt: new Date().toISOString(),
    period: a.period,
    previous: a.previous,
    targetCostPerBooking: a.client.targetCostPerBooking,
    kpis: a.kpis,
    kpisPrev: a.kpisPrev,
    daily: a.daily.map(({ date, spend, leads, bookings, cpl, cpb }) => ({ date, spend, leads, bookings, cpl, cpb })),
    topAds: top.map(toAd),
    bottomAds: bottom.map(toAd),
    adSets,
    breakdowns: trimmed,
    alerts: a.alerts.slice(0, 10),
    recommendations: recommendations(a, breakdowns),
    labelCounts: a.labelCounts,
  };
}
