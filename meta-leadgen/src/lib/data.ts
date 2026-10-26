import type { Ad, AdSet, Campaign, Client } from "@prisma/client";
import { prisma } from "./db";
import { addDays, dayRange, fromDate, periodFor, toDate, type Period } from "./dates";
import { classify, LABELS, type Classification, type Thresholds } from "./analytics/classify";
import { detectDrops, frequencyAlert, BASELINE_DAYS, RECENT_DAYS, type Alert, type DailyPoint } from "./analytics/alerts";
import { addInto, derive, emptyTotals, groupBy, sumTotals, type Metrics, type Totals } from "./analytics/metrics";

const ACTIVE = new Set(["ACTIVE", "IN_PROCESS", "WITH_ISSUES", "PENDING_REVIEW"]);

export function thresholdsOf(c: Client): Thresholds {
  return {
    targetCostPerBooking: c.targetCostPerBooking,
    targetCpl: c.targetCpl,
    minBookingsForWin: c.minBookingsForWin,
    killSpendMultiplier: c.killSpendMultiplier,
    maxFrequency: c.maxFrequency,
  };
}

export type AdRow = {
  ad: Ad;
  adSetName: string;
  campaignName: string;
  active: boolean;
  metrics: Metrics;
  prev: Metrics;
  classification: Classification;
};

export type AdSetRow = {
  adSet: AdSet;
  campaignName: string;
  active: boolean;
  adCount: number;
  metrics: Metrics;
  prev: Metrics;
  classification: Classification;
};

export type ClientAnalytics = {
  client: Client;
  period: Period;
  previous: Period;
  kpis: Metrics;
  kpisPrev: Metrics;
  daily: (Metrics & { date: string })[];
  ads: AdRow[];
  adSets: AdSetRow[];
  alerts: Alert[];
  labelCounts: Record<string, number>;
  hasData: boolean;
};

type Row = Totals & { adId: string; adSetId: string; campaignId: string; date: string };

export async function getClientAnalytics(clientId: string, days: number): Promise<ClientAnalytics | null> {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return null;
  const { current, previous } = periodFor(client.timezone, days);
  const alertStart = addDays(current.end, -(RECENT_DAYS + BASELINE_DAYS - 1));
  const loadFrom = previous.start < alertStart ? previous.start : alertStart;

  const [insights, ads, adSets, campaigns] = await Promise.all([
    prisma.dailyInsight.findMany({
      where: { clientId, date: { gte: toDate(loadFrom), lte: toDate(current.end) } },
      select: { adId: true, adSetId: true, campaignId: true, date: true, spend: true, impressions: true, clicks: true, leads: true, bookings: true },
    }),
    prisma.ad.findMany({ where: { clientId } }),
    prisma.adSet.findMany({ where: { clientId } }),
    prisma.campaign.findMany({ where: { clientId } }),
  ]);
  const rows: Row[] = insights.map((r) => ({ ...r, date: fromDate(r.date) }));
  return buildAnalytics(client, current, previous, rows, ads, adSets, campaigns);
}

