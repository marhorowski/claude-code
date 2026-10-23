import { aggregateInputs, WEEKLY_FIELDS, type Inputs } from "./fields";
import { KPIS, KPI_BY_CODE, type AgencyInputs, type KpiContext, type KpiDef, type KpiUnit, type SurveyStats } from "./kpis";
import { grade, performance, type KpiStatus, type Thresholds } from "./grading";
import { addMonths, monthKey, monthRangeUtc, quarterToDate } from "./dates";

export interface SurveyRow {
  type: string; // NPS | CSAT
  score: number;
  createdAt: Date;
}

export interface ReportData {
  monthly: Map<string, Inputs>; // zagregowane dla zakresu, klucz monthKey
  agency: Map<string, AgencyInputs>;
  responses: SurveyRow[]; // już przefiltrowane dla zakresu
  fte: Map<string, number>; // etaty w danym miesiącu
  targets: Record<string, number>;
  thresholds: Thresholds;
}

export interface KpiResult {
  code: string;
  label: string;
  area: string;
  key: boolean;
  unit: KpiUnit;
  decimals: number;
  target: number;
  lowerIsBetter: boolean;
  period: "MONTHLY" | "QUARTERLY";
  agencyLevel: boolean;
  definition: string;
  formula: string;
  value: number | null;
  sub?: string;
  breakdown?: { label: string; value: number | null; unit: KpiUnit }[];
  perf: number | null;
  status: KpiStatus;
}

export function targetFor(def: KpiDef, targets: Record<string, number>): number {
  const t = targets[def.code];
  return typeof t === "number" && Number.isFinite(t) ? t : def.target;
}

function surveyStats(rows: SurveyRow[], year: number, month: number): SurveyStats {
  const q = quarterToDate(year, month);
  const qFrom = monthRangeUtc(q[0].year, q[0].month).from;
  const { from, to } = monthRangeUtc(year, month);
  const s: SurveyStats = { npsPromoters: 0, npsPassives: 0, npsDetractors: 0, csatPositive: 0, csatTotal: 0, responsesMonth: 0 };
  for (const r of rows) {
    const t = r.createdAt.getTime();
    if (r.type === "NPS" && t >= qFrom.getTime() && t < to.getTime()) {
      if (r.score >= 9) s.npsPromoters++;
      else if (r.score >= 7) s.npsPassives++;
      else s.npsDetractors++;
    }
    if (t >= from.getTime() && t < to.getTime()) {
      s.responsesMonth++;
      if (r.type === "CSAT") {
        s.csatTotal++;
        if (r.score >= 4) s.csatPositive++;
      }
    }
  }
  return s;
}

function latestAgency(data: ReportData, year: number, month: number, key: "cac" | "grossMarginPct"): number | null {
  for (let i = 0; i < 12; i++) {
    const { year: y, month: m } = addMonths(year, month, -i);
    const v = data.agency.get(monthKey(y, m))?.[key];
    if (v !== null && v !== undefined) return v;
  }
  return null;
}

export function buildContext(data: ReportData, year: number, month: number): KpiContext {
  const at = (delta: number) => {
    const { year: y, month: m } = addMonths(year, month, delta);
    return data.monthly.get(monthKey(y, m)) ?? null;
  };
  const history: (Inputs | null)[] = [];
  for (let i = 11; i >= 0; i--) history.push(at(-i));
  return {
    cur: at(0),
    qtd: quarterToDate(year, month).map(({ year: y, month: m }) => data.monthly.get(monthKey(y, m)) ?? null),
    history,
    threeMonthsAgo: at(-3),
    agency: data.agency.get(monthKey(year, month)) ?? null,
    agencyLatest: { cac: latestAgency(data, year, month, "cac"), grossMarginPct: latestAgency(data, year, month, "grossMarginPct") },
    surveys: surveyStats(data.responses, year, month),
    fte: data.fte.get(monthKey(year, month)) ?? null,
  };
}

function toResult(def: KpiDef, value: number | null, extra: { sub?: string; breakdown?: KpiResult["breakdown"] }, data: ReportData, targetOverride?: number): KpiResult {
  const target = targetOverride ?? targetFor(def, data.targets);
  const perf = performance(value, target, def.lowerIsBetter);
  return {
    code: def.code, label: def.label, area: def.area, key: def.key, unit: def.unit, decimals: def.decimals,
    target, lowerIsBetter: def.lowerIsBetter, period: def.period, agencyLevel: !!def.agencyLevel,
    definition: def.definition, formula: def.formula,
    value, sub: extra.sub, breakdown: extra.breakdown,
    perf: perf === Infinity ? null : perf,
    status: grade(perf, data.thresholds),
  };
}

