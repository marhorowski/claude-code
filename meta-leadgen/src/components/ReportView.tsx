import type { ReportData, ReportAd } from "@/lib/report";
import { DIMENSIONS } from "@/lib/data";
import { dateRangeLabel, money, num, pct } from "@/lib/format";
import { Kpi } from "./Kpi";
import { DailyChart } from "./DailyChart";
import { AlertsList } from "./AlertsList";
import { AdThumb } from "./AdThumb";
import { LabelBadge } from "./LabelBadge";
import { BreakdownTable } from "./BreakdownTable";

function AdList({ title, ads, currency, empty, showThumb = true }: { title: string; ads: ReportAd[]; currency: string; empty: string; showThumb?: boolean }) {
  return (
    <section className="card p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {!ads.length ? (
        <p className="text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {ads.map((ad, i) => (
            <li key={i} className="flex gap-3">
              {showThumb && <AdThumb src={ad.thumb} size={44} />}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium" title={ad.name}>{ad.name}</div>
                    <div className="truncate text-xs text-slate-500" title={ad.group}>{ad.group}</div>
                  </div>
                  <LabelBadge label={ad.label} />
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  Koszt spotkania <strong>{money(ad.cpb, currency)}</strong> · {num(ad.bookings)} spotk. · {num(ad.leads)} leadów · CPL {money(ad.cpl, currency)} · wydatki {money(ad.spend, currency)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ReportView({ data }: { data: ReportData }) {
  const { kpis, kpisPrev, currency: cur } = data;
  const target = data.targetCostPerBooking;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Raport: {data.clientName}</h2>
        <p className="text-sm text-slate-500">
          {dateRangeLabel(data.period.start, data.period.end)} (porównanie z {dateRangeLabel(data.previous.start, data.previous.end)}) · wygenerowano{" "}
          {new Date(data.generatedAt).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Kpi label="Koszt spotkania" value={money(kpis.cpb, cur)} current={kpis.cpb} previous={kpisPrev.cpb} lowerIsBetter target={money(target, cur)}
          status={kpis.cpb === null ? null : kpis.cpb <= target ? "good" : "bad"} />
        <Kpi label="Umówione spotkania" value={num(kpis.bookings)} current={kpis.bookings} previous={kpisPrev.bookings} />
        <Kpi label="Wydatki" value={money(kpis.spend, cur)} current={kpis.spend} previous={kpisPrev.spend} />
        <Kpi label="Leady" value={num(kpis.leads)} current={kpis.leads} previous={kpisPrev.leads} />
        <Kpi label="Koszt leada" value={money(kpis.cpl, cur)} current={kpis.cpl} previous={kpisPrev.cpl} lowerIsBetter />
        <Kpi label="Lead → spotkanie" value={pct(kpis.bookingRate, 0)} current={kpis.bookingRate} previous={kpisPrev.bookingRate} />
      </div>

      <DailyChart data={data.daily} currency={cur} target={target} />

      <section className="card p-4">
        <h3 className="mb-2 text-sm font-semibold">Wnioski i rekomendacje</h3>
        {data.recommendations.length ? (
          <ol className="list-decimal space-y-1.5 pl-5 text-sm">{data.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ol>
        ) : (
          <p className="text-sm text-slate-500">Brak rekomendacji w tym okresie.</p>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AdList title="🏆 Najlepsze reklamy" ads={data.topAds} currency={cur} empty="Żadna reklama nie dała jeszcze spotkania w tym okresie." />
        <AdList title="⚠ Najsłabsze reklamy" ads={data.bottomAds} currency={cur} empty="Brak słabych reklam — wszystkie w normie." />
      </div>

      <AdList title="Najlepsze zestawy reklam" ads={data.adSets} currency={cur} empty="Brak danych." showThumb={false} />

      <div className="grid grid-cols-1 gap-4">
        {Object.entries(DIMENSIONS).map(([dim, title]) => (
          <BreakdownTable key={dim} title={title} dimension={dim} rows={data.breakdowns[dim] ?? []} currency={cur} limit={8} />
        ))}
      </div>

      {data.alerts.length > 0 && (
        <section>
          <h3 className="section-title text-sm">Alerty na koniec okresu</h3>
          <AlertsList alerts={data.alerts} />
        </section>
      )}
    </div>
  );
}
