import { prisma } from "@/lib/db";
import { getCurrentClient } from "@/lib/clients";
import { AREAS } from "@/lib/fields";
import { METRICS } from "@/lib/metrics";
import { bucketLabel, formatDay, isIsoDate, todayInPoland, toIso, type Grouping } from "@/lib/periods";
import { buildDashboard, previousRange } from "@/lib/dashboard";
import { datesLabel, DEFAULT_PRESET, rangePresets } from "@/lib/ranges";
import { getView, VIEWS } from "@/lib/views";
import { maxCac, parseOffer, parseTargets, PROFIT_DEFS } from "@/lib/kpi";
import { formatValue } from "@/lib/format";
import { ReportTable, type ReportRow } from "@/components/ReportTable";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Overview } from "@/components/dashboard/Overview";
import { Panel } from "@/components/dashboard/Panel";
import { PendingDim, PendingProvider } from "@/components/dashboard/Pending";

const GROUPINGS: Grouping[] = ["day", "week", "month"];

export default async function ResultsPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const client = await getCurrentClient();
  const today = todayInPoland();
  const view = getView(searchParams.view);

  const preset = rangePresets(today).find((p) => p.key === DEFAULT_PRESET)!;
  const to = isIsoDate(searchParams.to ?? "") && searchParams.to! <= today ? searchParams.to! : preset.to;
  const from = isIsoDate(searchParams.from ?? "") && searchParams.from! <= to ? searchParams.from! : preset.from;
  const grouping: Grouping = GROUPINGS.includes(searchParams.group as Grouping) ? (searchParams.group as Grouping) : preset.grouping;
  const previous = previousRange(from, to);

  const entries = await prisma.entry.findMany({
    where: { clientId: client.id, dateTo: { gte: new Date(`${previous.from}T00:00:00Z`), lte: new Date(`${to}T00:00:00Z`) } },
    select: { dateTo: true, values: true },
  });
  const rows = entries.map((e) => ({ dateTo: toIso(e.dateTo), values: e.values as Record<string, number> }));
  const offer = parseOffer(client.offer);
  const data = buildDashboard(rows, view, { from, to, grouping, today }, { offer, targets: parseTargets(client.kpiTargets) });
  // Podpowiedzi zależne od ustawień oferty.
  const cacLimit = maxCac(offer);
  for (const k of data.kpis) {
    if (k.key === "profit" && !offer) k.hint = "Uzupełnij stawki w zakładce KPI i oferta";
    if (k.key === "cac" && cacLimit !== null) k.hint = `Reklamy na sprzedaż · maks. ${formatValue(cacLimit, "PLN")}`;
  }

  // Szczegóły: wszystkie pola i wskaźniki zakładki, north star na początku.
  const northStar = view.northStar.map((k) => k.key);
  const metricRows = (group: string): ReportRow[] =>
    METRICS.filter((m) => m.group === group).map((m) => ({ key: m.key, label: m.label, unit: m.unit, kind: "metric" }));
  const fieldRows = (area: string): ReportRow[] =>
    AREAS.find((a) => a.key === area)!.fields.map((f) => ({ key: f.key, label: f.label, unit: f.unit, kind: "sum" }));
  const pick = (rs: ReportRow[], keys: string[]) => keys.map((k) => rs.find((r) => r.key === k)!).filter(Boolean);
  const prioritize = (rs: ReportRow[]) => [...pick(rs, northStar), ...rs.filter((r) => !northStar.includes(r.key))];
  const tables =
    view.key === "marketing"
      ? [{ title: "Marketing", rows: [...fieldRows("marketing"), ...metricRows("marketing")] }]
      : view.key === "setting-sprzedaz"
        ? [
            { title: "Setting", rows: [...fieldRows("setting"), ...metricRows("setting")] },
            { title: "Sprzedaż", rows: [...pick(metricRows("total"), ["totalClosings", "totalRevenue"]), ...fieldRows("sales"), ...metricRows("sales")] },
          ]
        : [{
            title: "Cały lejek",
            rows: [
              ...pick([...fieldRows("marketing"), ...fieldRows("setting"), ...fieldRows("sales")], ["adSpend", "leads", "meetingsBooked", "vslMeetingsBooked", "attendedMeetings"]),
              ...metricRows("total"),
              ...PROFIT_DEFS.map((d): ReportRow => ({ key: d.key, label: d.label, unit: d.unit, kind: "metric" })),
            ],
          }];
  const columns = data.columns.map((c) => ({ label: bucketLabel(c.key, grouping), data: c }));
  const axisLabel = (key: string) => (grouping === "month" ? bucketLabel(key, grouping) : formatDay(key));

  const empty = data.total.entryCount === 0 && (
    <div className="absolute inset-0 grid place-items-center bg-card/70 backdrop-blur-[1px]">
      <div className="max-w-xs text-center">
        <p className="font-medium">Brak wpisów w tym okresie</p>
        <p className="mt-1 text-[13px] text-muted">
          Wyślij pierwszy raport przez <a href={`/f/${client.formToken}`} target="_blank" className="text-brown hover:underline">formularz</a> albo wybierz inny zakres.
        </p>
      </div>
    </div>
  );

  return (
    <PendingProvider>
      <div className="space-y-6">
        <div className="space-y-4">
          <DashboardHeader views={VIEWS.map((v) => ({ key: v.key, label: v.label }))} view={view.key} from={from} to={to} grouping={grouping} today={today} />
          <div>
            <p className="eyebrow">{view.label}</p>
            <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[30px]">{view.question}</h1>
            <p className="tnum mt-1.5 text-[13px] text-muted">
              {datesLabel(from, to)} w porównaniu z {datesLabel(previous.from, previous.to)} · wpisów: {data.total.entryCount}
            </p>
          </div>
        </div>

        <PendingDim>
          <Overview
            kpis={data.kpis}
            labels={data.bucketKeys.map((k) => bucketLabel(k, grouping))}
            axisLabels={data.bucketKeys.map(axisLabel)}
            prevLabels={data.prevBucketRanges.map((r) => (r.from === r.to ? formatDay(r.from) : `${formatDay(r.from)} – ${formatDay(r.to)}`))}
            partialLast={data.partialLast}
            previousLabel={`Poprzedni okres (${datesLabel(previous.from, previous.to)})`}
            empty={empty}
          />

          <div className={`grid gap-6 lg:grid-cols-2 ${data.panels.length === 3 ? "xl:grid-cols-3" : ""}`}>
            {data.panels.map((p) => <Panel key={p.title} panel={p} />)}
          </div>

          <div className="space-y-6">
            <h2 className="text-[18px] font-extrabold tracking-[-0.02em]">Szczegóły w podziale na okresy</h2>
            {tables.map((t) => (
              <ReportTable
                key={t.title}
                title={t.title}
                rows={prioritize(t.rows)}
                leadRows={t.rows.filter((r) => northStar.includes(r.key)).length}
                columns={columns}
                total={data.total}
                statusOf={data.statusOf}
              />
            ))}
          </div>
        </PendingDim>
      </div>
    </PendingProvider>
  );
}