export function computeMonth(data: ReportData, year: number, month: number): KpiResult[] {
  const ctx = buildContext(data, year, month);
  return KPIS.map((def) => {
    const r = def.compute(ctx);
    return toResult(def, r.value, r, data);
  });
}

// Kwartał: KPI miesięczne = średnia z miesięcy z danymi; KPI kwartalne = stan na ostatni miesiąc z danymi.
export function computeQuarter(data: ReportData, year: number, quarter: number, lastMonth = quarter * 3): KpiResult[] {
  const months: number[] = [];
  for (let m = (quarter - 1) * 3 + 1; m <= Math.min(quarter * 3, lastMonth); m++) months.push(m);
  const perMonth = months.map((m) => computeMonth(data, year, m));
  const withData = months.filter((m) => data.monthly.has(monthKey(year, m)));
  const lastIdx = withData.length ? months.indexOf(withData[withData.length - 1]) : months.length - 1;

  return KPIS.map((def, i) => {
    if (def.period === "QUARTERLY") {
      const r = perMonth[lastIdx][i];
      return { ...r };
    }
    const vals = perMonth.map((res) => res[i].value).filter((v): v is number => v !== null);
    const value = vals.length ? vals.reduce((a, v) => a + v, 0) / vals.length : null;
    return toResult(def, value, { sub: vals.length ? `Średnia z ${vals.length} mies.` : undefined }, data);
  });
}

// ───────── Raport tygodniowy (KPI kluczowe) ─────────

export const WEEKLY_KPI_CODES = ["LOGO_CHURN", "NRR", "EXPANSION", "TTFL", "HEALTH_GREEN", "CPL_ON_TARGET"];

export function weeklyValues(weeks: Inputs[]): Record<string, number | null> {
  const first = (k: string) => weeks.find((w) => w[k] !== null && w[k] !== undefined)?.[k] ?? null;
  const latest = (k: string) => [...weeks].reverse().find((w) => w[k] !== null && w[k] !== undefined) ?? null;
  const sums = aggregateInputs(weeks, WEEKLY_FIELDS);
  const s = (k: string) => sums?.[k] ?? null;
  const pct = (n: number | null, d: number | null) => (n === null || d === null || d === 0 ? null : (n / d) * 100);

  const baseActive = first("activeClientsStart");
  const baseMrr = first("mrrStart");
  const lostMrr = s("churnMrr") === null && s("downgradeMrr") === null ? null : (s("churnMrr") ?? 0) + (s("downgradeMrr") ?? 0);
  const net = s("expansionMrr") === null && lostMrr === null ? null : (s("expansionMrr") ?? 0) - (lostMrr ?? 0);
  const hg = latest("healthGreen");
  const cpl = latest("clientsCplOnTarget");

  return {
    LOGO_CHURN: pct(s("churnedClients"), baseActive),
    NRR: baseMrr === null || net === null ? null : pct(baseMrr + net, baseMrr),
    EXPANSION: pct(s("expansionMrr"), baseMrr),
    TTFL: s("avgDaysToFirstLead"),
    HEALTH_GREEN: hg ? pct(hg.healthGreen, hg.activeClientsStart) : null,
    CPL_ON_TARGET: cpl ? pct(cpl.clientsCplOnTarget, cpl.activeClientsStart) : null,
  };
}

// Narastająco w miesiącu; Expansion (metryka przyrostowa) ma normę proporcjonalną do liczby tygodni.
export function weeklyResults(data: ReportData, weeks: Inputs[], weeksInMonth: number): KpiResult[] {
  const vals = weeklyValues(weeks);
  return WEEKLY_KPI_CODES.map((code) => {
    const def = KPI_BY_CODE[code];
    let target = targetFor(def, data.targets);
    let sub = "Narastająco w miesiącu";
    if (code === "EXPANSION" && weeksInMonth > 0) {
      target = (target * Math.min(weeks.length, weeksInMonth)) / weeksInMonth;
      sub = `Norma proporcjonalna: ${weeks.length}/${weeksInMonth} tyg.`;
    }
    return toResult(def, vals[code], { sub }, data, target);
  });
}
