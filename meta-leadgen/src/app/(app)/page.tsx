import Link from "next/link";
import { getOverview } from "@/lib/data";
import { parseDays } from "@/lib/dates";
import { change } from "@/lib/analytics/metrics";
import { money, num, pct } from "@/lib/format";
import { PeriodSelect } from "@/components/PeriodSelect";
import { SyncAllButton } from "@/components/SyncButton";

export const dynamic = "force-dynamic";

function Delta({ cur, prev, lowerIsBetter }: { cur: number | null; prev: number | null; lowerIsBetter?: boolean }) {
  const c = change(cur, prev);
  if (c === null || Math.abs(c) < 0.5) return null;
  const good = lowerIsBetter ? c < 0 : c > 0;
  return <span className={`ml-1 text-[11px] ${good ? "text-emerald-600" : "text-red-600"}`}>{c > 0 ? "▲" : "▼"}{Math.abs(c).toFixed(0)}%</span>;
}

export default async function OverviewPage({ searchParams }: { searchParams: { d?: string } }) {
  const days = parseDays(searchParams.d);
  const clients = await getOverview(days);
  const activeIds = clients.filter((c) => c.client.active && !c.client.adAccountId.startsWith("demo")).map((c) => c.client.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Klienci</h1>
          <p className="text-sm text-slate-500">Ostatnie {days} dni (bez dzisiaj) w porównaniu z poprzednim okresem</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SyncAllButton clientIds={activeIds} />
          <PeriodSelect />
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="card p-8 text-center">
          <h2 className="font-semibold">Nie ma jeszcze żadnego klienta</h2>
          <p className="mt-1 text-sm text-slate-500">Dodaj pierwsze konto reklamowe — dane z ostatnich 90 dni pobiorą się automatycznie.</p>
          <Link href="/settings" className="btn-primary mt-4">Dodaj konto reklamowe</Link>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Klient</th>
                <th className="th text-right">Wydatki</th>
                <th className="th text-right">Leady</th>
                <th className="th text-right">CPL</th>
                <th className="th text-right">Spotkania</th>
                <th className="th text-right">Koszt spotkania</th>
                <th className="th text-right">Lead → spotkanie</th>
                <th className="th">Reklamy</th>
                <th className="th">Alerty</th>
                <th className="th">Synchronizacja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.map(({ client, kpis, kpisPrev, alerts, labelCounts }) => {
                const cur = client.currency;
                const onTarget = kpis.cpb !== null && kpis.cpb <= client.targetCostPerBooking;
                const high = alerts.filter((a) => a.severity === "high").length;
                return (
                  <tr key={client.id} className={`hover:bg-slate-50 ${client.active ? "" : "opacity-50"}`}>
                    <td className="td">
                      <Link href={`/clients/${client.id}?d=${days}`} className="font-medium text-indigo-700 hover:underline">{client.name}</Link>
                      <div className="text-xs text-slate-400">act_{client.adAccountId}</div>
                    </td>
                    <td className="td text-right tabular-nums">{money(kpis.spend, cur)}<Delta cur={kpis.spend} prev={kpisPrev.spend} /></td>
                    <td className="td text-right tabular-nums">{num(kpis.leads)}<Delta cur={kpis.leads} prev={kpisPrev.leads} /></td>
                    <td className="td text-right tabular-nums">{money(kpis.cpl, cur)}<Delta cur={kpis.cpl} prev={kpisPrev.cpl} lowerIsBetter /></td>
                    <td className="td text-right tabular-nums">{num(kpis.bookings)}<Delta cur={kpis.bookings} prev={kpisPrev.bookings} /></td>
                    <td className="td text-right tabular-nums">
                      <span className={kpis.cpb === null ? "" : onTarget ? "font-semibold text-emerald-700" : "font-semibold text-red-600"}>{money(kpis.cpb, cur)}</span>
                      <Delta cur={kpis.cpb} prev={kpisPrev.cpb} lowerIsBetter />
                      <div className="text-[11px] text-slate-400">cel {money(client.targetCostPerBooking, cur)}</div>
                    </td>
                    <td className="td text-right tabular-nums">{pct(kpis.bookingRate, 0)}</td>
                    <td className="td text-xs">
                      {labelCounts.scale ? <span className="mr-2 text-emerald-700">🚀 {labelCounts.scale}</span> : null}
                      {labelCounts.winner ? <span className="mr-2 text-emerald-700">🏆 {labelCounts.winner}</span> : null}
                      {labelCounts.kill ? <span className="mr-2 text-red-600">✕ {labelCounts.kill}</span> : null}
                      {labelCounts.weak ? <span className="text-amber-700">⚠ {labelCounts.weak}</span> : null}
                    </td>
                    <td className="td">
                      {alerts.length === 0 ? (
                        <span className="text-xs text-slate-400">—</span>
                      ) : (
                        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${high ? "bg-red-600 text-white" : "bg-amber-100 text-amber-800"}`}>{alerts.length}</span>
                      )}
                    </td>
                    <td className="td text-xs">
                      {client.lastSyncStatus === "error" ? (
                        <span className="text-red-600" title={client.lastSyncMessage ?? ""}>błąd</span>
                      ) : client.lastSyncAt ? (
                        <span className="text-slate-500">{client.lastSyncAt.toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short", timeZone: client.timezone })}</span>
                      ) : (
                        <span className="text-slate-400">{client.adAccountId.startsWith("demo") ? "demo" : "nigdy"}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="hint">🚀 do skalowania · 🏆 wygrane · ✕ do wyłączenia · ⚠ słabsze. Dane synchronizują się automatycznie raz dziennie rano.</p>
    </div>
  );
}
