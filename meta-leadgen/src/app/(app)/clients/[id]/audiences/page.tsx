import { notFound } from "next/navigation";
import { DIMENSIONS, getBreakdowns, getClientAnalytics } from "@/lib/data";
import { parseDays } from "@/lib/dates";
import { money } from "@/lib/format";
import { AdsTable, type TableRow } from "@/components/AdsTable";
import { BreakdownTable } from "@/components/BreakdownTable";

export const dynamic = "force-dynamic";

export default async function AudiencesPage({ params, searchParams }: { params: { id: string }; searchParams: { d?: string } }) {
  const a = await getClientAnalytics(params.id, parseDays(searchParams.d));
  if (!a) notFound();
  const breakdowns = await getBreakdowns(a.client, a.period);
  const cur = a.client.currency;

  const rows: TableRow[] = a.adSets.map((r) => ({
    id: r.adSet.id,
    name: r.adSet.name,
    group: r.campaignName,
    detail: [
      r.adSet.targetingSummary && `Targetowanie: ${r.adSet.targetingSummary}`,
      r.adSet.optimizationGoal && `Optymalizacja: ${r.adSet.optimizationGoal}`,
      r.adSet.dailyBudget && `Budżet dzienny: ${money(r.adSet.dailyBudget, cur)}`,
      `Reklam w zestawie: ${r.adCount}`,
    ].filter(Boolean).join("\n"),
    active: r.active,
    label: r.classification.label,
    reasons: r.classification.reasons,
    spend: r.metrics.spend,
    leads: r.metrics.leads,
    bookings: r.metrics.bookings,
    cpl: r.metrics.cpl,
    cpb: r.metrics.cpb,
    ctr: r.metrics.ctr,
    cpm: r.metrics.cpm,
    bookingRate: r.metrics.bookingRate,
    prevCpb: r.prev.cpb,
  }));

  return (
    <div className="space-y-6">
      <section>
        <h2 className="section-title">Zestawy reklam (grupy docelowe)</h2>
        <AdsTable rows={rows} currency={cur} target={a.client.targetCostPerBooking} kind="adset" />
      </section>

      <div>
        <h2 className="section-title mb-1">Kto faktycznie się umawia</h2>
        <p className="hint mb-3">
          Przy kampaniach broad / Advantage+ to tu widać, do kogo Meta realnie dowozi reklamy i kto umawia spotkania. Oznaczenie „lepiej/gorzej” to porównanie z kosztem spotkania całego konta
          {a.kpis.cpb ? ` (${money(a.kpis.cpb, cur)})` : ""}.
        </p>
        <div className="grid grid-cols-1 gap-4">
          {Object.entries(DIMENSIONS).map(([dim, title]) => (
            <BreakdownTable key={dim} title={title} dimension={dim} rows={breakdowns[dim] ?? []} currency={cur} />
          ))}
        </div>
      </div>
    </div>
  );
}
