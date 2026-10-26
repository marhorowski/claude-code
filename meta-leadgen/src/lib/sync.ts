import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { addDays, daysBetween, fromDate, todayInTz, toDate } from "./dates";
import { graphGet, graphGetAll, MetaApiError } from "./meta/graph";
import { actionTypesIn, conversions, resolveMapping, type MetaAction } from "./meta/actions";

const INITIAL_DAYS = 90;
const MIN_LOOKBACK = 7; // Meta dopisuje konwersje wstecz (okno atrybucji), więc zawsze odświeżamy ostatnie dni
const MAX_LOOKBACK = 30;
const CHUNK_DAYS = 30;

const BREAKDOWNS: Record<string, string> = {
  age: "age",
  gender: "gender",
  region: "region",
  placement: "publisher_platform,platform_position",
};

type InsightRow = {
  ad_id: string;
  ad_name?: string;
  adset_id: string;
  adset_name?: string;
  campaign_id: string;
  campaign_name?: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  inline_link_clicks?: string;
  actions?: MetaAction[];
  date_start: string;
};

type BreakdownRow = {
  spend?: string;
  impressions?: string;
  inline_link_clicks?: string;
  actions?: MetaAction[];
  date_start: string;
  [key: string]: unknown;
};

export type SyncResult = {
  since: string;
  until: string;
  days: number;
  initial: boolean;
  ads: number;
  rows: number;
  leads: number;
  bookings: number;
  leadType: string | null;
  bookingType: string | null;
};

const n = (v: string | undefined) => (v ? Number(v) || 0 : 0);
const int = (v: string | undefined) => Math.round(n(v));

function chunks(since: string, until: string): { since: string; until: string }[] {
  const out = [];
  for (let s = since; s <= until; s = addDays(s, CHUNK_DAYS)) {
    const e = addDays(s, CHUNK_DAYS - 1);
    out.push({ since: s, until: e < until ? e : until });
  }
  return out;
}

// Duże konta potrafią dostać od Meta błąd "reduce the amount of data" — wtedy dzielimy zakres dat na pół.
async function fetchInsightsRange<T>(path: string, params: Record<string, unknown>, range: { since: string; until: string }): Promise<T[]> {
  try {
    return await graphGetAll<T>(path, { ...params, time_range: range } as any);
  } catch (e) {
    const tooMuch = e instanceof MetaApiError && (e.code === 1 || /reduce the amount of data/i.test(e.message));
    const days = daysBetween(range.since, range.until);
    if (!tooMuch || days < 1) throw e;
    const mid = addDays(range.since, Math.floor(days / 2));
    return [
      ...(await fetchInsightsRange<T>(path, params, { since: range.since, until: mid })),
      ...(await fetchInsightsRange<T>(path, params, { since: addDays(mid, 1), until: range.until })),
    ];
  }
}

function targetingSummary(t: any): string | null {
  if (!t) return null;
  const parts: string[] = [];
  if (t.age_min || t.age_max) parts.push(`${t.age_min ?? 18}–${t.age_max ?? "65+"}`);
  if (t.genders?.length) parts.push(t.genders.includes(1) && !t.genders.includes(2) ? "mężczyźni" : t.genders.includes(2) && !t.genders.includes(1) ? "kobiety" : "wszyscy");
  const geo = t.geo_locations;
  if (geo?.countries?.length) parts.push(geo.countries.join(", "));
  if (geo?.cities?.length) parts.push(`${geo.cities.length} miast`);
  if (t.custom_audiences?.length) parts.push(`Custom/LAL: ${t.custom_audiences.map((a: any) => a.name).join(", ")}`);
  const interests = (t.flexible_spec ?? []).flatMap((f: any) => [...(f.interests ?? []), ...(f.behaviors ?? [])]);
  if (interests.length) parts.push(`Zainteresowania: ${interests.slice(0, 5).map((i: any) => i.name).join(", ")}${interests.length > 5 ? "…" : ""}`);
  if (t.targeting_automation?.advantage_audience === 1) parts.push("Advantage+ audience");
  if (!interests.length && !t.custom_audiences?.length) parts.push("broad");
  return parts.join(" · ");
}

