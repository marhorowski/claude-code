import { breakdownLabel, type BreakdownRow } from "@/lib/data";
import { money, num, pct } from "@/lib/format";

const VERDICT = {
  better: { text: "lepiej od średniej", cls: "bg-emerald-100 text-emerald-800" },
  worse: { text: "gorzej od średniej", cls: "bg-red-100 text-red-700" },
  neutral: { text: "", cls: "" },
};

export function BreakdownTable({ title, dimension, rows, currency, limit = 12 }: { title: string; dimension: string; rows: BreakdownRow[]; currency: string; limit?: number }) {
  return (
    <section className="card overflow-x-auto">
      <h3 className="px-4 pt-4 text-sm font-semibold">{title}</h3>
      {!rows.length ? (
        <p className="p-4 text-sm text-slate-500">Brak danych w tym okresie.</p>
      ) : (
        <table className="mt-2 min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Segment</th>
              <th className="th">Udział w budżecie</th>
              <th className="th text-right">Leady</th>
              <th className="th text-right">CPL</th>
              <th className="th text-right">Spotkania</th>
              <th className="th text-right">Koszt spotk.</th>
              <th className="th text-right">Lead→spotk.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.slice(0, limit).map((r) => (
              <tr key={r.value}>
                <td className="td">
                  <div className="font-medium">{breakdownLabel(dimension, r.value)}</div>
                  {r.verdict !== "neutral" && <span className={`mt-0.5 inline-block rounded px-1.5 text-[11px] ${VERDICT[r.verdict].cls}`}>{VERDICT[r.verdict].text}</span>}
                </td>
                <td className="td w-40">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 rounded bg-slate-100"><div className="h-1.5 rounded bg-indigo-400" style={{ width: `${Math.min(100, r.spendShare)}%` }} /></div>
                    <span className="text-xs tabular-nums text-slate-500">{pct(r.spendShare, 0)}</span>
                  </div>
                </td>
                <td className="td text-right tabular-nums">{num(r.metrics.leads)}</td>
                <td className="td text-right tabular-nums">{money(r.metrics.cpl, currency)}</td>
                <td className="td text-right tabular-nums">{num(r.metrics.bookings)}</td>
                <td className="td text-right font-semibold tabular-nums">{money(r.metrics.cpb, currency)}</td>
                <td className="td text-right tabular-nums">{pct(r.metrics.bookingRate, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {rows.length > limit && <p className="px-4 pb-3 text-xs text-slate-500">Pokazano {limit} największych z {rows.length} segmentów.</p>}
    </section>
  );
}
