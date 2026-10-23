import { describe, expect, it } from "vitest";
import { buildDashboard } from "./dashboard";
import { DEFAULT_TARGETS, goalForMonth, kpiStatus, maxCac, parseOffer, parseTargets, planFromRevenue, revenueGoalFor, type Offer } from "./kpi";
import { getView } from "./views";
import type { ReportEntry } from "./report";

// Oczekiwane wyniki policzone ręcznie.
const offer: Offer = {
  price: 10000,
  closerPct: 10,
  setterPct: 5,
  costs: [
    { name: "Płatności", kind: "percent", value: 5 },
    { name: "Onboarding", kind: "perSale", value: 500 },
  ],
};
const entries: ReportEntry[] = [
  { dateTo: "2026-10-13", values: { adSpend: 1000, leads: 40 } },
  { dateTo: "2026-10-20", values: { closings: 3, followUpClosings: 1, revenue: 30000, followUpRevenue: 10000 } },
];
const range = { from: "2026-10-12", to: "2026-10-25", grouping: "week" as const, today: "2026-10-26" };

describe("ustawienia oferty i zysk", () => {
  it("maksymalny CAC: cena po prowizjach i kosztach", () => {
    expect(maxCac(offer)).toBe(7500); // 10 000 × 80% − 500
    expect(maxCac({ ...offer, price: null })).toBeNull();
  });

  it("zysk i koszty jako % przychodu", () => {
    const m = buildDashboard(entries, getView("ogolny"), range, { offer }).total.metrics;
    // prowizje 6000; inne: 2000 (5%) + 2000 (4 × 500); reklamy 1000
    expect(m.commissions).toBe(6000);
    expect(m.otherCosts).toBe(4000);
    expect(m.costsTotal).toBe(11000);
    expect(m.profit).toBe(29000);
    expect(m.margin).toBe(72.5);
    expect(m.profitPerSale).toBe(7250);
    expect(m.commissionsPct).toBe(15);
    expect(m.costsPct).toBeCloseTo(27.5);
    expect(m.cacTotal).toBeCloseTo(27.5);
    expect(m.cacMarketing).toBe(2.5);
  });

  it("bez ustawień oferty zysk to „—”", () => {
    const d = buildDashboard(entries, getView("ogolny"), range);
    expect(d.kpis.find((k) => k.key === "profit")!.value).toBeNull();
  });

  it("odczyt z JSON odrzuca śmieci; brak celów = standard agencji", () => {
    expect(parseOffer(null)).toBeNull();
    expect(parseOffer({ price: 5, costs: [{ name: "x", kind: "monthly", value: 1 }, { name: "y", kind: "perSale", value: 2 }] })).toEqual({
      price: 5, closerPct: 0, setterPct: 0, costs: [{ name: "y", kind: "perSale", value: 2 }],
    });
    expect(parseTargets({ cpl: 30, nieznany: 5, roas: 0, cp: "20" })).toEqual({ cpl: 30 });
    expect(parseTargets(null)).toEqual(DEFAULT_TARGETS);
  });
});

describe("cel przychodu i plan lejka", () => {
  it("plan wstecz od przychodu ze standardowych celów", () => {
    const p = planFromRevenue(255000, DEFAULT_TARGETS, offer);
    // 85% ceny = 8500 zł → 30 sprzedaży; / 35% CP; / 75% SUR; / 23% booking
    expect(p.totalClosings).toBe(30);
    expect(p.attendedMeetings).toBeCloseTo(85.71, 2);
    expect(p.bookedTotal).toBeCloseTo(114.29, 2);
    expect(p.leads).toBeCloseTo(496.89, 2);
    expect(p.meetingsBooked).toBeCloseTo(74.53, 2); // 15% leadów
    expect(p.vslMeetingsBooked).toBeCloseTo(39.75, 2); // 8% leadów
    expect(p.adSpend).toBeCloseTo(9937.89, 2); // × CPL 20 zł
    expect(p.profit).toBe(127500);
  });

  it("bez ceny plan kończy się na przychodzie i zysku", () => {
    const p = planFromRevenue(100000, DEFAULT_TARGETS, null);
    expect(p.totalClosings).toBeNull();
    expect(p.leads).toBeNull();
    expect(p.profit).toBe(50000);
  });

  it("cel trwa do zmiany; zakres dostaje część proporcjonalną do dni", () => {
    const goals = { "2026-09": 300000, "2026-11": 600000 };
    expect(goalForMonth(goals, "2026-08")).toBeNull();
    expect(goalForMonth(goals, "2026-10")).toBe(300000);
    expect(revenueGoalFor(goals, "2026-10-01", "2026-10-31")).toBeCloseTo(300000);
    // 31 paź (1/31 z 300 tys.) + 1–2 lis (2/30 z 600 tys.)
    expect(revenueGoalFor(goals, "2026-10-31", "2026-11-02")).toBeCloseTo(300000 / 31 + 40000);
    expect(revenueGoalFor({}, "2026-10-01", "2026-10-31")).toBeNull();
  });
});

describe("status KPI", () => {
  it("progi wyżej = lepiej", () => {
    expect(kpiStatus(125, 100, "higher")).toBe("god");
    expect(kpiStatus(90, 100, "higher")).toBe("on");
    expect(kpiStatus(60, 100, "higher")).toBe("below");
    expect(kpiStatus(59, 100, "higher")).toBe("critical");
  });
  it("progi niżej = lepiej", () => {
    expect(kpiStatus(80, 100, "lower")).toBe("god");
    expect(kpiStatus(111, 100, "lower")).toBe("on");
    expect(kpiStatus(167, 100, "lower")).toBe("below");
    expect(kpiStatus(168, 100, "lower")).toBe("critical");
  });
  it("brak wartości albo celu: bez statusu", () => {
    expect(kpiStatus(null, 100, "higher")).toBeNull();
    expect(kpiStatus(5, null, "higher")).toBeNull();
  });

  it("kafelki: cele względne i wolumeny z celu przychodu", () => {
    const targets = { ...DEFAULT_TARGETS };
    const goals = { "2026-10": 310000 }; // 10 000 zł dziennie
    const d = buildDashboard(entries, getView("ogolny"), range, { offer, targets, goals });
    const k = (key: string) => d.kpis.find((x) => x.key === key)!;
    expect(k("totalRevenue").target).toBeCloseTo(140000); // 14 dni
    expect(k("totalRevenue").status).toBe("critical"); // 40 / 140 tys.
    expect(k("roas").status).toBe("god"); // 40× przy celu 10×
    expect(k("totalClosings").target).toBeCloseTo(140000 / 8500);
    expect(k("leadToClose").status).toBe("god"); // 10% przy celu 6%
    expect(d.statusOf(d.total, "avgDealValue")).toBe("on"); // 10 000 przy celu 8 500 (85% ceny) = 118%
    expect(d.statusOf(d.total, "profitPerSale")).toBe("god"); // 7250 przy celu 50% × 10 000
  });
});
