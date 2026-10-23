// Daty w UTC: tydzień = poniedziałek 00:00 UTC, należy do miesiąca swojego poniedziałku.

export const MONTHS_PL = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const idx = year * 12 + (month - 1) + delta;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

export function quarterOf(month: number): number {
  return Math.floor((month - 1) / 3) + 1;
}

// Miesiące kwartału od jego początku do podanego miesiąca włącznie
export function quarterToDate(year: number, month: number): { year: number; month: number }[] {
  const first = (quarterOf(month) - 1) * 3 + 1;
  const out = [];
  for (let m = first; m <= month; m++) out.push({ year, month: m });
  return out;
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseIsoDate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function mondayOf(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = (x.getUTCDay() + 6) % 7; // 0 = poniedziałek
  x.setUTCDate(x.getUTCDate() - dow);
  return x;
}

export function isMonday(d: Date): boolean {
  return d.getUTCDay() === 1;
}

export function mondaysInMonth(year: number, month: number): Date[] {
  const out: Date[] = [];
  const d = new Date(Date.UTC(year, month - 1, 1));
  while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1);
  while (d.getUTCMonth() === month - 1) {
    out.push(new Date(d));
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return out;
}

export function weekLabel(monday: Date): string {
  const end = new Date(monday);
  end.setUTCDate(end.getUTCDate() + 6);
  const f = (x: Date) => `${String(x.getUTCDate()).padStart(2, "0")}.${String(x.getUTCMonth() + 1).padStart(2, "0")}`;
  return `${f(monday)}–${f(end)}`;
}

export function currentYearMonth(now = new Date()): { year: number; month: number } {
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function monthRangeUtc(year: number, month: number): { from: Date; to: Date } {
  return { from: new Date(Date.UTC(year, month - 1, 1)), to: new Date(Date.UTC(year, month, 1)) };
}
