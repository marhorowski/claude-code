import { describe, expect, it } from "vitest";
import { findConflict, parseEntry, parseNumber } from "./entries";

describe("parseNumber", () => {
  it("akceptuje polski zapis", () => {
    expect(parseNumber("1 234,50")).toBe(1234.5);
    expect(parseNumber("")).toBeNaN();
  });
});

describe("parseEntry", () => {
  const setting = { area: "setting", dateFrom: "2026-10-22", callsMade: "50", conductedCalls: "20", meetingsBooked: "5" };

  it("przyjmuje poprawny wpis dzienny", () => {
    const r = parseEntry(setting);
    expect(r.ok && r.entry).toEqual({
      area: "setting", dateFrom: "2026-10-22", dateTo: "2026-10-22",
      values: { callsMade: 50, conductedCalls: 20, meetingsBooked: 5 }, notes: null,
    });
  });

  it("odrzuca puste, ujemne i ułamkowe sztuki", () => {
    const r = parseEntry({ ...setting, callsMade: "", conductedCalls: "-1", meetingsBooked: "2,5" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toHaveLength(3);
  });

  it("odrzuca odwrócony zakres dat", () => {
    expect(parseEntry({ ...setting, dateTo: "2026-10-01" }).ok).toBe(false);
  });
});

describe("findConflict", () => {
  const existing = [{ id: "a", dateFrom: "2026-10-01", dateTo: "2026-10-07" }];

  it("ten sam zakres nie jest kolizją (wpis zostanie zastąpiony)", () => {
    expect(findConflict(existing, { dateFrom: "2026-10-01", dateTo: "2026-10-07" })).toBeNull();
  });

  it("dzień wewnątrz wpisu zbiorczego jest kolizją", () => {
    expect(findConflict(existing, { dateFrom: "2026-10-03", dateTo: "2026-10-03" })?.id).toBe("a");
  });

  it("sąsiedni dzień nie jest kolizją, a edytowany wpis jest pomijany", () => {
    expect(findConflict(existing, { dateFrom: "2026-10-08", dateTo: "2026-10-08" })).toBeNull();
    expect(findConflict(existing, { dateFrom: "2026-10-02", dateTo: "2026-10-09" }, "a")).toBeNull();
  });
});
