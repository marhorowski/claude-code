// Przykładowe dane do obejrzenia aplikacji bez podłączania Meta.
import { randomBytes } from "node:crypto";
import { prisma } from "./db";
import { addDays, todayInTz, toDate } from "./dates";

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

function thumb(text: string, hue: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},70%,55%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360},70%,35%)"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)"/><text x="60" y="66" font-family="sans-serif" font-size="15" font-weight="700" fill="white" text-anchor="middle">${text}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

type Profile = {
  name: string;
  adSet: number;
  budget: number; // dzienny wydatek
  cpm: number;
  ctr: number; // %
  optin: number; // % kliknięć → lead
  book: number; // % leadów → spotkanie
  freq: number;
  start?: number; // dzień startu (0 = 90 dni temu)
  stop?: number; // dzień wyłączenia
  dropLast3?: boolean;
};

const AD_SETS = [
  { name: "Broad PL 28–55", targeting: "28–55 · wszyscy · PL · broad", campaign: 0 },
  { name: "Advantage+ audience", targeting: "18–65+ · wszyscy · PL · Advantage+ audience · broad", campaign: 0 },
  { name: "LAL 1% — umówione spotkania", targeting: "25–60 · PL · Custom/LAL: LAL 1% Schedule 180d", campaign: 0 },
  { name: "Retargeting VSL 30d", targeting: "PL · Custom/LAL: Obejrzeli VSL 50% 30d", campaign: 1 },
];

const ADS: Profile[] = [
  { name: "VID | Hook: „3 błędy, które…” | v1", adSet: 0, budget: 160, cpm: 32, ctr: 1.6, optin: 32, book: 24, freq: 1.9 },
  { name: "VID | Hook: Historia klienta Ani", adSet: 0, budget: 120, cpm: 34, ctr: 1.3, optin: 28, book: 22, freq: 2.1, start: 40 },
  { name: "IMG | Lista korzyści", adSet: 0, budget: 70, cpm: 29, ctr: 0.7, optin: 20, book: 9, freq: 2.4 },
  { name: "VID | Hook: Mit o cenach", adSet: 1, budget: 140, cpm: 27, ctr: 1.5, optin: 30, book: 18, freq: 1.7, dropLast3: true },
  { name: "VID | UGC testimonial", adSet: 1, budget: 90, cpm: 28, ctr: 1.9, optin: 38, book: 6, freq: 1.8 },
  { name: "CAR | Karuzela 5 kroków", adSet: 1, budget: 60, cpm: 26, ctr: 0.6, optin: 15, book: 8, freq: 2.2, start: 60 },
  { name: "VID | Hook: „Zanim zapłacisz za…”", adSet: 2, budget: 110, cpm: 41, ctr: 1.4, optin: 34, book: 26, freq: 3.6 },
  { name: "VID | Wywiad z ekspertem", adSet: 2, budget: 80, cpm: 39, ctr: 0.9, optin: 22, book: 14, freq: 2.0, stop: 70 },
  { name: "IMG | Zrzut wyników", adSet: 2, budget: 40, cpm: 37, ctr: 1.1, optin: 25, book: 20, freq: 1.5, start: 83 },
  { name: "VID | RT: Odpowiedź na obiekcje", adSet: 3, budget: 45, cpm: 55, ctr: 2.4, optin: 30, book: 35, freq: 4.2 },
  { name: "IMG | RT: Ostatnie miejsca", adSet: 3, budget: 30, cpm: 52, ctr: 1.2, optin: 18, book: 10, freq: 3.9 },
];

const SEGMENTS: Record<string, [string, number, number][]> = {
  // [wartość, udział w budżecie, mnożnik skuteczności]
  age: [["18-24", 0.08, 0.3], ["25-34", 0.27, 1.0], ["35-44", 0.32, 1.35], ["45-54", 0.21, 1.1], ["55-64", 0.09, 0.7], ["65+", 0.03, 0.4]],
  gender: [["female", 0.56, 1.1], ["male", 0.42, 0.88], ["unknown", 0.02, 0.5]],
  placement: [
    ["facebook · feed", 0.34, 1.25], ["instagram · feed", 0.18, 1.0], ["instagram · reels", 0.2, 0.9], ["instagram · story", 0.12, 0.85],
    ["facebook · facebook_reels", 0.08, 0.7], ["audience_network · classic", 0.08, 0.15],
  ],
  region: [
    ["Mazowieckie", 0.24, 1.2], ["Śląskie", 0.13, 0.95], ["Małopolskie", 0.11, 1.1], ["Wielkopolskie", 0.1, 1.0], ["Dolnośląskie", 0.09, 1.05],
    ["Pomorskie", 0.08, 1.0], ["Łódzkie", 0.07, 0.8], ["Lubelskie", 0.05, 0.6], ["Podkarpackie", 0.04, 0.5], ["Kujawsko-Pomorskie", 0.05, 0.85], ["Zachodniopomorskie", 0.04, 0.9],
  ],
};

