import { describe, expect, it } from "vitest";
import { parseVslRows, type Cell } from "./import-vsl";

const header: Cell[] = [
  "Dzień", "Okno czasowe (data)", "Wysłany formularz sprawdzenia kampanii?", "Wydatek na reklamy", "Wyświetlenia", "FB CPM (Koszt za 1000 wyświetleń)",
  "Unikatowe kliknięcia linku", "FB CTR", "FB CPC", "Leady", "FB CLC", "CPL (Koszt za leada)", "Nowe umówione rozmowy", "Nowe rozmowy umówione setting",
  "FB LBCR", "CPBC", "Rozmowy umówione na ten dzień", "Rozmowy odbyte", "SUR", "Koszt za odbytą rozmowe", "Nowi klienci", "CR",
  "Zakontraktowana kwota", "Zaksięgowana kwota", "(%) pieniędzy z góry", "CPA", "R-ROAS", "C-ROAS", "Zmiany / Feedback",
];
const day = (d: string, o: Partial<Record<string, number | string>>): Cell[] =>
  header.map((h, i) => (i === 1 ? new Date(`${d}T00:00:00Z`) : i === 0 ? "Mon" : (o[h as string] as Cell) ?? 0));

describe("import arkusza VSL", () => {
  const rows: Cell[][] = [
    ["Rekomendowane zakresy KPI➡️", ">1%"],
    header,
    ["4 dni", 2718, 58800], // podsumowania nad danymi — pomijane (brak daty)
    day("2026-03-02", { "Wydatek na reklamy": 120.456, "Wyświetlenia": 3000, "Unikatowe kliknięcia linku": 40, "Leady": 5, "Nowe umówione rozmowy": 1, "Zmiany / Feedback": "nowa kreacja" }),
    day("2026-03-03", { "Rozmowy umówione na ten dzień": 2, "Rozmowy odbyte": 2, "Nowi klienci": 1, "Zakontraktowana kwota": 9000, "Zaksięgowana kwota": 4500, "CPL (Koszt za leada)": "#DIV/0!" }),
    day("2026-03-04", {}), // pusty dzień
    day("2026-03-05", { "Nowe rozmowy umówione setting": 3 }),
  ];
  const r = parseVslRows(rows);

  it("tworzy wpisy tylko dla obszarów z danymi", () => {
    expect(r.entries.map((e) => `${e.dateTo} ${e.area}`)).toEqual(["2026-03-02 marketing", "2026-03-03 sales", "2026-03-05 setting"]);
    expect(r.days).toBe(3);
    expect([r.from, r.to]).toEqual(["2026-03-02", "2026-03-05"]);
  });

  it("mapuje kolumny na pola, zaokrągla kwoty, brakujące pola = 0", () => {
    expect(r.entries[0].values).toEqual({ adSpend: 120.46, impressions: 3000, clicks: 40, leads: 5, vslMeetingsBooked: 1 });
    expect(r.entries[1].values).toMatchObject({ plannedMeetings: 2, attendedMeetings: 2, closings: 1, revenue: 9000, noShows: 0, followUpRevenue: 0 });
    expect(r.entries[2].values).toEqual({ meetingsBooked: 3, callsMade: 0, conductedCalls: 0 });
  });

  it("uwagi: feedback przy marketingu, zaksięgowana kwota przy sprzedaży", () => {
    expect(r.entries[0].notes).toBe("nowa kreacja");
    expect(r.entries[1].notes).toBe("Zaksięgowano: 4\u00a0500,00 zł");
    expect(r.cash).toBe(4500);
    expect(r.totals.revenue).toBe(9000);
  });

  it("odrzuca plik bez kolumny daty", () => {
    expect(() => parseVslRows([["coś innego"]])).toThrow(/arkusz śledzenia VSL/);
  });
});
