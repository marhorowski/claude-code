import Link from "next/link";
import { prisma } from "@/lib/db";
import { generateReport } from "../../../actions";
import { dateRangeLabel, money, num } from "@/lib/format";
import { fromDate } from "@/lib/dates";
import type { ReportData } from "@/lib/report";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ params }: { params: { id: string } }) {
  const reports = await prisma.report.findMany({ where: { clientId: params.id }, orderBy: { createdAt: "desc" }, take: 50 });
  const generate = generateReport.bind(null, params.id);
  return (
    <div className="space-y-6">
      <section className="card p-5">
        <h2 className="section-title mb-1">Nowy raport</h2>
        <p className="hint mb-3">Raport zapisuje stan na dziś: KPI, porównanie z poprzednim okresem, najlepsze i najsłabsze reklamy, grupy, alerty i rekomendacje. Możesz go wysłać klientowi linkiem albo wydrukować do PDF.</p>
        <form action={generate} className="flex flex-wrap items-center gap-2">
          <select name="days" defaultValue="7" className="input w-auto">
            <option value="7">Ostatnie 7 dni (tygodniowy)</option>
            <option value="14">Ostatnie 14 dni</option>
            <option value="30">Ostatnie 30 dni (miesięczny)</option>
          </select>
          <button className="btn-primary">Generuj raport</button>
        </form>
      </section>

      <section className="card overflow-x-auto">
        <h2 className="section-title px-5 pt-5">Historia raportów</h2>
        {!reports.length ? (
          <p className="px-5 pb-5 text-sm text-slate-500">Nie ma jeszcze raportów.</p>
        ) : (
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Okres</th>
                <th className="th text-right">Wydatki</th>
                <th className="th text-right">Spotkania</th>
                <th className="th text-right">Koszt spotkania</th>
                <th className="th">Utworzono</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map((r) => {
                const d = r.data as unknown as ReportData;
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="td">
                      <Link href={`/clients/${params.id}/reports/${r.id}`} className="font-medium text-indigo-700 hover:underline">
                        {dateRangeLabel(fromDate(r.periodStart), fromDate(r.periodEnd))}
                      </Link>
                    </td>
                    <td className="td text-right tabular-nums">{money(d.kpis.spend, d.currency)}</td>
                    <td className="td text-right tabular-nums">{num(d.kpis.bookings)}</td>
                    <td className="td text-right tabular-nums">{money(d.kpis.cpb, d.currency)}</td>
                    <td className="td text-slate-500">{r.createdAt.toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