export async function createDemoClient() {
  const tz = "Europe/Warsaw";
  const end = addDays(todayInTz(tz), -1);
  const start = addDays(end, -89);
  const rand = rng(42);
  const noise = (spread = 0.25) => 1 + (rand() - 0.5) * 2 * spread;
  const poisson = (mean: number) => {
    // wystarczająco dobre przybliżenie dla danych demo
    const L = Math.exp(-mean);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= rand();
    } while (p > L && k < 500);
    return k - 1;
  };

  const suffix = randomBytes(3).toString("hex");
  const client = await prisma.client.create({
    data: {
      name: "Demo: Program coachingowy (VSL)",
      adAccountId: `demo_${suffix}`,
      currency: "PLN",
      timezone: tz,
      targetCostPerBooking: 250,
      targetCpl: 45,
      initialSyncDone: true,
      lastSyncStatus: "ok",
      detectedActionTypes: ["lead", "link_click", "offsite_conversion.fb_pixel_lead", "page_engagement", "schedule_total", "schedule_website", "video_view"],
    },
  });

  const campIds = [`dc1_${suffix}`, `dc2_${suffix}`];
  await prisma.campaign.createMany({
    data: [
      { id: campIds[0], clientId: client.id, name: "LG | VSL | Schedule | Broad", objective: "OUTCOME_LEADS", status: "ACTIVE", effectiveStatus: "ACTIVE" },
      { id: campIds[1], clientId: client.id, name: "LG | VSL | Retargeting", objective: "OUTCOME_LEADS", status: "ACTIVE", effectiveStatus: "ACTIVE" },
    ],
  });
  const setIds = AD_SETS.map((_, i) => `ds${i}_${suffix}`);
  await prisma.adSet.createMany({
    data: AD_SETS.map((s, i) => ({
      id: setIds[i],
      clientId: client.id,
      campaignId: campIds[s.campaign],
      name: s.name,
      status: "ACTIVE",
      effectiveStatus: "ACTIVE",
      optimizationGoal: "OFFSITE_CONVERSIONS",
      dailyBudget: ADS.filter((a) => a.adSet === i).reduce((x, a) => x + a.budget, 0),
      targetingSummary: s.targeting,
    })),
  });

  const insights = [];
  const dailyTotals = new Map<string, { spend: number; impressions: number; clicks: number; leads: number; bookings: number }>();
  for (let i = 0; i < ADS.length; i++) {
    const p = ADS[i];
    const adId = `da${i}_${suffix}`;
    const active = p.stop === undefined;
    await prisma.ad.create({
      data: {
        id: adId,
        clientId: client.id,
        campaignId: campIds[AD_SETS[p.adSet].campaign],
        adSetId: setIds[p.adSet],
        name: p.name,
        status: active ? "ACTIVE" : "PAUSED",
        effectiveStatus: active ? "ACTIVE" : "PAUSED",
        thumbnailUrl: thumb(p.name.split("|")[0].trim(), (i * 47) % 360),
        title: "Umów bezpłatną konsultację",
        body: `${p.name.split("|").slice(1).join(" ").trim()} — obejrzyj krótkie wideo i wybierz termin rozmowy.`,
        objectType: p.name.startsWith("VID") ? "VIDEO" : "SHARE",
        frequency7d: p.freq,
      },
    });
    for (let d = 0; d < 90; d++) {
      if (p.start !== undefined && d < p.start) continue;
      if (p.stop !== undefined && d >= p.stop) continue;
      const date = addDays(start, d);
      const last3 = d >= 87;
      const fatigue = p.freq > 3 ? 1 - (d / 90) * 0.25 : 1; // zmęczenie obniża skuteczność z czasem
      const weekend = [0, 6].includes(new Date(date + "T00:00:00Z").getUTCDay()) ? 0.85 : 1;
      const spend = Math.round(p.budget * noise(0.2) * weekend * 100) / 100;
      const cpm = p.cpm * noise(0.12) * (p.dropLast3 && last3 ? 1.5 : 1);
      const impressions = Math.round((spend / cpm) * 1000);
      const ctr = (p.ctr / 100) * noise(0.15) * fatigue * (p.dropLast3 && last3 ? 0.6 : 1);
      const clicks = Math.round(impressions * ctr);
      const leads = poisson(clicks * (p.optin / 100) * 0.4 * fatigue);
      const bookings = poisson(leads * (p.book / 100) * 0.55 * (p.dropLast3 && last3 ? 0.2 : 1));
      insights.push({
        clientId: client.id,
        adId,
        adSetId: setIds[p.adSet],
        campaignId: campIds[AD_SETS[p.adSet].campaign],
        date: toDate(date),
        spend,
        impressions,
        reach: Math.round(impressions / 1.3),
        clicks,
        leads,
        bookings,
        actions: [
          { action_type: "link_click", value: String(clicks) },
          { action_type: "lead", value: String(leads) },
          { action_type: "schedule_total", value: String(bookings) },
        ],
      });
      const t = dailyTotals.get(date) ?? { spend: 0, impressions: 0, clicks: 0, leads: 0, bookings: 0 };
      t.spend += spend;
      t.impressions += impressions;
      t.clicks += clicks;
      t.leads += leads;
      t.bookings += bookings;
      dailyTotals.set(date, t);
    }
  }
  for (let i = 0; i < insights.length; i += 1000) await prisma.dailyInsight.createMany({ data: insights.slice(i, i + 1000) });

  const breakdowns = [];
  for (const [date, t] of dailyTotals) {
    for (const [dimension, segments] of Object.entries(SEGMENTS)) {
      const weight = segments.reduce((s, [, share, mult]) => s + share * mult, 0);
      for (const [value, share, mult] of segments) {
        const s = share * noise(0.1);
        const eff = mult / weight;
        breakdowns.push({
          clientId: client.id,
          dimension,
          value,
          date: toDate(date),
          spend: Math.round(t.spend * s * 100) / 100,
          impressions: Math.round(t.impressions * s),
          clicks: Math.round(t.clicks * s * Math.sqrt(eff)),
          leads: poisson(t.leads * s * Math.sqrt(eff)),
          bookings: poisson(t.bookings * s * eff),
        });
      }
    }
  }
  for (let i = 0; i < breakdowns.length; i += 1000) await prisma.breakdownInsight.createMany({ data: breakdowns.slice(i, i + 1000) });

  return prisma.client.update({ where: { id: client.id }, data: { lastSyncAt: new Date(), lastSyncMessage: "Dane demo" } });
}
