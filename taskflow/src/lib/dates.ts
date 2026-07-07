import {
  format,
  addDays,
  isBefore,
  parseISO,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
} from "date-fns";
import { pl } from "date-fns/locale";

export const DAY = "yyyy-MM-dd";

export function todayStr(): string {
  return format(new Date(), DAY);
}

export function tomorrowStr(): string {
  return format(addDays(new Date(), 1), DAY);
}

export function isToday(due: string | null): boolean {
  return !!due && due <= todayStr(); // zaległe traktujemy jak "na dziś"
}

export function isOverdue(due: string | null): boolean {
  return !!due && due < todayStr();
}

export function isTomorrow(due: string | null): boolean {
  return due === tomorrowStr();
}

export function isThisWeek(due: string | null): boolean {
  if (!due) return false;
  const d = parseISO(due);
  const now = new Date();
  return isWithinInterval(d, {
    start: startOfWeek(now, { weekStartsOn: 1 }),
    end: endOfWeek(now, { weekStartsOn: 1 }),
  });
}

export function weekDates(): string[] {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => format(addDays(start, i), DAY));
}

export function humanDate(due: string | null): string {
  if (!due) return "bez daty";
  if (due === todayStr()) return "dziś";
  if (due === tomorrowStr()) return "jutro";
  const d = parseISO(due);
  if (isBefore(d, new Date()) && due < todayStr()) {
    return `zaległe · ${format(d, "d MMM", { locale: pl })}`;
  }
  return format(d, "EEEE, d MMM", { locale: pl });
}

export function fmtHM(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h === 0 && m === 0 && totalSec > 0) return "<1 min";
  if (h === 0) return `${m} min`;
  return `${h} h ${m} min`;
}

export function fmtClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
