import { describe, expect, it } from "vitest";
import { computeMetrics, ratio, sumValues } from "./metrics";

describe("ratio", () => {
  it("zwraca null przy zerowym mianowniku", () => {
    expect(ratio(5, 0)).toBeNull();
    expect(ratio(1, 4, 100)).toBe(25);
  });
});

describe("computeMetrics", () => {
  const sums = sumValues([
    { values: { adSpend: 1000, impressions: 50000, clicks: 500, leads: 40, vslMeetingsBooked: 4 } },
    { values: { callsMade: 100, conductedCalls: 40, meetingsBooked: 10 } },
    {
      values: {
        plannedMeetings: 12, attendedMeetings: 9, noShows: 2, closings: 3, revenue: 30000,
        plannedFollowUps: 4, followUpsDone: 2, followUpClosings: 1, followUpRevenue: 10000,
      },
    },
  ]);
  const m = computeMetrics(sums);

  it("liczy marketing", () => {
    expect(m.cpm).toBe(20);
    expect(m.ctr).toBe(1);
    expect(m.cpc).toBe(2);
    expect(m.cpl).toBe(25);
    expect(m.pageConversion).toBe(8);
    expect(m.vslBookingRate).toBe(10);
    expect(m.marketingCostPerCall).toBe(250);
  });

  it("liczy setting", () => {
    expect(m.pickupRate).toBe(40);
    expect(m.bookingRate).toBe(25); // umówione przez settera / leady
  });

  it("liczy sprzedaż z follow-upami", () => {
    expect(m.sur).toBe(75);
    expect(m.cp).toBeCloseTo(33.33, 2);
    expect(m.followUpShowRate).toBe(50);
    expect(m.followUpClosingRate).toBe(50);
    expect(m.avgDealValue).toBe(10000);
    expect(m.noShowRate).toBeCloseTo(16.67, 2);
  });

  it("liczy wskaźniki łączne", () => {
    expect(m.totalCostPerCall).toBeCloseTo(71.43, 2);
    expect(m.totalBookingRate).toBe(35);
    expect(m.leadToClose).toBe(10);
    expect(m.cac).toBe(250);
    expect(m.roas).toBe(40);
    expect(m.cacMarketing).toBe(2.5);
  });

  it("sumuje przed dzieleniem, a nie uśrednia procenty", () => {
    const s = sumValues([
      { values: { callsMade: 1, conductedCalls: 1 } },
      { values: { callsMade: 99, conductedCalls: 0 } },
    ]);
    expect(computeMetrics(s).pickupRate).toBe(1);
  });
});
