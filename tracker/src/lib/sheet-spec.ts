// Wskaźniki w postaci, którą da się zapisać formułą arkusza: (suma pól) / (suma pól) × mnożnik.
// Test sheet-spec.test.ts pilnuje, żeby dawały te same wyniki co METRICS w aplikacji.
import { AREAS } from "./fields";
import { METRICS } from "./metrics";

export interface SheetMetric {
  key: string;
  label: string;
  unit: string;
  num: string[];
  den: string[];
  mult: number;
}

const FORMULAS: Record<string, { num: string[]; den?: string[]; mult?: number }> = {
  cpm: { num: ["adSpend"], den: ["impressions"], mult: 1000 },
  ctr: { num: ["clicks"], den: ["impressions"], mult: 100 },
  cpc: { num: ["adSpend"], den: ["clicks"] },
  pageConversion: { num: ["leads"], den: ["clicks"], mult: 100 },
  cpl: { num: ["adSpend"], den: ["leads"] },
  vslBookingRate: { num: ["vslMeetingsBooked"], den: ["leads"], mult: 100 },
  marketingCostPerCall: { num: ["adSpend"], den: ["vslMeetingsBooked"] },
  pickupRate: { num: ["conductedCalls"], den: ["callsMade"], mult: 100 },
  bookingRate: { num: ["meetingsBooked"], den: ["callsMade"], mult: 100 },
  sur: { num: ["attendedMeetings"], den: ["plannedMeetings"], mult: 100 },
  noShowRate: { num: ["noShows"], den: ["plannedMeetings"], mult: 100 },
  cp: { num: ["closings"], den: ["attendedMeetings"], mult: 100 },
  followUpShowRate: { num: ["followUpsDone"], den: ["plannedFollowUps"], mult: 100 },
  followUpClosingRate: { num: ["followUpClosings"], den: ["followUpsDone"], mult: 100 },
  avgDealValue: { num: ["revenue", "followUpRevenue"], den: ["closings", "followUpClosings"] },
  totalClosings: { num: ["closings", "followUpClosings"] },
  totalRevenue: { num: ["revenue", "followUpRevenue"] },
  totalCostPerCall: { num: ["adSpend"], den: ["meetingsBooked", "vslMeetingsBooked"] },
  totalBookingRate: { num: ["meetingsBooked", "vslMeetingsBooked"], den: ["leads"], mult: 100 },
  leadToClose: { num: ["closings", "followUpClosings"], den: ["leads"], mult: 100 },
  cac: { num: ["adSpend"], den: ["closings", "followUpClosings"] },
  roas: { num: ["revenue", "followUpRevenue"], den: ["adSpend"] },
};

export const SHEET_METRICS: SheetMetric[] = METRICS.map((m) => {
  const f = FORMULAS[m.key];
  if (!f) throw new Error(`Brak formuły arkusza dla wskaźnika ${m.key}`);
  return { key: m.key, label: m.label, unit: m.unit, num: f.num, den: f.den ?? [], mult: f.mult ?? 1 };
});

/** Schemat wysyłany do skryptu: kolumny zakładek z danymi i wskaźniki do zakładek z formułami. */
export function sheetSchema() {
  return {
    fields: Object.fromEntries(AREAS.map((a) => [a.key, a.fields.map((f) => ({ key: f.key, label: f.label, unit: f.unit }))])),
    metrics: SHEET_METRICS,
  };
}

export type SheetSchema = ReturnType<typeof sheetSchema>;
