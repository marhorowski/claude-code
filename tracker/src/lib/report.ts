// Zestawienie: sumy pól i wskaźniki w podziale na okresy (dzień / tydzień / miesiąc).
import { computeMetrics, sumValues, type Sums } from "./metrics";
import { bucketKey, bucketsInRange, type Grouping } from "./periods";

export interface ReportEntry {
  dateTo: string;
  values: Record<string, number>;
}

export interface ReportColumn {
  key: string;
  sums: Sums;
  metrics: Record<string, number | null>;
  entryCount: number;
}

export interface Report {
  columns: ReportColumn[];
  total: ReportColumn;
}

export function buildReport(entries: ReportEntry[], from: string, to: string, grouping: Grouping): Report {
  const inRange = entries.filter((e) => e.dateTo >= from && e.dateTo <= to);
  const byBucket = new Map<string, ReportEntry[]>();
  for (const e of inRange) {
    const key = bucketKey(e.dateTo, grouping);
    byBucket.set(key, [...(byBucket.get(key) ?? []), e]);
  }
  const column = (key: string, list: ReportEntry[]): ReportColumn => {
    const sums = sumValues(list);
    return { key, sums, metrics: computeMetrics(sums), entryCount: list.length };
  };
  return {
    columns: bucketsInRange(from, to, grouping).map((key) => column(key, byBucket.get(key) ?? [])),
    total: column("total", inRange),
  };
}