const AD_FIELDS =
  "id,name,status,effective_status,adset_id,campaign_id,created_time,creative{id,thumbnail_url,image_url,title,body,object_type,video_id,effective_object_story_id,instagram_permalink_url}";

async function fetchAdsByIds(ids: string[]): Promise<any[]> {
  const out: any[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const body = await graphGet<Record<string, any>>("", { ids: batch.join(","), fields: AD_FIELDS }).catch(() => ({}));
    out.push(...Object.values(body));
  }
  return out;
}

function adRecord(clientId: string, a: any) {
  const c = a.creative ?? {};
  const storyId: string | undefined = c.effective_object_story_id;
  return {
    clientId,
    campaignId: a.campaign_id ?? "",
    adSetId: a.adset_id ?? "",
    name: a.name ?? a.id,
    status: a.status ?? null,
    effectiveStatus: a.effective_status ?? null,
    createdTime: a.created_time ? new Date(a.created_time) : null,
    thumbnailUrl: c.thumbnail_url ?? null,
    imageUrl: c.image_url ?? null,
    title: c.title ?? null,
    body: c.body ?? null,
    objectType: c.object_type ?? null,
    videoId: c.video_id ?? null,
    previewUrl: c.instagram_permalink_url ?? (storyId ? `https://www.facebook.com/${storyId}` : null),
  };
}

export async function syncClient(clientId: string): Promise<SyncResult> {
  const client = await prisma.client.findUniqueOrThrow({ where: { id: clientId } });
  if (client.adAccountId.startsWith("demo")) {
    throw new MetaApiError("To jest konto demo z przykładowymi danymi — nie ma czego synchronizować.");
  }

  try {
    const result = await runSync(client);
    await prisma.client.update({
      where: { id: clientId },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: "ok",
        lastSyncMessage: `Zsynchronizowano ${result.days} dni (${result.since} – ${result.until})`,
        initialSyncDone: true,
      },
    });
    return result;
  } catch (e) {
    await prisma.client.update({
      where: { id: clientId },
      data: { lastSyncAt: new Date(), lastSyncStatus: "error", lastSyncMessage: (e as Error).message.slice(0, 500) },
    });
    throw e;
  }
}

