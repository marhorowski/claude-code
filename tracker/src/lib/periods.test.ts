import { describe, expect, it } from "vitest";
import { bucketKey, bucketLabel, bucketsInRange, crossesMonth, daysInRange, isIsoDate, isoWeek } from "./periods";

describe("periods", () => {
  it("rozpoznaje tydzień ISO, także na przełomie roku", () => {
    expect(isoWeek("2026-10-22")).toEqual({ year: 2026, week: 43 });
    expect(isoWeek("2027-01-01")).toEqual({ year: 2026, week: 53 });
    expect(isoWeek("2024-12-30")).toEqual({ year: 2025, week: 1 });
  });

  it("grupuje po poniedziałku i miesiącu", () => {
    expect(bucketKey("2026-10-22", "week")).toBe("2026-10-19");
    expect(bucketKey("2026-10-19", "week")).toBe("2026-10-19");
    expect(bucketKey("2026-10-25", "week")).toBe("2026-10-19");
    expect(bucketKey("2026-10-22", "month")).toBe("2026-10");
  });

  it("wypisuje wszystkie okresy w zakresie", () => {
    expect(bucketsInRange("2026-10-01", "2026-10-03", "day")).toEqual(["2026-10-01", "2026-10-02", "2026-10-03"]);
    expect(bucketsInRange("2026-09-28", "2026-10-12", "week")).toEqual(["2026-09-28", "2026-10-05", "2026-10-12"]);
    expect(bucketsInRange("2026-09-15", "2026-11-01", "month")).toEqual(["2026-09", "2026-10", "2026-11"]);
  });

  it("opisuje okresy po polsku", () => {
    expect(bucketLabel("2026-10-19", "week")).toBe("T43 (19 paź–25 paź)");
    expect(bucketLabel("2026-10", "month")).toBe("paź 2026");
  });

  it("liczy dni i wykrywa przejście przez miesiąc", () => {
    expect(daysInRange("2026-10-01", "2026-10-31")).toBe(31);
    expect(crossesMonth("2026-10-28", "2026-11-03")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
  });
});
