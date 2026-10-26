// Mapowanie zdarzeń Meta (actions) na leady i umówione spotkania.

export type MetaAction = { action_type: string; value: string };

// Kolejność ma znaczenie: bierzemy pierwszy typ, który występuje na koncie
// (nie sumujemy, bo Meta raportuje to samo zdarzenie pod kilkoma nazwami).
export const LEAD_CANDIDATES = [
  "lead",
  "offsite_conversion.fb_pixel_lead",
  "onsite_web_lead",
  "onsite_conversion.lead_grouped",
];

export const BOOKING_CANDIDATES = [
  "schedule_total",
  "schedule_website",
  "offsite_conversion.fb_pixel_schedule",
  "onsite_web_schedule",
];

export function actionTypesIn(actions: MetaAction[] | null | undefined): string[] {
  return (actions ?? []).map((a) => a.action_type);
}

export function resolveActionType(
  configured: string | null | undefined,
  candidates: string[],
  available: Iterable<string>,
): string | null {
  if (configured && configured.trim()) return configured.trim();
  const set = new Set(available);
  return candidates.find((c) => set.has(c)) ?? null;
}

export function actionValue(actions: MetaAction[] | null | undefined, type: string | null): number {
  if (!type || !actions) return 0;
  const found = actions.find((a) => a.action_type === type);
  const v = found ? Number(found.value) : 0;
  return isFinite(v) ? v : 0;
}

export type ConversionMapping = { leadType: string | null; bookingType: string | null };

export function resolveMapping(
  client: { leadActionType: string | null; bookingActionType: string | null },
  available: Iterable<string>,
): ConversionMapping {
  const list = [...available];
  return {
    leadType: resolveActionType(client.leadActionType, LEAD_CANDIDATES, list),
    bookingType: resolveActionType(client.bookingActionType, BOOKING_CANDIDATES, list),
  };
}

export function conversions(actions: MetaAction[] | null | undefined, mapping: ConversionMapping) {
  return {
    leads: actionValue(actions, mapping.leadType),
    bookings: actionValue(actions, mapping.bookingType),
  };
}
