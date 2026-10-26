import { describe, expect, it } from "vitest";
import { detectDrops, type DailyPoint } from "../src/lib/analytics/alerts";
import { addDays } from "../src/lib/dates";

const end = "2026-10-25";
function series(fn: (i: number, recent: boolean) => Omit<DailyPoint, "date">): DailyPoint[] {
  return Array.from({ length: 17 }, (_, i) => ({ date: addDays(end, -16 + i), ...fn(i, i >= 14) }));
}
const entity = { type: "ad" as const, id: "1", name: "Reklama" };
const opts = { targetCostPerBooking: 200, active: true };
const base = { spend: 100, impressions: 4000, clicks: 60, leads: 4, bookings: 1 };

describe("alerty o spadkach", () => {
  it("stabilne wyniki → brak alertów", () => {
    expect(detectDrops(series(() => base), end, entity, opts)).toEqual([]);
  });

  it("brak spotkań w ostatnich 3 dniach", () => {
    const a = detectDrops(series((_, r) => (r ? { ...base, bookings: 0 } : base)), end, entity, opts);
    expect(a.map((x) => x.metric)).toContain("no_bookings");
  });

  it("wzrost CPL i spadek CTR", () => {
    const a = detectDrops(series((_, r) => (r ? { ...base, clicks: 30, leads: 2 } : base)), end, entity, opts);
    const metrics = a.map((x) => x.metric);
    expect(metrics).toContain("cpl");
    expect(metrics).toContain("ctr");
  });

  it("zatrzymane dostarczanie", () => {
    const a = detectDrops(series((_, r) => (r ? { spend: 5, impressions: 100, clicks: 1, leads: 0, bookings: 0 } : base)), end, entity, opts);
    expect(a).toHaveLength(1);
    expect(a[0].metric).toBe("delivery");
  });
});
