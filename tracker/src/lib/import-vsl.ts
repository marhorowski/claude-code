// Import historii z szablonu „Arkusz śledzenia danych VSL” (zakładka „Dane z Facebook Ads”, wiersz na dzień).
// Każdy dzień z danymi zamienia się w dzienne wpisy: marketing, setting i sprzedaż.
import type { EntryInput } from "./entries";
import { toIso } from "./periods";
import { formatValue } from "./format";

export const VSL_SHEET = "Dane z Facebook Ads";
const DATE_HEADER = "Okno czasowe (data)";

/** Kolumna szablonu → pole aplikacji. */
const MAP = {
  marketing: {
    adSpend: "Wydatek na reklamy",
    impressions: "Wyświetlenia",
    clicks: "Unikatowe kliknięcia linku",
    leads: "Leady",
    vslMeetingsBooked: "Nowe umówione rozmowy",
  },
  setting: {
    meetingsBooked: "Nowe rozmowy umówione setting",
  },
  sales: {
    plannedMeetings: "Rozmowy umówione na ten dzień",
    attendedMeetings: "Rozmowy odbyte",
    closings: "Nowi klienci",
    revenue: "Zakontraktowana kwota",
  },
} as const;
const CASH = "Zaksięgowana kwota";
const FEEDBACK = "Zmiany / Feedback";

/** Pola, których szablon nie ma — w imporcie zapisujemy je jako 0. */
const ZERO: Record<string, Record<string, number>> = {
  marketing: {},
  setting: { callsMade: 0, conductedCalls: 0 },
  sales: { plannedFollowUps: 0, followUpsDone: 0, postponedMeetings: 0, cancelledMeetings: 0, noShows: 0, followUpClosings: 0, followUpRevenue: 0 },
};

export type Cell = string | number | Date | boolean | null;

export interface VslImport {
  entries: EntryInput[];
  days: number;
  from: string | null;
  to: string | null;
  /** Sumy wartości z pliku — do porównania z tym, co pokaże aplikacja. */
  totals: Record<string, number>;
  cash: number;
  warnings: string[];
}

const num = (v: Cell) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const money = (v: number) => Math.round(v * 100) / 100;

export function parseVslRows(rows: Cell[][]): VslImport {
  const headerIndex = rows.findIndex((r) => r.some((c) => c === DATE_HEADER));
  if (headerIndex < 0) throw new Error(`Nie znaleziono kolumny „${DATE_HEADER}” — to nie wygląda na arkusz śledzenia VSL.`);
  const header = rows[headerIndex].map((c) => (typeof c === "string" ? c.trim() : c));
  const col = (name: string) => header.indexOf(name);
  const dateCol = col(DATE_HEADER);

  const warnings: string[] = [];
  const allColumns = [...Object.values(MAP).flatMap((m) => Object.values(m)), CASH, FEEDBACK];
  for (const name of allColumns) if (col(name) < 0) warnings.push(`Brak kolumny „${name}” — przyjmuję 0.`);

  const entries: EntryInput[] = [];
  const totals: Record<string, number> = {};
  const days = new Set<string>();
  let cash = 0;

  for (const row of rows.slice(headerIndex + 1)) {
    const d = row[dateCol];
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) continue;
    const date = toIso(d);
    const read = (name: string) => (col(name) < 0 ? 0 : num(row[col(name)]));

    for (const [area, fields] of Object.entries(MAP) as [keyof typeof MAP, Record<string, string>][]) {
      const values: Record<string, number> = { ...ZERO[area] };
      let any = false;
      for (const [key, name] of Object.entries(fields)) {
        const raw = Math.max(0, read(name));
        const v = key === "adSpend" || key === "revenue" ? money(raw) : Math.round(raw);
        values[key] = v;
        if (v) any = true;
      }
      if (!any) continue;
      const dayCash = area === "sales" ? money(Math.max(0, read(CASH))) : 0;
      const feedback = area === "marketing" && col(FEEDBACK) >= 0 ? row[col(FEEDBACK)] : null;
      const notes = [
        typeof feedback === "string" && feedback.trim() ? feedback.trim() : null,
        dayCash ? `Zaksięgowano: ${formatValue(dayCash, "PLN")}` : null,
      ].filter(Boolean).join(" · ") || null;
      cash += dayCash;
      entries.push({ area, dateFrom: date, dateTo: date, values, notes });
      days.add(date);
      for (const [k, v] of Object.entries(values)) totals[k] = money((totals[k] ?? 0) + v);
    }
  }

  const sorted = [...days].sort();
  return { entries, days: sorted.length, from: sorted[0] ?? null, to: sorted.at(-1) ?? null, totals, cash: money(cash), warnings };
}

/** Wiersze zakładki z pliku .xlsx (wartości komórek, wyniki formuł; błędy jak #DIV/0! → puste). */
export async function readVslWorkbook(buffer: ArrayBuffer): Promise<Cell[][]> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.getWorksheet(VSL_SHEET);
  if (!ws) throw new Error(`W pliku nie ma zakładki „${VSL_SHEET}”.`);
  const rows: Cell[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const out: Cell[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      out[colNumber - 1] = normalize(cell.value);
    });
    rows.push(Array.from(out, (v) => v ?? null));
  });
  return rows;
}

function normalize(v: unknown): Cell {
  if (v === null || v === undefined) return null;
  if (v instanceof Date || typeof v === "number" || typeof v === "string" || typeof v === "boolean") return v;
  if (typeof v === "object") {
    const o = v as { result?: unknown; richText?: { text: string }[]; error?: string; text?: string };
    if ("error" in o) return null;
    if ("result" in o) return normalize(o.result);
    if (o.richText) return o.richText.map((t) => t.text).join("");
    if (typeof o.text === "string") return o.text;
  }
  return null;
}
