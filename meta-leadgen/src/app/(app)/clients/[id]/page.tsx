import { notFound } from "next/navigation";
import Link from "next/link";
import { byLabelOrder, getBreakdowns, getClientAnalytics, recommendations } from "@/lib/data";
import { parseDays } from "@/lib/dates";
import { dateRangeLabel, money, num, pct } from "@/lib/format";
import { Kpi } from "@/components/Kpi";
import { DailyChart } from "@/components/DailyChart";
import { AlertsList } from "@/components/AlertsList";
import { AdCard } from "@/components/AdCard";

export const dynamic = "force-dynamic";

export default async function ClientDashboard({ params, searchParams }: { params: { id: string }; searchParams: { d?: string } }) {
  const days = parseDays(searchParams.d);
  const a = await getClientAnalytics(params.id, days);
  if (!a) notFound();
  const { client, kpis, kpisPrev } = a;
  const cur = client.currency;

  if (!a.hasData)
    return (
      <div className="card p-8 text-center text-sm text-slate-500">
        Brak danych. Kliknij <strong>Synchronizuj</strong>, żeby pobrać wyniki z Meta.
      </div>
    );

  const breakdowns = await getBreakdowns(client, a.period);
  const recs = recommendations(a, breakdowns);
  const top = a.ads.filter((r) => ["scale", "winner"].includes(r.classification.label)).sort(byLabelOrder);
  const kill = a.ads.filter((r) => r.active && r.classification.label === "kill");
  const weak = a.ads.filter((r) => r.active && r.classification.label === "weak");
  const target = client.targetCostPerBooking;
  const d = `?d=${days}`;

  return (
    <div className="space-y-6">
      <p className="text-xs text-slate-500">
        Okres {dateRangeLabel(a.period.start, a.period.end)} vs {dateRangeLabel(a.previous.start, a.previous.end)}
      </p>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Koszt spotkania" value={money(kpis.cpb, cur)} current={kpis.cpb} previous={kpisPrev.cpb} lowerIsBetter target={money(target, cur)}
          status={kpis.cpb === null ? null : kpis.cpb <= target ? "good" : "bad"} />
        <Kpi label="Umówione spotkania" value={num(kpis.bookings)} current={kpis.bookings} previous={kpisPrev.bookings} />
        <Kpi label="Koszt leada (CPL)" value={money(kpis.cpl, cur)} current={kpis.cpl} previous={kpisPrev.cpl} lowerIsBetter
          target={client.targetCpl ? money(client.targetCpl, cur) : undefined} />
        <Kpi label="Leady" value={num(kpis.leads)} current={kpis.leads} previous={kpisPrev.leads} />
        <Kpi label="Wydatki" value={money(kpis.spend, cur)} current={kpis.spend} previous={kpisPrev.spend} />
        <Kpi label="Lead → spotkanie" value={pct(kpis.bookingRate, 0)} current={kpis.bookingRate} previous={kpisPrev.bookingRate} />
        <Kpi label="CTR (link)" value={pct(kpis.ctr, 2)} current={kpis.ctr} previous={kpisPrev.ctr} />
        <Kpi label="CPM" value={money(kpis.cpm, cur, 2)} current={kpis.cpm} previous={kpisPrev.cpm} lowerIsBetter />
      </div>

      <DailyChart data={a.daily} currency={cur} target={target} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h2 className="section-title">Alerty (ostatnie 3 dni vs poprzednie 14)</h2>
          <AlertsList alerts={a.alerts} limit={6} />
        </section>
        <section>
          <h2 className="section-title">Co zrobić teraz</h2>
          {recs.length ? (
            <ol className="card list-decimal space-y-2 py-3 pl-8 pr-4 text-sm">
              {recs.slice(0, 8).map((r, i) => <li key={i}>{r}</li>)}
            </ol>
          ) : (
            <div className="card p-4 text-sm text-slate-500">Brak rekomendacji — za mało danych w tym okresie.</div>
          )}
        </section>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">🏆 Wygrane i do skalowania</h2>
          <Link href={`/clients/${client.id}/ads${d}`} className="text-sm text-indigo-700 hover:underline">Wszystkie reklamy →</Link>
        </div>
        {top.length ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{top.slice(0, 6).map((r) => <AdCard key={r.ad.id} row={r} currency={cur} />)}</div>
        ) : (
          <div className="card p-4 text-sm text-slate-500">
            Żadna reklama nie spełnia jeszcze warunku wygranej (koszt spotkania ≤ {money(target, cur)} i min. {client.minBookingsForWin} spotkania). Spróbuj dłuższego okresu.
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h2 className="section-title">✕ Do wyłączenia ({kill.length})</h2>
          {kill.length ? <div className="space-y-3">{kill.slice(0, 5).map((r) => <AdCard key={r.ad.id} row={r} currency={cur} />)}</div>
            : <div className="card p-4 text-sm text-slate-500">Brak aktywnych reklam do wyłączenia.</div>}
        </section>
        <section>
          <h2 className="section-title">⚠ Słabsze ({weak.length})</h2>
          {weak.length ? <div className="space-y-3">{weak.slice(0, 5).map((r) => <AdCard key={r.ad.id} row={r} currency={cur} />)}</div>
            : <div className="card p-4 text-sm text-slate-500">Brak aktywnych słabszych reklam.</div>}
        </section>
      </div>
    </div>
  );
}
