import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentClient } from "@/lib/clients";
import { AREAS } from "@/lib/fields";
import { METRICS } from "@/lib/metrics";
import { addDays, bucketLabel, isIsoDate, mondayOf, todayInPoland, toIso, type Grouping } from "@/lib/periods";
import { buildReport } from "@/lib/report";
import { ReportTable, type ReportRow } from "@/components/ReportTable";
import { KpiTiles } from "@/components/KpiTiles";

const GROUPINGS: { key: Grouping; label: string }[] = [
  { key: "day", label: "Dni" },
  { key: "week", label: "Tygodnie" },
  { key: "month", label: "Miesiące" },
];

const VIEWS = [
  { key: "ogolny", label: "Ogólny" },
  { key: "marketing", label: "Marketing" },
  { key: "setting-sprzedaz", label: "Setting i sprzedaż" },
];

// North star metrics każdego widoku: kafelki na górze i pierwsze wiersze tabel.
const NORTH_STAR: Record<string, string[]> = {
  ogolny: ["totalRevenue", "totalClosings", "roas", "cac", "leads", "leadToClose"],
  marketing: ["adSpend", "leads", "cpl", "marketingCostPerCall", "ctr", "vslBookingRate"],
  "setting-sprzedaz": ["meetingsBooked", "bookingRate", "sur", "cp", "totalClosings", "totalRevenue"],
};

export default async function ResultsPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const client = await getCurrentClient();
  const today = todayInPoland();
  const grouping: Grouping = GROUPINGS.some((g) => g.key === searchParams.group) ? (searchParams.group as Grouping) : "week";
  const to = isIsoDate(searchParams.to ?? "") ? searchParams.to! : today;
  const defaultFrom = grouping === "month" ? `${addDays(to, -150).slice(0, 7)}-01` : grouping === "day" ? addDays(to, -13) : addDays(mondayOf(to), -21);
  const from = isIsoDate(searchParams.from ?? "") && searchParams.from! <= to ? searchParams.from! : defaultFrom;

  const entries = await prisma.entry.findMany({
    where: { clientId: client.id, dateTo: { gte: new Date(`${from}T00:00:00Z`), lte: new Date(`${to}T00:00:00Z`) } },
    select: { area: true, dateTo: true, values: true },
  });
  const rows = entries.map((e) => ({ area: e.area, dateTo: toIso(e.dateTo), values: e.values as Record<string, number> }));
  const report = buildReport(rows, from, to, grouping);
  const columns = report.columns.map((c) => ({ label: bucketLabel(c.key, grouping), data: c }));

  const metricRows = (group: string): ReportRow[] =>
    METRICS.filter((m) => m.group === group).map((m) => ({ key: m.key, label: m.label, unit: m.unit, kind: "metric" }));
  const areaRows = (key: string): ReportRow[] => [
    ...AREAS.find((a) => a.key === key)!.fields.map((f): ReportRow => ({ key: f.key, label: f.label, unit: f.unit, kind: "sum" })),
    ...metricRows(key),
  ];
  const fieldRow = (key: string): ReportRow => {
    const f = AREAS.flatMap((a) => a.fields).find((x) => x.key === key)!;
    return { key, label: f.label, unit: f.unit, kind: "sum" };
  };

  const view = (VIEWS.find((v) => v.key === searchParams.view) ?? VIEWS[0]).key;
  const northStar = NORTH_STAR[view];
  // W każdej tabeli najpierw wiersze north star tego widoku, potem reszta.
  const prioritize = (rows: ReportRow[]) => [
    ...northStar.flatMap((k) => rows.filter((r) => r.key === k)),
    ...rows.filter((r) => !northStar.includes(r.key)),
  ];
  const tables = (
    view === "marketing"
      ? [{ title: "Marketing", rows: areaRows("marketing") }]
      : view === "setting-sprzedaz"
        ? [{ title: "Setting", rows: areaRows("setting") }, { title: "Sprzedaż", rows: [...areaRows("sales"), ...metricRows("total").filter((r) => r.key === "totalClosings" || r.key === "totalRevenue")] }]
        : [{
            title: "Cały lejek",
            rows: [
              ...["adSpend", "leads", "meetingsBooked", "vslMeetingsBooked", "attendedMeetings"].map(fieldRow),
              ...metricRows("total"),
            ],
          }]
  ).map((t) => ({ ...t, rows: prioritize(t.rows), leadRows: t.rows.filter((r) => northStar.includes(r.key)).length }));
  const allRows = [...AREAS.flatMap((a) => a.fields.map((f) => fieldRow(f.key))), ...METRICS.map((m) => ({ key: m.key, label: m.label, unit: m.unit }))];
  const kpis = northStar.map((k) => allRows.find((r) => r.key === k)!);
  const tabHref = (key: string) => `/panel?${new URLSearchParams({ view: key, from, to, group: grouping })}`;

  return (
    <div className="space-y-6">
      <nav className="flex w-fit gap-1 rounded-xl bg-slate-100 p-1">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={tabHref(v.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${v.key === view ? "bg-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            {v.label}
          </Link>
        ))}
      </nav>

      <form className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <input type="hidden" name="view" value={view} />
        <label className="block">
          <span className="label">Od</span>
          <input type="date" name="from" defaultValue={from} className="input" />
        </label>
        <label className="block">
          <span className="label">Do</span>
          <input type="date" name="to" defaultValue={to} className="input" />
        </label>
        <label className="block">
          <span className="label">Podział</span>
          <select name="group" defaultValue={grouping} className="input">
            {GROUPINGS.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
          </select>
        </label>
        <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">Pokaż</button>
        <p className="ml-auto text-sm text-slate-500">Wpisów w zakresie: {report.total.entryCount}</p>
      </form>

      <KpiTiles items={kpis} total={report.total} />

      {tables.map((t) => (
        <ReportTable key={t.title} title={t.title} rows={t.rows} leadRows={t.leadRows} columns={columns} total={report.total} />
      ))}
    </div>
  );
}
