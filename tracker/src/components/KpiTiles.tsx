import type { ReportColumn } from "@/lib/report";
import { formatValue } from "@/lib/format";

export interface Kpi {
  key: string;
  label: string;
  unit: string;
}

/** Najważniejsze wskaźniki (north star) za cały wybrany okres — pokazywane nad tabelami. */
export function KpiTiles({ items, total }: { items: Kpi[]; total: ReportColumn }) {
  const value = (key: string) => (key in total.metrics ? total.metrics[key] : total.sums[key] ?? null);
  return (
    <section>
      <h2 className="mb-2 text-sm font-medium text-slate-500">Najważniejsze za wybrany okres</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((k) => (
          <div key={k.key} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs text-slate-500">{k.label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{formatValue(value(k.key), k.unit)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
