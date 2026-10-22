import { describe, expect, it } from "vitest";
import { buildReport } from "./report";

describe("buildReport", () => {
  const entries = [
    { dateTo: "2026-10-20", values: { adSpend: 100, leads: 4 } },
    { dateTo: "2026-10-22", values: { adSpend: 200, leads: 4 } },
    { dateTo: "2026-10-27", values: { adSpend: 300, leads: 2 } }, // wpis zbiorczy liczy się do tygodnia „Daty do”
    { dateTo: "2026-11-02", values: { adSpend: 999, leads: 1 } }, // poza zakresem
  ];
  const report = buildReport(entries, "2026-10-19", "2026-11-01", "week");

  it("dzieli na tygodnie i liczy wskaźniki z sum", () => {
    expect(report.columns.map((c) => c.key)).toEqual(["2026-10-19", "2026-10-26"]);
    expect(report.columns[0].sums.adSpend).toBe(300);
    expect(report.columns[0].metrics.cpl).toBe(37.5);
    expect(report.columns[1].metrics.cpl).toBe(150);
  });

  it("razem pomija wpisy spoza zakresu", () => {
    expect(report.total.sums.adSpend).toBe(600);
    expect(report.total.entryCount).toBe(3);
    expect(report.total.metrics.cpl).toBe(60);
  });
});