export function buildAnalytics(
  client: Client,
  current: Period,
  previous: Period,
  rows: Row[],
  ads: Ad[],
  adSets: AdSet[],
  campaigns: Campaign[],
): ClientAnalytics {
  const t = thresholdsOf(client);
  const inCur = (r: Row) => r.date >= current.start && r.date <= current.end;
  const inPrev = (r: Row) => r.date >= previous.start && r.date <= previous.end;
  const recentStart = addDays(current.end, -(RECENT_DAYS - 1));
  const inRecent = (r: Row) => r.date >= recentStart && r.date <= current.end;

  const curRows = rows.filter(inCur);
  const kpis = derive(sumTotals(curRows));
  const kpisPrev = derive(sumTotals(rows.filter(inPrev)));

  const byDate = groupBy(curRows, (r) => r.date);
  const daily = dayRange(current.start, current.end).map((date) => ({ date, ...derive(sumTotals(byDate.get(date) ?? [])) }));

  const campaignName = new Map(campaigns.map((c) => [c.id, c.name]));
  const adSetById = new Map(adSets.map((s) => [s.id, s]));
  const rowsByAd = groupBy(rows, (r) => r.adId);
  const rowsByAdSet = groupBy(rows, (r) => r.adSetId);

  const adRows: AdRow[] = ads
    .map((ad) => {
      const list = rowsByAd.get(ad.id) ?? [];
      const totals = sumTotals(list.filter(inCur));
      const active = ACTIVE.has(ad.effectiveStatus ?? "");
      return {
        ad,
        adSetName: adSetById.get(ad.adSetId)?.name ?? "—",
        campaignName: campaignName.get(ad.campaignId) ?? "—",
        active,
        metrics: derive(totals),
        prev: derive(sumTotals(list.filter(inPrev))),
        classification: classify({ totals, recent: sumTotals(list.filter(inRecent)), frequency7d: ad.frequency7d, active }, t),
      };
    })
    .filter((r) => r.metrics.spend > 0 || r.active)
    .sort((a, b) => b.metrics.spend - a.metrics.spend);

  const adCountBySet = groupBy(ads, (a) => a.adSetId);
  const adSetRows: AdSetRow[] = adSets
    .map((adSet) => {
      const list = rowsByAdSet.get(adSet.id) ?? [];
      const totals = sumTotals(list.filter(inCur));
      const active = ACTIVE.has(adSet.effectiveStatus ?? "");
      return {
        adSet,
        campaignName: campaignName.get(adSet.campaignId) ?? "—",
        active,
        adCount: adCountBySet.get(adSet.id)?.length ?? 0,
        metrics: derive(totals),
        prev: derive(sumTotals(list.filter(inPrev))),
        classification: classify({ totals, recent: sumTotals(list.filter(inRecent)), active }, t),
      };
    })
    .filter((r) => r.metrics.spend > 0 || r.active)
    .sort((a, b) => b.metrics.spend - a.metrics.spend);

  // Alerty: konto + aktywne reklamy z istotnym wydatkiem
  const alerts: Alert[] = [];
  const accountDaily = new Map<string, Totals>();
  for (const r of rows) {
    let day = accountDaily.get(r.date);
    if (!day) accountDaily.set(r.date, (day = emptyTotals()));
    addInto(day, r);
  }
  const accountPoints: DailyPoint[] = [...accountDaily].map(([date, tot]) => ({ date, ...tot }));
  alerts.push(...detectDrops(accountPoints, current.end, { type: "account", id: client.id, name: "Całe konto" }, { targetCostPerBooking: t.targetCostPerBooking }));
  for (const r of adRows) {
    if (!r.active) continue;
    const points = (rowsByAd.get(r.ad.id) ?? []).map((x) => ({ ...x }));
    alerts.push(...detectDrops(points, current.end, { type: "ad", id: r.ad.id, name: r.ad.name }, { targetCostPerBooking: t.targetCostPerBooking, active: true }));
    const f = frequencyAlert(r.ad, t.maxFrequency);
    if (f) alerts.push(f);
  }
  alerts.sort((a, b) => (a.severity === b.severity ? (a.entityType === "account" ? -1 : 1) : a.severity === "high" ? -1 : 1));

  const labelCounts: Record<string, number> = {};
  for (const r of adRows) labelCounts[r.classification.label] = (labelCounts[r.classification.label] ?? 0) + 1;

  return { client, period: current, previous, kpis, kpisPrev, daily, ads: adRows, adSets: adSetRows, alerts, labelCounts, hasData: rows.length > 0 };
}

export function byLabelOrder(a: AdRow | AdSetRow, b: AdRow | AdSetRow) {
  return LABELS[a.classification.label].order - LABELS[b.classification.label].order || b.metrics.spend - a.metrics.spend;
}

// ---- Rozbicia: wiek, płeć, region, placement ----

export const DIMENSIONS: Record<string, string> = {
  age: "Wiek",
  gender: "Płeć",
  placement: "Placement",
  region: "Region",
};

export type BreakdownRow = {
  value: string;
  metrics: Metrics;
  spendShare: number;
  verdict: "better" | "worse" | "neutral";
};

const GENDER: Record<string, string> = { male: "Mężczyźni", female: "Kobiety", unknown: "Nieznana" };

export function breakdownLabel(dimension: string, value: string): string {
  if (dimension === "gender") return GENDER[value] ?? value;
  if (dimension === "placement") return value.replace(/_/g, " ");
  return value;
}

export async function getBreakdowns(client: Client, period: Period): Promise<Record<string, BreakdownRow[]>> {
  const rows = await prisma.breakdownInsight.findMany({
    where: { clientId: client.id, date: { gte: toDate(period.start), lte: toDate(period.end) } },
    select: { dimension: true, value: true, spend: true, impressions: true, clicks: true, leads: true, bookings: true },
  });
  return computeBreakdowns(rows, client.targetCostPerBooking);
}

