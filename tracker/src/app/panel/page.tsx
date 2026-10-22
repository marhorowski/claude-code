import { prisma } from "@/lib/db";
import { getCurrentClient } from "@/lib/clients";
import { AREAS } from "@/lib/fields";
import { METRICS } from "@/lib/metrics";
import { addDays, bucketLabel, isIsoDate, mondayOf, todayInPoland, toIso, type Grouping } from "@/lib/periods";
import { buildReport } from "@/lib/report";
import { ReportTable, type ReportRow } from "@/components/ReportTable";

const GROUPINGS: { key: Grouping; label: string }[] = [
  { key: "day", label: "Dni" },
  { key: "week", label: "Tygodnie" },
  { key: "month", label: "Miesiące" },
];

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

  return (
    <div className="space-y-6">
      <form className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
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

      {AREAS.map((area) => (
        <ReportTable
          key={area.key}
          title={area.label}
          rows={[
            ...area.fields.map((f): ReportRow => ({ key: f.key, label: f.label, unit: f.unit, kind: "sum" })),
            ...metricRows(area.key),
          ]}
          columns={columns}
          total={report.total}
        />
      ))}
      <ReportTable title="Całość" rows={metricRows("total")} columns={columns} total={report.total} />
    </div>
  );
}
