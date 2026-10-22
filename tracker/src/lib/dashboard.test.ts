import { describe, expect, it } from "vitest";
import { buildDashboard, previousRange } from "./dashboard";
import { rangeLabel, rangePresets } from "./ranges";
import { getView } from "./views";
import type { ReportEntry } from "./report";

// Stały zestaw danych; oczekiwane wyniki policzone ręcznie, nie kodem dashboardu.
const entries: ReportEntry[] = [
  // poprzedni okres (tydzień 5–11 paź)
  { dateTo: "2026-10-06", values: { adSpend: 500, impressions: 20000, clicks: 200, leads: 20, vslMeetingsBooked: 2 } },
  { dateTo: "2026-10-07", values: { plannedMeetings: 4, attendedMeetings: 3, postponedMeetings: 0, cancelledMeetings: 0, noShows: 1, closings: 1, followUpClosings: 0, revenue: 10000, followUpRevenue: 0, plannedFollowUps: 0, followUpsDone: 0 } },
  // bieżący okres (12–25 paź)
  { dateTo: "2026-10-13", values: { adSpend: 1000, impressions: 50000, clicks: 500, leads: 40, vslMeetingsBooked: 4 } },
  { dateTo: "2026-10-14", values: { callsMade: 100, conductedCalls: 40, meetingsBooked: 10 } },
  { dateTo: "2026-10-20", values: { plannedMeetings: 12, attendedMeetings: 9, postponedMeetings: 1, cancelledMeetings: 0, noShows: 2, closings: 3, followUpClosings: 1, revenue: 30000, followUpRevenue: 10000, plannedFollowUps: 4, followUpsDone: 2 } },
];

describe("previousRange", () => {
  it("dni: ten sam rozmiar tuż przed", () => {
    expect(previousRange("2026-10-12", "2026-10-25", "day")).toEqual({ from: "2026-09-28", to: "2026-10-11" });
  });
  it("tygodnie: pełne tygodnie wstecz", () => {
    expect(previousRange("2026-10-12", "2026-10-22", "week")).toEqual({ from: "2026-09-28", to: "2026-10-08" });
  });
  it("miesiące: pełne miesiące wstecz, z przycięciem dnia", () => {
    expect(previousRange("2025-11-01", "2026-10-31", "month")).toEqual({ from: "2024-11-01", to: "2025-10-31" });
    expect(previousRange("2026-03-01", "2026-03-31", "month")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
  });
});

describe("buildDashboard — znane sumy", () => {
  const d = buildDashboard(entries, getView("ogolny"), { from: "2026-10-12", to: "2026-10-25", grouping: "week", today: "2026-10-22" });
  const kpi = (k: string) => d.kpis.find((x) => x.key === k)!;

  it("kafelki: bieżąca i poprzednia wartość", () => {
    expect(kpi("totalRevenue").value).toBe(40000);
    expect(kpi("totalRevenue").prev).toBe(10000);
    expect(kpi("totalClosings").value).toBe(4);
    expect(kpi("roas").value).toBe(40);
    expect(kpi("roas").prev).toBe(20);
    expect(kpi("cac").value).toBe(250);
    expect(kpi("leadToClose").value).toBe(10);
  });

  it("seria wykresu sumuje się do kafelka", () => {
    const s = kpi("totalRevenue").series;
    expect(s).toEqual([null, 40000]);
    expect(kpi("leads").series).toEqual([40, null]);
  });

  it("niepełny ostatni tydzień, gdy obejmuje dziś", () => {
    expect(d.partialLast).toBe(true);
  });

  it("lejek względem leadów", () => {
    const funnel = d.panels[0].rows;
    expect(funnel.map((r) => r.value)).toEqual([40, 14, 9, 4]);
    expect(funnel.map((r) => r.pct)).toEqual([100, 35, 22.5, 10]);
  });

  it("brak danych to „—”, nie 0", () => {
    const empty = buildDashboard([], getView("ogolny"), { from: "2026-10-12", to: "2026-10-25", grouping: "week", today: "2026-10-22" });
    expect(empty.kpis.every((k) => k.value === null && k.prev === null)).toBe(true);
  });
});

describe("zakresy", () => {
  it("4 tygodnie zaczynają się w poniedziałek", () => {
    const p = rangePresets("2026-10-22").find((x) => x.key === "4w")!;
    expect(p).toMatchObject({ from: "2026-09-28", to: "2026-10-22", grouping: "week" });
  });
  it("poprzedni miesiąc i podpis własnego zakresu", () => {
    const p = rangePresets("2026-10-22").find((x) => x.key === "lastMonth")!;
    expect([p.from, p.to]).toEqual(["2026-09-01", "2026-09-30"]);
    expect(rangeLabel("2026-10-06", "2026-10-17", "2026-10-22")).toBe("6 paź – 17 paź 2026");
  });
});
