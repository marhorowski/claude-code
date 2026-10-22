// Walidacja wpisów z formularza i reguła nakładania się zakresów dat.
import { AREA_KEYS, getArea, type Area } from "./fields";
import { isIsoDate } from "./periods";

export interface EntryInput {
  area: Area;
  dateFrom: string;
  dateTo: string;
  values: Record<string, number>;
  notes: string | null;
}

export type ParseResult = { ok: true; entry: EntryInput } | { ok: false; errors: string[] };

/** "1 234,50" → 1234.5; puste pole → NaN. */
export function parseNumber(raw: string): number {
  const cleaned = raw.replace(/[\s ]/g, "").replace(",", ".");
  if (cleaned === "") return NaN;
  return Number(cleaned);
}

export function parseEntry(form: Record<string, string | undefined>): ParseResult {
  const errors: string[] = [];
  const area = form.area as Area;
  const def = getArea(area);
  if (!def || !AREA_KEYS.includes(area)) return { ok: false, errors: ["Nieznany formularz."] };

  const dateFrom = (form.dateFrom ?? "").trim();
  const dateTo = (form.dateTo ?? "").trim() || dateFrom;
  if (!isIsoDate(dateFrom)) errors.push("Podaj poprawną datę „od”.");
  if (!isIsoDate(dateTo)) errors.push("Podaj poprawną datę „do”.");
  if (isIsoDate(dateFrom) && isIsoDate(dateTo) && dateTo < dateFrom) {
    errors.push("Data „do” nie może być wcześniejsza niż data „od”.");
  }

  const values: Record<string, number> = {};
  for (const field of def.fields) {
    const n = parseNumber(form[field.key] ?? "");
    if (Number.isNaN(n)) {
      errors.push(`Uzupełnij pole „${field.label}” (wpisz 0, jeśli nic nie było).`);
    } else if (n < 0) {
      errors.push(`Pole „${field.label}” nie może być ujemne.`);
    } else if (field.unit === "szt." && !Number.isInteger(n)) {
      errors.push(`Pole „${field.label}” musi być liczbą całkowitą.`);
    } else {
      values[field.key] = field.unit === "PLN" ? Math.round(n * 100) / 100 : n;
    }
  }

  const notes = (form.notes ?? "").trim() || null;
  if (errors.length) return { ok: false, errors };
  return { ok: true, entry: { area, dateFrom, dateTo, values, notes } };
}

export interface Range {
  id: string;
  dateFrom: string;
  dateTo: string;
}

/**
 * Zwraca wpis, z którym nowy zakres koliduje. Ten sam zakres dat nie jest kolizją
 * (taki wpis zostaje zastąpiony); częściowe nałożenie — jest.
 */
export function findConflict(existing: Range[], next: { dateFrom: string; dateTo: string }, ignoreId?: string): Range | null {
  for (const r of existing) {
    if (r.id === ignoreId) continue;
    const same = r.dateFrom === next.dateFrom && r.dateTo === next.dateTo;
    const overlaps = r.dateFrom <= next.dateTo && r.dateTo >= next.dateFrom;
    if (overlaps && !same) return r;
  }
  return null;
}
