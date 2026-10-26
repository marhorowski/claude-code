import { describe, expect, it } from "vitest";
import { conversions, resolveMapping } from "../src/lib/meta/actions";

describe("mapowanie zdarzeń", () => {
  const actions = [
    { action_type: "lead", value: "12" },
    { action_type: "offsite_conversion.fb_pixel_lead", value: "12" },
    { action_type: "schedule_total", value: "3" },
    { action_type: "schedule_website", value: "3" },
    { action_type: "offsite_conversion.custom.999", value: "2" },
  ];

  it("wykrywa standardowe Lead i Schedule bez podwójnego liczenia", () => {
    const m = resolveMapping({ leadActionType: null, bookingActionType: null }, actions.map((a) => a.action_type));
    expect(m).toEqual({ leadType: "lead", bookingType: "schedule_total" });
    expect(conversions(actions, m)).toEqual({ leads: 12, bookings: 3 });
  });

  it("używa custom conversion, jeśli ustawiono ręcznie", () => {
    const m = resolveMapping({ leadActionType: null, bookingActionType: "offsite_conversion.custom.999" }, []);
    expect(conversions(actions, m).bookings).toBe(2);
  });

  it("zwraca 0, gdy zdarzenia nie ma", () => {
    const m = resolveMapping({ leadActionType: null, bookingActionType: null }, ["link_click"]);
    expect(m.bookingType).toBeNull();
    expect(conversions(actions, m)).toEqual({ leads: 0, bookings: 0 });
  });
});
