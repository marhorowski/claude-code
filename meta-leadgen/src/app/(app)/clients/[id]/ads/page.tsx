import { notFound } from "next/navigation";
import { getClientAnalytics } from "@/lib/data";
import { parseDays } from "@/lib/dates";
import { AdsTable, type TableRow } from "@/components/AdsTable";
import { AlertsList } from "@/components/AlertsList";

export const dynamic = "force-dynamic";

export default async function AdsPage({ params, searchParams }: { params: { id: string }; searchParams: { d?: string } }) {
  const a = await getClientAnalytics(params.id, parseDays(searchParams.d));
  if (!a) notFound();
  const rows: TableRow[] = a.ads.map((r) => ({
    id: r.ad.id,
    name: r.ad.name,
    group: `${r.campaignName} › ${r.adSetName}`,
    detail: [r.ad.title, r.ad.body].filter(Boolean).join("\n\n") || null,
    thumb: r.ad.thumbnailUrl ?? r.ad.imageUrl,
    link: r.ad.previewUrl,
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
    frequency: r.ad.frequency7d,
    prevCpb: r.prev.cpb,
  }));
  return (
    <div className="space-y-6">
      <AdsTable rows={rows} currency={a.client.currency} target={a.client.targetCostPerBooking} />
      <section>
        <h2 className="section-title">Wszystkie alerty ({a.alerts.length})</h2>
        <AlertsList alerts={a.alerts} />
      </section>
    </div>
  );
}
