import { describe, expect, it } from "vitest";
import { appsScriptSource } from "./apps-script";
import { sheetSchema } from "./sheet-spec";

// Atrapa API arkuszy Google: tyle, ile używa skrypt. Komórka = wartość albo formuła.
type Cell = { v: unknown; f?: string };
class MockSheet {
  cells = new Map<string, Cell>();
  formats = new Map<string, string>();
  constructor(public name: string, public locale = "en") {}
  key = (r: number, c: number) => `${r},${c}`;
  getName = () => this.name;
  getMaxRows = () => 1000;
  getMaxColumns = () => 40;
  getLastRow = () => Math.max(0, ...[...this.cells.entries()].filter(([, c]) => c.v !== "" || c.f).map(([k]) => Number(k.split(",")[0])));
  setFrozenRows() {}
  setFrozenColumns() {}
  clear() { this.cells.clear(); }
  deleteRow(row: number) {
    const next = new Map<string, Cell>();
    for (const [k, c] of this.cells) {
      const [r, col] = k.split(",").map(Number);
      if (r < row) next.set(k, c);
      else if (r > row) next.set(this.key(r - 1, col), c);
    }
    this.cells = next;
  }
  getRange(a: number | string, c?: number, nr = 1, nc = 1) {
    let r0: number, c0: number;
    if (typeof a === "string") {
      const m = /^([A-Z]+)(\d+)/.exec(a)!;
      c0 = [...m[1]].reduce((acc, ch) => acc * 26 + ch.charCodeAt(0) - 64, 0);
      r0 = Number(m[2]);
    } else { r0 = a; c0 = c!; }
    const sheet = this;
    const range = {
      setValues(rows: unknown[][]) { rows.forEach((row, i) => row.forEach((v, j) => sheet.cells.set(sheet.key(r0 + i, c0 + j), { v }))); return range; },
      setFormulas(rows: string[][]) { rows.forEach((row, i) => row.forEach((f, j) => sheet.cells.set(sheet.key(r0 + i, c0 + j), { v: "", f }))); return range; },
      setFormula(f: string) { sheet.cells.set(sheet.key(r0, c0), { v: "", f }); return range; },
      getValue() { const c = sheet.cells.get(sheet.key(r0, c0)); return c?.f === "=SUM(1,2)" ? (sheet.locale === "pl" ? "#ERROR!" : 3) : c?.v ?? ""; },
      getValues() { return Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => sheet.cells.get(sheet.key(r0 + i, c0 + j))?.v ?? "")); },
      clearContent() { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) sheet.cells.delete(sheet.key(r0 + i, c0 + j)); return range; },
      setNumberFormat(f: string) { sheet.formats.set(`${r0},${c0}`, f); return range; },
      setFontWeight() { return range; },
    };
    return range;
  }
  row(r: number, n: number) { return Array.from({ length: n }, (_, j) => this.cells.get(this.key(r, j + 1))?.v ?? ""); }
  formula(a1: string) { const m = /^([A-Z]+)(\d+)$/.exec(a1)!; const c = [...m[1]].reduce((acc, ch) => acc * 26 + ch.charCodeAt(0) - 64, 0); return this.cells.get(this.key(Number(m[2]), c))?.f; }
}
class MockSpreadsheet {
  constructor(public locale = "en") {}
  sheets: MockSheet[] = [new MockSheet("Arkusz1")];
  getName = () => "Tracker — test";
  getSheets = () => this.sheets;
  getSheetByName = (n: string) => this.sheets.find((s) => s.name === n) ?? null;
  insertSheet = (n: string) => { const s = new MockSheet(n, this.locale); this.sheets.push(s); return s; };
  deleteSheet = (s: MockSheet) => { this.sheets = this.sheets.filter((x) => x !== s); };
}

function load(secret: string, locale = "en") {
  const ss = new MockSpreadsheet(locale);
  const globals = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ss, flush() {} },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: { MimeType: { JSON: "json" }, createTextOutput: (t: string) => ({ setMimeType: () => JSON.parse(t) }) },
  };
  const doPost = new Function(...Object.keys(globals), `${appsScriptSource(secret)}\nreturn doPost;`)(...Object.values(globals));
  const post = (body: object) => doPost({ postData: { contents: JSON.stringify(body) } });
  return { ss, post };
}

const schema = sheetSchema();
const entry = (id: string, area: string, dateTo: string, values: Record<string, number>) => ({
  id, area, dateFrom: dateTo, dateTo, week: "2026-10-19", month: dateTo.slice(0, 7), values, notes: "", updatedAt: "2026-10-22T10:00:00Z",
});

