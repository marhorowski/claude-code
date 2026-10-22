import type { ReportColumn } from "@/lib/report";
import { formatValue } from "@/lib/format";

export interface ReportRow {
  key: string;
  label: string;
  unit: string;
  kind: "sum" | "metric";
}

interface Props {
  title: string;
  rows: ReportRow[];
  columns: { label: string; data: ReportColumn }[];
  total: ReportColumn;
  /** Ile pierwszych wierszy to north star: pogrubione, z linią pod spodem. */
  leadRows?: number;
}

export function ReportTable({ title, rows, columns, total, leadRows = 0 }: Props) {
  const cell = (col: ReportColumn, row: ReportRow) =>
    formatValue(row.kind === "sum" ? col.sums[row.key] ?? null : col.metrics[row.key], row.unit);

  return (
    <section className="rounded-2xl bg-card border border-line shadow-card">
      <h2 className="border-b border-line px-4 py-3 font-bold">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="sticky left-0 bg-card px-4 py-2 font-medium">Pozycja</th>
              {columns.map((c) => (
                <th key={c.data.key} className="whitespace-nowrap px-3 py-2 text-right font-medium">{c.label}</th>
              ))}
              <th className="whitespace-nowrap bg-soft px-4 py-2 text-right font-semibold text-ink-2">Razem</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.key} className={`border-t ${i > 0 && i === leadRows ? "border-t-line-strong" : "border-line"}`}>
                <td className={`sticky left-0 whitespace-nowrap bg-card px-4 py-2 ${i < leadRows ? "font-semibold" : row.kind === "metric" ? "font-medium" : "text-ink-2"}`}>{row.label}</td>
                {columns.map((c) => (
                  <td key={c.data.key} className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{cell(c.data, row)}</td>
                ))}
                <td className="whitespace-nowrap bg-soft px-4 py-2 text-right font-semibold tabular-nums">{cell(total, row)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
