import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregateInputs, MONTHLY_FIELDS, type Inputs } from "./fields";
import { DEFAULT_THRESHOLDS, grade, performance } from "./grading";
import { KPIS } from "./kpis";
import { computeMonth, computeQuarter, weeklyResults, type ReportData } from "./report";
import { mondaysInMonth, mondayOf, isoDate } from "./dates";

function entry(over: Partial<Inputs>): Inputs {
  const base: Inputs = Object.fromEntries(MONTHLY_FIELDS.map((f) => [f.key, null]));
  return { ...base, ...over } as Inputs;
}

function data(monthly: [string, Inputs][], extra: Partial<ReportData> = {}): ReportData {
  return {
    monthly: new Map(monthly),
    agency: new Map(),
    responses: [],
    fte: new Map(),
    targets: {},
    thresholds: DEFAULT_THRESHOLDS,
    ...extra,
  };
}

const byCode = (res: ReturnType<typeof computeMonth>) => Object.fromEntries(res.map((r) => [r.code, r]));

test("dokładnie 36 KPI, 8 kluczowych, unikalne kody", () => {
  assert.equal(KPIS.length, 36);
  assert.equal(KPIS.filter((k) => k.key).length, 8);
  assert.equal(new Set(KPIS.map((k) => k.code)).size, 36);
});

test("grading wg progów 65 / 95 / 120", () => {
  assert.equal(grade(64.9), "RED");
  assert.equal(grade(65), "ORANGE");
  assert.equal(grade(94.9), "ORANGE");
  assert.equal(grade(95), "GREEN");
  assert.equal(grade(120), "GREEN");
  assert.equal(grade(120.1), "GOD");
  assert.equal(grade(null), "NONE");
  // niżej = lepiej: churn 4.2% przy normie 4% → 95.2% normy
  assert.equal(grade(performance(4.2, 4, true)), "GREEN");
  assert.equal(grade(performance(0, 4, true)), "GOD");
  assert.equal(grade(performance(8, 4, true)), "RED");
  // NPS ujemny
  assert.equal(grade(performance(-10, 50, false)), "RED");
});

test("retencja: churn, GRR, NRR, expansion, MRR growth", () => {
  const r = byCode(computeMonth(data([["2026-10", entry({
    activeClientsStart: 50, mrrStart: 100000, mrrEnd: 104000, newClients: 3, newMrr: 6000,
    churnedClients: 2, churnMrr: 3000, downgradeMrr: 1000, expansionMrr: 2000,
  })]]), 2026, 10));
  assert.equal(r.LOGO_CHURN.value, 4);
  assert.equal(r.GROSS_MRR_CHURN.value, 4);
  assert.equal(r.GRR.value, 96);
  assert.equal(r.NRR.value, 98);
  assert.equal(r.EXPANSION.value, 2);
  assert.equal(r.MRR_GROWTH.value, 4);
  assert.equal(r.LOGO_CHURN.status, "GREEN");
  assert.equal(r.NRR.status, "GREEN");
});

test("brak danych daje null i status NONE, nie dzielenie przez zero", () => {
  const r = byCode(computeMonth(data([["2026-10", entry({ activeClientsStart: 0, churnedClients: 0 })]]), 2026, 10));
  assert.equal(r.LOGO_CHURN.value, null);
  assert.equal(r.LOGO_CHURN.status, "NONE");
  assert.equal(r.NPS.value, null);
});

test("agregacja zespołu: sumy i średnie ważone", () => {
  const team = aggregateInputs([
    entry({ activeClientsStart: 20, onboardings: 1, avgDaysToFirstLead: 10 }),
    entry({ activeClientsStart: 10, onboardings: 3, avgDaysToFirstLead: 14 }),
  ], MONTHLY_FIELDS)!;
  assert.equal(team.activeClientsStart, 30);
  assert.equal(team.avgDaysToFirstLead, 13);
  assert.equal(team.mrrStart, null);
});

test("NPS z kwartału, CSAT i wskaźnik odpowiedzi z miesiąca", () => {
  const d = (s: string) => new Date(`${s}T12:00:00Z`);
  const r = byCode(computeMonth(data([["2026-11", entry({ surveysSent: 8 })]], {
    responses: [
      { type: "NPS", score: 10, createdAt: d("2026-10-05") },
      { type: "NPS", score: 9, createdAt: d("2026-11-02") },
      { type: "NPS", score: 8, createdAt: d("2026-11-03") },
      { type: "NPS", score: 3, createdAt: d("2026-11-04") },
      { type: "NPS", score: 0, createdAt: d("2026-09-30") }, // poprzedni kwartał
      { type: "CSAT", score: 5, createdAt: d("2026-11-05") },
      { type: "CSAT", score: 3, createdAt: d("2026-11-06") },
    ],
  }), 2026, 11));
  assert.equal(r.NPS.value, 25); // (2 − 1) / 4
  assert.equal(r.CSAT.value, 50);
  assert.equal(r.SURVEY_RESPONSE.value, 62.5); // 5 odpowiedzi w listopadzie / 8 wysłanych
});