describe("skrypt Apps Script", () => {
  it("odrzuca zły klucz", () => {
    const { post } = load("dobry");
    expect(post({ secret: "zly", action: "setup", schema, entries: [] }).ok).toBe(false);
  });

  it("setup: zakładki, nagłówki, wiersze; usuwa pusty Arkusz1", () => {
    const { ss, post } = load("k");
    const res = post({ secret: "k", action: "setup", schema, entries: [entry("m1", "marketing", "2026-10-20", { adSpend: 100, impressions: 1000, clicks: 10, leads: 4, vslMeetingsBooked: 1 })] });
    expect(res).toEqual({ ok: true, name: "Tracker — test" });
    expect(ss.sheets.map((s) => s.name)).toEqual(["Marketing", "Setting", "Sprzedaż", "Tygodniowo", "Miesięcznie", "Podsumowanie"]);
    const m = ss.getSheetByName("Marketing")!;
    expect(m.row(1, 6)).toEqual(["ID wpisu", "Data od", "Data do", "Tydzień (od pon.)", "Miesiąc", "Wydatek na reklamy (PLN)"]);
    expect(m.row(2, 6)).toEqual(["m1", "2026-10-20", "2026-10-20", "2026-10-19", "2026-10", 100]);
  });

  it("upsert poprawia ten sam wiersz, nowy dopisuje; delete usuwa", () => {
    const { ss, post } = load("k");
    post({ secret: "k", action: "setup", schema, entries: [] });
    post({ secret: "k", action: "upsert", schema, entry: entry("s1", "setting", "2026-10-20", { callsMade: 10, conductedCalls: 4, meetingsBooked: 1 }) });
    post({ secret: "k", action: "upsert", schema, entry: entry("s2", "setting", "2026-10-21", { callsMade: 5, conductedCalls: 2, meetingsBooked: 0 }) });
    post({ secret: "k", action: "upsert", schema, entry: entry("s1", "setting", "2026-10-20", { callsMade: 12, conductedCalls: 4, meetingsBooked: 1 }) });
    const s = ss.getSheetByName("Setting")!;
    expect(s.getLastRow()).toBe(3);
    expect(s.row(2, 6)).toEqual(["s1", "2026-10-20", "2026-10-20", "2026-10-19", "2026-10", 12]);
    post({ secret: "k", action: "delete", area: "setting", id: "s1" });
    expect(s.getLastRow()).toBe(2);
    expect(s.row(2, 1)).toEqual(["s2"]);
  });

  it("formuły: tygodnie z trzech zakładek, SUMIF pól, wskaźnik z dzieleniem", () => {
    const { ss, post } = load("k");
    post({ secret: "k", action: "setup", schema, entries: [] });
    const t = ss.getSheetByName("Tygodniowo")!;
    expect(t.formula("A2")).toBe(`=IFERROR(SORT(UNIQUE(FILTER({'Marketing'!D2:D;'Setting'!D2:D;'Sprzedaż'!D2:D},{'Marketing'!D2:D;'Setting'!D2:D;'Sprzedaż'!D2:D}<>"")),1,FALSE),"")`);
    // B = Wydatek na reklamy (1. pole marketingu, kolumna F w zakładce Marketing)
    expect(t.formula("B2")).toBe(`=ARRAYFORMULA(IF($A2:$A="",,SUMIF('Marketing'!$D$2:$D,$A2:$A,'Marketing'!F$2:F)))`);
    // CPL = wydatek / leady; leady to 4. pole marketingu → kolumna E
    const fieldCount = Object.values(schema.fields).flat().length;
    const cplCol = 2 + fieldCount + schema.metrics.findIndex((m) => m.key === "cpl");
    const toLetter = (n: number): string => (n > 26 ? toLetter(Math.floor((n - 1) / 26)) : "") + String.fromCharCode(65 + ((n - 1) % 26));
    expect(t.formula(`${toLetter(cplCol)}2`)).toBe(`=ARRAYFORMULA(IF($A2:$A="",,IFERROR((B2:B)/(E2:E)*1,"")))`);
    expect(ss.getSheetByName("Miesięcznie")!.formula("A2")).toContain("'Marketing'!E2:E");
    expect(ss.getSheetByName("Podsumowanie")!.formula("B3")).toBe(`=IFERROR(INDEX('Tygodniowo'!B:B,2),"")`);
  });

  it("polska wersja Arkuszy: średniki zamiast przecinków, arkusz testowy usunięty", () => {
    const { ss, post } = load("k", "pl");
    post({ secret: "k", action: "setup", schema, entries: [] });
    const t = ss.getSheetByName("Tygodniowo")!;
    expect(t.formula("B2")).toBe(`=ARRAYFORMULA(IF($A2:$A="";;SUMIF('Marketing'!$D$2:$D;$A2:$A;'Marketing'!F$2:F)))`);
    expect(ss.getSheetByName("Podsumowanie")!.formula("B3")).toBe(`=IFERROR(INDEX('Tygodniowo'!B:B;2);"")`);
    expect(ss.getSheetByName("_kpi_probe")).toBeNull();
  });
});
