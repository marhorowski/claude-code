// Daty jako tekst "RRRR-MM-DD" (bez stref czasowych). Wpis liczy się do okresu,
// w którym wypada jego „Data do”.

export type Grouping = "day" | "week" | "month";

const DAY_MS = 86_400_000;

export function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && toIso(toDate(s)) === s;
}

export function addDays(iso: string, days: number): string {
  return toIso(new Date(toDate(iso).getTime() + days * DAY_MS));
}

/** Liczba dni w zakresie, z oboma końcami włącznie. */
export function daysInRange(from: string, to: string): number {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / DAY_MS) + 1;
}

/** Tydzień ISO: { year, week } — tydzień zaczyna się w poniedziałek. */
export function isoWeek(iso: string): { year: number; week: number } {
  const d = toDate(iso);
  const dayNum = (d.getUTCDay() + 6) % 7; // pon = 0
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // czwartek tego tygodnia
  const year = d.getUTCFullYear();
  const week = 1 + Math.floor((d.getTime() - Date.UTC(year, 0, 1)) / DAY_MS / 7);
  return { year, week };
}

export function mondayOf(iso: string): string {
  const dayNum = (toDate(iso).getUTCDay() + 6) % 7;
  return addDays(iso, -dayNum);
}

export function bucketKey(iso: string, grouping: Grouping): string {
  if (grouping === "day") return iso;
  if (grouping === "month") return iso.slice(0, 7);
  return mondayOf(iso);
}

const MONTHS = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];

export function formatDay(iso: string): string {
  return `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
}

export function bucketLabel(key: string, grouping: Grouping): string {
  if (grouping === "day") return formatDay(key);
  if (grouping === "month") return `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
  const { week } = isoWeek(key);
  return `T${week} (${formatDay(key)}–${formatDay(addDays(key, 6))})`;
}

/** Wszystkie kolejne okresy pokrywające zakres — także te bez wpisów. */
export function bucketsInRange(from: string, to: string, grouping: Grouping): string[] {
  const keys: string[] = [];
  let cursor = from;
  while (cursor <= to) {
    const key = bucketKey(cursor, grouping);
    if (keys.at(-1) !== key) keys.push(key);
    cursor = addDays(cursor, 1);
  }
  return keys;
}

export function crossesMonth(from: string, to: string): boolean {
  return from.slice(0, 7) !== to.slice(0, 7);
}

/** Dzisiejsza data w Polsce (serwer działa w UTC). */
export function todayInPoland(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw" }).format(new Date());
}