test("ARPA kw./kw., czas współpracy i LTV:CAC", () => {
  const months: [string, Inputs][] = [
    ["2026-07", entry({ activeClientsStart: 50, churnedClients: 2, mrrEnd: 100000, newClients: 0 })],
    ["2026-08", entry({ activeClientsStart: 48, churnedClients: 2, mrrEnd: 96000 })],
    ["2026-09", entry({ activeClientsStart: 46, churnedClients: 2, mrrEnd: 92000 })],
    ["2026-10", entry({ activeClientsStart: 44, churnedClients: 2, mrrEnd: 92400, newClients: 0 })],
  ];
  const r = byCode(computeMonth(data(months, {
    agency: new Map([["2026-10", { cac: 5000, grossMarginPct: 50, newClientsTotal: 4, newClientsReferral: 1 }]]),
  }), 2026, 10));
  // ARPA lipiec: 100000/48 = 2083.33; październik: 92400/42 = 2200 → +5.6%
  assert.ok(Math.abs(r.ARPA_GROWTH.value! - 5.6) < 0.01);
  // średni churn ≈ (2/50 + 2/48 + 2/46 + 2/44)/4 ≈ 0.04263 → ~23.46 mies.
  assert.ok(Math.abs(r.LIFETIME.value! - 23.46) < 0.05);
  // LTV = 2200 × 0.5 × 23.46 ≈ 25 800 → LTV:CAC ≈ 5.16
  assert.ok(Math.abs(r.LTV_CAC.value! - 5.16) < 0.02);
  assert.equal(r.REFERRAL.value, 25);
});

test("Upsell Rate i dosprzedaż jednorazowa narastająco w kwartale", () => {
  const r = byCode(computeMonth(data([
    ["2026-10", entry({ activeClientsStart: 40, clientsWithUpsell: 3, oneTimeRevenue: 5000, mrrEnd: 80000 })],
    ["2026-11", entry({ activeClientsStart: 40, clientsWithUpsell: 3, oneTimeRevenue: 11000, mrrEnd: 80000 })],
  ]), 2026, 11));
  assert.equal(r.UPSELL_RATE.value, 15);
  assert.equal(r.ONE_TIME_REV.value, 10);
});

test("kwartał: średnia KPI miesięcznych", () => {
  const q = byCode(computeQuarter(data([
    ["2026-10", entry({ activeClientsStart: 50, churnedClients: 1 })],
    ["2026-11", entry({ activeClientsStart: 50, churnedClients: 3 })],
  ]), 2026, 4));
  assert.equal(q.LOGO_CHURN.value, 4); // (2% + 6%) / 2
});

test("tygodnie: narastająco i proporcjonalna norma expansion", () => {
  const w = (o: Partial<Inputs>): Inputs => ({ activeClientsStart: null, mrrStart: null, churnedClients: null, churnMrr: null, downgradeMrr: null, expansionMrr: null, firstLeads: null, avgDaysToFirstLead: null, healthGreen: null, clientsCplOnTarget: null, ...o });
  const res = Object.fromEntries(weeklyResults(data([]), [
    w({ activeClientsStart: 40, mrrStart: 100000, churnedClients: 1, expansionMrr: 1000, firstLeads: 1, avgDaysToFirstLead: 9, healthGreen: 28 }),
    w({ activeClientsStart: 39, mrrStart: 99000, churnMrr: 2000, expansionMrr: 500, firstLeads: 2, avgDaysToFirstLead: 12, healthGreen: 30 }),
  ], 4).map((r) => [r.code, r]));
  assert.equal(res.LOGO_CHURN.value, 2.5);
  assert.equal(res.NRR.value, 99.5);
  assert.equal(res.EXPANSION.value, 1.5);
  assert.equal(res.EXPANSION.target, 1.5); // 3% × 2/4
  assert.equal(res.TTFL.value, 11);
  assert.ok(Math.abs(res.HEALTH_GREEN.value! - (30 / 39) * 100) < 1e-9);
});

test("daty: poniedziałki miesiąca", () => {
  assert.deepEqual(mondaysInMonth(2026, 10).map(isoDate), ["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"]);
  assert.equal(isoDate(mondayOf(new Date("2026-10-25T10:00:00Z"))), "2026-10-19");
});
