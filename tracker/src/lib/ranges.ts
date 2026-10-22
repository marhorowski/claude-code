// Gotowe zakresy dat dla wyboru okresu. Zakresy tygodniowe zaczynają się w poniedziałek,
// a miesięczne pierwszego dnia miesiąca — wtedy kolumny wykresu są pełnymi okresami.
import { addDays, formatDay, mondayOf, type Grouping } from "./periods";

export interface RangePreset {
  key: string;
  label: string;
  from: string;
  to: string;
  grouping: Grouping;
}

const firstOfMonth = (iso: string) => `${iso.slice(0, 7)}-01`;
const monthsBack = (iso: string, n: number) => {
  const d = new Date(`${firstOfMonth(iso)}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - n);
  return d.toISOString().slice(0, 10);
};

export function rangePresets(today: string): RangePreset[] {
  const lastMonthStart = monthsBack(today, 1);
  return [
    { key: "7d", label: "Ostatnie 7 dni", from: addDays(today, -6), to: today, grouping: "day" },
    { key: "30d", label: "Ostatnie 30 dni", from: addDays(today, -29), to: today, grouping: "day" },
    { key: "4w", label: "Ostatnie 4 tygodnie", from: addDays(mondayOf(today), -21), to: today, grouping: "week" },
    { key: "12w", label: "Ostatnie 12 tygodni", from: addDays(mondayOf(today), -77), to: today, grouping: "week" },
    { key: "12m", label: "Ostatnie 12 miesięcy", from: monthsBack(today, 11), to: today, grouping: "month" },
    { key: "week", label: "Ten tydzień", from: mondayOf(today), to: today, grouping: "day" },
    { key: "month", label: "Ten miesiąc", from: firstOfMonth(today), to: today, grouping: "day" },
    { key: "lastMonth", label: "Poprzedni miesiąc", from: lastMonthStart, to: addDays(firstOfMonth(today), -1), grouping: "day" },
  ];
}

export const DEFAULT_PRESET = "4w";

/** „6 paź – 17 paź 2026”, „14 paź 2026” (jeden dzień), z rokiem przy obu datach, gdy się różnią. */
export function datesLabel(from: string, to: string): string {
  if (from === to) return `${formatDay(from)} ${from.slice(0, 4)}`;
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  return `${formatDay(from)}${sameYear ? "" : ` ${from.slice(0, 4)}`} – ${formatDay(to)} ${to.slice(0, 4)}`;
}

export function rangeLabel(from: string, to: string, today: string): string {
  return rangePresets(today).find((p) => p.from === from && p.to === to)?.label ?? datesLabel(from, to);
}