export function computeBreakdowns(
  rows: (Totals & { dimension: string; value: string })[],
  targetCostPerBooking: number,
): Record<string, BreakdownRow[]> {
  const out: Record<string, BreakdownRow[]> = {};
  for (const [dimension, list] of groupBy(rows, (r) => r.dimension)) {
    const total = derive(sumTotals(list));
    out[dimension] = [...groupBy(list, (r) => r.value)]
      .map(([value, vals]) => {
        const metrics = derive(sumTotals(vals));
        let verdict: BreakdownRow["verdict"] = "neutral";
        if (total.cpb !== null) {
          if (metrics.cpb !== null && metrics.bookings >= 2 && metrics.cpb <= total.cpb * 0.8) verdict = "better";
          else if ((metrics.cpb !== null && metrics.cpb >= total.cpb * 1.25 && metrics.spend >= targetCostPerBooking) || (metrics.bookings === 0 && metrics.spend >= targetCostPerBooking))
            verdict = "worse";
        }
        return { value, metrics, spendShare: total.spend ? (metrics.spend / total.spend) * 100 : 0, verdict };
      })
      .filter((r) => r.metrics.spend > 0)
      .sort((a, b) => b.metrics.spend - a.metrics.spend);
  }
  return out;
}

// ---- Rekomendacje w języku naturalnym ----

function plural(n: number, one: string, few: string, many: string) {
  if (n === 1) return one;
  const d = n % 10;
  const t = n % 100;
  return d >= 2 && d <= 4 && (t < 12 || t > 14) ? few : many;
}

export function recommendations(a: ClientAnalytics, breakdowns?: Record<string, BreakdownRow[]>): string[] {
  const fmt = (v: number | null) => (v === null ? "—" : Math.round(v).toLocaleString("pl-PL"));
  const cur = a.client.currency;
  const out: string[] = [];
  const active = a.ads.filter((r) => r.active);

  for (const r of active.filter((r) => r.classification.label === "scale").slice(0, 3))
    out.push(`Skaluj „${r.ad.name}” — koszt spotkania ${fmt(r.metrics.cpb)} ${cur} przy ${fmt(r.metrics.bookings)} spotkaniach. Podnieś budżet zestawu o 20–30% albo zduplikuj reklamę do nowego zestawu.`);
  for (const r of active.filter((r) => r.classification.label === "kill").slice(0, 5))
    out.push(`Wyłącz „${r.ad.name}” — ${r.classification.reasons[0]}`);
  const fatigued = active.filter((r) => r.ad.frequency7d !== null && r.ad.frequency7d > a.client.maxFrequency && ["winner", "scale", "neutral"].includes(r.classification.label));
  for (const r of fatigued.slice(0, 3))
    out.push(`Odśwież „${r.ad.name}” — działa, ale frequency ${r.ad.frequency7d?.toFixed(1)}. Nagraj nowy hook do tego samego kąta.`);
  const cheapLeads = active.filter((r) => r.classification.reasons.some((x) => x.startsWith("Leady są tanie")));
  if (cheapLeads.length)
    out.push(`${cheapLeads.length} ${plural(cheapLeads.length, "reklama daje", "reklamy dają", "reklam daje")} tanie leady, które się nie umawiają — sprawdź, czy obietnica w reklamie zgadza się z VSL i ofertą rozmowy.`);
  if (!a.ads.some((r) => ["winner", "scale"].includes(r.classification.label)) && a.kpis.spend > 0)
    out.push("Brak potwierdzonych zwycięskich reklam w tym okresie — przetestuj 3–5 nowych hooków / kątów komunikacji.");
  if (a.alerts.some((x) => x.entityType === "account" && x.severity === "high"))
    out.push("Konto ma krytyczny alert — sprawdź sekcję alertów na górze przed innymi zmianami.");

  if (breakdowns) {
    for (const dim of ["age", "gender", "placement"]) {
      const best = (breakdowns[dim] ?? []).find((b) => b.verdict === "better");
      const worst = (breakdowns[dim] ?? []).find((b) => b.verdict === "worse");
      if (best && a.kpis.cpb)
        out.push(`${DIMENSIONS[dim]}: „${breakdownLabel(dim, best.value)}” ma koszt spotkania ${fmt(best.metrics.cpb)} ${cur} (średnia ${fmt(a.kpis.cpb)}) — rozważ osobny zestaw lub kreacje pod tę grupę.`);
      if (worst)
        out.push(`${DIMENSIONS[dim]}: „${breakdownLabel(dim, worst.value)}” zjada ${Math.round(worst.spendShare)}% budżetu przy ${worst.metrics.bookings ? `koszcie spotkania ${fmt(worst.metrics.cpb)} ${cur}` : "zerze spotkań"} — rozważ wykluczenie.`);
    }
  }
  return out;
}

// ---- Przegląd wszystkich klientów ----

export async function getOverview(days: number) {
  const clients = await prisma.client.findMany({ orderBy: { name: "asc" } });
  const results = await Promise.all(clients.map((c) => getClientAnalytics(c.id, days)));
  return results.filter((r): r is ClientAnalytics => r !== null);
}

export { LABELS };
