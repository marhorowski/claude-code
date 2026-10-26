import { describe, expect, it } from "vitest";
import { classify, type Thresholds } from "../src/lib/analytics/classify";

const t: Thresholds = { targetCostPerBooking: 200, targetCpl: 40, minBookingsForWin: 3, killSpendMultiplier: 2, maxFrequency: 3 };
const tot = (spend: number, leads: number, bookings: number) => ({ spend, impressions: 10000, clicks: 150, leads, bookings });

describe("ocena reklam", () => {
  it("do skalowania: tani koszt spotkania, stabilna, niska frequency", () => {
    const r = classify({ totals: tot(1500, 40, 10), recent: tot(450, 12, 3), frequency7d: 1.8, active: true }, t);
    expect(r.label).toBe("scale");
  });

  it("wygrana, ale nie skalować przy wysokiej frequency", () => {
    const r = classify({ totals: tot(1500, 40, 10), recent: tot(450, 12, 3), frequency7d: 3.4, active: true }, t);
    expect(r.label).toBe("winner");
  });

  it("wygrana, ale ostatnie dni bez spotkań → obserwować", () => {
    const r = classify({ totals: tot(1500, 40, 10), recent: tot(500, 10, 0), frequency7d: 1.5, active: true }, t);
    expect(r.label).toBe("winner");
  });

  it("obiecująca przy za małej liczbie spotkań", () => {
    expect(classify({ totals: tot(300, 10, 2), active: true }, t).label).toBe("promising");
  });

  it("do wyłączenia: wydano 2× cel bez spotkań", () => {
    const r = classify({ totals: tot(450, 15, 0), active: true }, t);
    expect(r.label).toBe("kill");
    expect(r.reasons.join(" ")).toContain("Leady są tanie");
  });

  it("za mało danych poniżej progu wydatku", () => {
    expect(classify({ totals: tot(150, 3, 0), active: true }, t).label).toBe("learning");
  });

  it("słabsza: koszt spotkania powyżej celu", () => {
    expect(classify({ totals: tot(900, 30, 3), active: true }, t).label).toBe("weak");
  });

  it("do wyłączenia: koszt spotkania > 2× cel przy dużym wydatku", () => {
    expect(classify({ totals: tot(1300, 30, 2), active: true }, t).label).toBe("kill");
  });

  it("OK: lekko powyżej celu", () => {
    expect(classify({ totals: tot(660, 20, 3), active: true }, t).label).toBe("neutral");
  });
});