async function runSync(client: Awaited<ReturnType<typeof prisma.client.findUniqueOrThrow>>): Promise<SyncResult> {
  const act = `act_${client.adAccountId}`;
  const until = todayInTz(client.timezone);
  const initial = !client.initialSyncDone;
  let lookback = INITIAL_DAYS;
  if (!initial) {
    const sinceLast = client.lastSyncAt ? daysBetween(fromDate(client.lastSyncAt), until) : MAX_LOOKBACK;
    lookback = Math.min(MAX_LOOKBACK, Math.max(MIN_LOOKBACK, sinceLast + 3));
  }
  const since = addDays(until, -(lookback - 1));

  // 1. Struktura konta
  const [campaigns, adSets, ads] = await Promise.all([
    graphGetAll<any>(`${act}/campaigns`, { fields: "id,name,objective,status,effective_status", limit: 200 }),
    graphGetAll<any>(`${act}/adsets`, {
      fields: "id,name,campaign_id,status,effective_status,optimization_goal,daily_budget,lifetime_budget,targeting",
      limit: 200,
    }),
    graphGetAll<any>(`${act}/ads`, { fields: AD_FIELDS, limit: 200 }),
  ]);

  // 2. Dzienne metryki reklam
  const insightParams = {
    level: "ad",
    time_increment: 1,
    use_unified_attribution_setting: true,
    fields: "ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,spend,impressions,reach,inline_link_clicks,actions",
    limit: 500,
  };
  const rows: InsightRow[] = [];
  for (const range of chunks(since, until)) {
    rows.push(...(await fetchInsightsRange<InsightRow>(`${act}/insights`, insightParams, range)));
  }

  // 3. Rozbicia demograficzne / placementy na poziomie konta
  const breakdownRows: { dimension: string; value: string; row: BreakdownRow }[] = [];
  for (const [dimension, breakdowns] of Object.entries(BREAKDOWNS)) {
    for (const range of chunks(since, until)) {
      const data = await fetchInsightsRange<BreakdownRow>(
        `${act}/insights`,
        { level: "account", time_increment: 1, use_unified_attribution_setting: true, breakdowns, fields: "spend,impressions,inline_link_clicks,actions", limit: 500 },
        range,
      );
      for (const row of data) {
        const value = breakdowns
          .split(",")
          .map((k) => String(row[k] ?? "unknown"))
          .join(" · ");
        breakdownRows.push({ dimension, value, row });
      }
    }
  }

  // 4. Frequency z ostatnich 7 dni na reklamę
  const freqRows = await graphGetAll<{ ad_id: string; frequency?: string }>(`${act}/insights`, {
    level: "ad",
    date_preset: "last_7d",
    fields: "ad_id,frequency",
    limit: 500,
  });
  const frequency = new Map(freqRows.map((r) => [r.ad_id, n(r.frequency)]));

  // 5. Mapowanie zdarzeń (lead / Schedule)
  const detected = new Set(client.detectedActionTypes);
  for (const r of rows) actionTypesIn(r.actions).forEach((t) => detected.add(t));
  const mapping = resolveMapping(client, detected);

  // 6. Zapis: struktura
  const adsById = new Map<string, any>(ads.map((a) => [a.id, a]));
  const missing = [...new Set(rows.map((r) => r.ad_id))].filter((id) => !adsById.has(id));
  for (const a of await fetchAdsByIds(missing)) if (a?.id) adsById.set(a.id, a);
  // Reklamy usunięte w Meta: zostaje nazwa z insights
  for (const r of rows) {
    if (!adsById.has(r.ad_id)) adsById.set(r.ad_id, { id: r.ad_id, name: r.ad_name, adset_id: r.adset_id, campaign_id: r.campaign_id, effective_status: "DELETED" });
  }
  const campaignsById = new Map<string, any>(campaigns.map((c) => [c.id, c]));
  const adSetsById = new Map<string, any>(adSets.map((s) => [s.id, s]));
  for (const r of rows) {
    if (!campaignsById.has(r.campaign_id)) campaignsById.set(r.campaign_id, { id: r.campaign_id, name: r.campaign_name, effective_status: "ARCHIVED" });
    if (!adSetsById.has(r.adset_id)) adSetsById.set(r.adset_id, { id: r.adset_id, name: r.adset_name, campaign_id: r.campaign_id, effective_status: "ARCHIVED" });
  }

  const ops: Prisma.PrismaPromise<unknown>[] = [];
  for (const c of campaignsById.values()) {
    const data = { clientId: client.id, name: c.name ?? c.id, objective: c.objective ?? null, status: c.status ?? null, effectiveStatus: c.effective_status ?? null };
    ops.push(prisma.campaign.upsert({ where: { id: c.id }, create: { id: c.id, ...data }, update: data }));
  }
  for (const s of adSetsById.values()) {
    const data = {
      clientId: client.id,
      campaignId: s.campaign_id ?? "",
      name: s.name ?? s.id,
      status: s.status ?? null,
      effectiveStatus: s.effective_status ?? null,
      optimizationGoal: s.optimization_goal ?? null,
      dailyBudget: s.daily_budget ? Number(s.daily_budget) / 100 : null,
      lifetimeBudget: s.lifetime_budget ? Number(s.lifetime_budget) / 100 : null,
      targetingSummary: targetingSummary(s.targeting),
    };
    ops.push(prisma.adSet.upsert({ where: { id: s.id }, create: { id: s.id, ...data }, update: data }));
  }
  for (const a of adsById.values()) {
    const data = { ...adRecord(client.id, a), frequency7d: frequency.get(a.id) ?? null };
    ops.push(prisma.ad.upsert({ where: { id: a.id }, create: { id: a.id, ...data }, update: data }));
  }
  for (let i = 0; i < ops.length; i += 100) await prisma.$transaction(ops.slice(i, i + 100));

  // 7. Zapis: metryki (podmieniamy cały odświeżany zakres)
  const insightData = rows.map((r) => {
    const conv = conversions(r.actions, mapping);
    return {
      clientId: client.id,
      adId: r.ad_id,
      adSetId: r.adset_id,
      campaignId: r.campaign_id,
      date: toDate(r.date_start),
      spend: n(r.spend),
      impressions: int(r.impressions),
      reach: int(r.reach),
      clicks: int(r.inline_link_clicks),
      leads: conv.leads,
      bookings: conv.bookings,
      actions: (r.actions ?? []) as Prisma.InputJsonValue,
    };
  });
  const breakdownData = breakdownRows.map(({ dimension, value, row }) => {
    const conv = conversions(row.actions, mapping);
    return {
      clientId: client.id,
      dimension,
      value,
      date: toDate(row.date_start),
      spend: n(row.spend),
      impressions: int(row.impressions),
      clicks: int(row.inline_link_clicks),
      leads: conv.leads,
      bookings: conv.bookings,
      actions: (row.actions ?? []) as Prisma.InputJsonValue,
    };
  });

  const range = { gte: toDate(since), lte: toDate(until) };
  const writes: Prisma.PrismaPromise<unknown>[] = [
    prisma.dailyInsight.deleteMany({ where: { clientId: client.id, date: range } }),
    prisma.breakdownInsight.deleteMany({ where: { clientId: client.id, date: range } }),
  ];
  for (let i = 0; i < insightData.length; i += 1000) writes.push(prisma.dailyInsight.createMany({ data: insightData.slice(i, i + 1000) }));
  for (let i = 0; i < breakdownData.length; i += 1000) writes.push(prisma.breakdownInsight.createMany({ data: breakdownData.slice(i, i + 1000) }));
  writes.push(prisma.client.update({ where: { id: client.id }, data: { detectedActionTypes: [...detected].sort() } }));
  await prisma.$transaction(writes);

  return {
    since,
    until,
    days: lookback,
    initial,
    ads: adsById.size,
    rows: insightData.length,
    leads: insightData.reduce((s, r) => s + r.leads, 0),
    bookings: insightData.reduce((s, r) => s + r.bookings, 0),
    leadType: mapping.leadType,
    bookingType: mapping.bookingType,
  };
}

