import { describe, expect, it } from "vitest";
import { buildDashboard } from "./dashboard";
import { kpiStatus, maxCac, monthShare, parseOffer, parseTargets, type Offer } from "./kpi";
import { getView } from "./views";

// Oczekiwane wyniki policzone ręcznie.
const offer: Offer = {
  price: 10000,
  closerPct: 10,
  setterPct: 5,
  costs: [
    { name: "Płatności", kind: "percent", value: 5 },
    { name: "Onboarding", kind: "perSale", value: 500 },
    { name: "Narzędzia", kind: "monthly", value: 3100 }, // październik: 100 zł dziennie
  ],
};
const entries = [
  { dateTo: "2026-10-13", values: { adSpend: 1000, leads: 40 } },
  { dateTo: "2026-10-20", values: { closings: 3, followUpClosings: 1, revenue: 30000, followUpRevenue: 10000 } },
];
const range = { from: "2026-10-12", to: "2026-10-25", grouping: "week" as const, today: "2026-10-26" };

describe("ustawienia oferty i zysk", () => {
  it("monthShare: pełny miesiąc = 1, dni ułamkiem swojego miesiąca", () => {
    expect(monthShare("2026-02-01", "2026-02-28")).toBeCloseTo(1);
    expect(monthShare("2026-01-17", "2026-02-14")).toBeCloseTo(15 / 31 + 14 / 28);
  });

  it("maksymalny CAC: cena po prowizjach i kosztach", () => {
    expect(maxCac(offer)).toBe(7500); // 10 000 × 80% − 500
    expect(maxCac({ ...offer, price: null })).toBeNull();
  });

  it("zysk za okres z kosztami miesięcznymi proporcjonalnie do dni", () => {
    const d = buildDashboard(entries, getView("ogolny"), range, { offer });
    const m = d.total.metrics;
    // prowizje 6000; inne: 2000 (5%) + 2000 (4 × 500) + 1400 (14 dni × 100)
    expect(m.commissions).toBe(6000);
    expect(m.otherCosts).toBeCloseTo(5400);
    expect(m.costsTotal).toBeCloseTo(12400);
    expect(m.profit).toBeCloseTo(27600);
    expect(m.margin).toBeCloseTo(69);
    expect(m.profitPerSale).toBeCloseTo(6900);
    // tydzień 12–18: same reklamy i 7 dni kosztów miesięcznych
    expect(d.columns[0].metrics.profit).toBeCloseTo(-1700);
  });

  it("bez ustawień oferty zysk to „—”", () => {
    const d = buildDashboard(entries, getView("ogolny"), range);
    expect(d.kpis.find((k) => k.key === "profit")!.value).toBeNull();
  });

  it("odczyt z JSON odrzuca śmieci", () => {
    expect(parseOffer(null)).toBeNull();
    expect(parseOffer({ price: 5, costs: [{ name: "x", kind: "zły", value: 1 }, { name: "y", kind: "monthly", value: 2 }] })).toEqual({
      price: 5, closerPct: 0, setterPct: 0, costs: [{ name: "y", kind: "monthly", value: 2 }],
    });
    expect(parseTargets({ cac: 300, nieznany: 5, roas: 0, cp: "20" })).toEqual({ cac: 300 });
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

  it("kafelki i kolumny: cele miesięczne skalowane do okresu", () => {
    const targets = { cac: 300, totalClosings: 10, roas: 20, leadToClose: 20 };
    const d = buildDashboard(entries, getView("ogolny"), range, { offer, targets });
    const k = (key: string) => d.kpis.find((x) => x.key === key)!;
    expect(k("cac").status).toBe("on"); // 250 / 300
    expect(k("totalClosings").target).toBeCloseTo((10 * 14) / 31);
    expect(k("totalClosings").status).toBe("below"); // 4 / 4,52 = 89%
    expect(k("roas").status).toBe("god");
    expect(k("leadToClose").status).toBe("critical");
    expect(d.statusOf(d.columns[1], "totalClosings")).toBe("god"); // tydzień: cel 10 × 7/31
  });
});
