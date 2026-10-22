import { describe, expect, it } from "vitest";
import { METRICS } from "./metrics";
import { SHEET_METRICS } from "./sheet-spec";

// Arkusz liczy: SUMA(num) / SUMA(den) × mult, a puste przy dzieleniu przez zero.
const sheetValue = (m: (typeof SHEET_METRICS)[number], s: Record<string, number>) => {
  const sum = (keys: string[]) => keys.reduce((acc, k) => acc + (s[k] ?? 0), 0);
  if (m.den.length === 0) return sum(m.num) * m.mult;
  const den = sum(m.den);
  return den ? (sum(m.num) / den) * m.mult : null;
};

describe("wskaźniki w arkuszu = wskaźniki w aplikacji", () => {
  const samples = [
    { adSpend: 1000.5, impressions: 50000, clicks: 500, leads: 40, vslMeetingsBooked: 4, callsMade: 100, conductedCalls: 40, meetingsBooked: 10,
      plannedMeetings: 12, attendedMeetings: 9, noShows: 2, closings: 3, followUpClosings: 1, revenue: 30000, followUpRevenue: 10000, plannedFollowUps: 4, followUpsDone: 2 },
    { adSpend: 0, impressions: 0, clicks: 0, leads: 7, vslMeetingsBooked: 0, callsMade: 3, conductedCalls: 0, meetingsBooked: 1,
      plannedMeetings: 0, attendedMeetings: 0, noShows: 0, closings: 0, followUpClosings: 0, revenue: 0, followUpRevenue: 0, plannedFollowUps: 0, followUpsDone: 0 },
  ];

  it("każdy wskaźnik aplikacji ma formułę arkusza", () => {
    expect(SHEET_METRICS.map((m) => m.key)).toEqual(METRICS.map((m) => m.key));
  });

  for (const [i, s] of samples.entries()) {
    it(`te same wyniki (próbka ${i + 1})`, () => {
      for (const m of SHEET_METRICS) {
        const app = METRICS.find((x) => x.key === m.key)!.calc(s);
        const sheet = sheetValue(m, s);
        if (app === null) expect(sheet, m.key).toBeNull();
        else expect(sheet, m.key).toBeCloseTo(app, 9);
      }
    });
  }
});
