// Dni są trzymane jako "YYYY-MM-DD" w strefie czasowej konta reklamowego.

export function todayInTz(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function addDays(day: string, n: number): string {
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function toDate(day: string): Date {
  return new Date(day + "T00:00:00Z");
}

export function fromDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / 86_400_000);
}

export function dayRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export type Period = { start: string; end: string; days: number };

// Okres jak w Ads Managerze: ostatnie N pełnych dni, bez dzisiejszego.
export function periodFor(timezone: string, days: number): { current: Period; previous: Period } {
  const end = addDays(todayInTz(timezone), -1);
  const start = addDays(end, -(days - 1));
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(days - 1));
  return {
    current: { start, end, days },
    previous: { start: prevStart, end: prevEnd, days },
  };
}

export const PERIOD_OPTIONS = [7, 14, 30, 90] as const;

export function parseDays(value: string | string[] | undefined): number {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return (PERIOD_OPTIONS as readonly number[]).includes(n) ? n : 7;
}