// Po zmianie mapowania zdarzeń w ustawieniach przeliczamy zapisane dane bez ponownej synchronizacji.
export async function recomputeConversions(clientId: string) {
  const client = await prisma.client.findUniqueOrThrow({ where: { id: clientId } });
  const mapping = resolveMapping(client, client.detectedActionTypes);
  const [insights, breakdowns] = await Promise.all([
    prisma.dailyInsight.findMany({ where: { clientId }, select: { id: true, actions: true, leads: true, bookings: true } }),
    prisma.breakdownInsight.findMany({ where: { clientId }, select: { id: true, actions: true, leads: true, bookings: true } }),
  ]);
  const ops: Prisma.PrismaPromise<unknown>[] = [];
  for (const r of insights) {
    const c = conversions(r.actions as MetaAction[] | null, mapping);
    if (c.leads !== r.leads || c.bookings !== r.bookings) ops.push(prisma.dailyInsight.update({ where: { id: r.id }, data: c }));
  }
  for (const r of breakdowns) {
    const c = conversions(r.actions as MetaAction[] | null, mapping);
    if (c.leads !== r.leads || c.bookings !== r.bookings) ops.push(prisma.breakdownInsight.update({ where: { id: r.id }, data: c }));
  }
  for (let i = 0; i < ops.length; i += 500) await prisma.$transaction(ops.slice(i, i + 500));
  return { mapping, updated: ops.length };
}
