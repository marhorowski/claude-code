import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentClient } from "@/lib/clients";
import { AREAS, getArea } from "@/lib/fields";
import { formatDay, toIso } from "@/lib/periods";
import { formatValue } from "@/lib/format";
import { DeleteButton } from "@/components/DeleteButton";

export default async function DataPage({ searchParams }: { searchParams: { area?: string } }) {
  const client = await getCurrentClient();
  const area = getArea(searchParams.area ?? "") ?? AREAS[0];
  const entries = await prisma.entry.findMany({
    where: { clientId: client.id, area: area.key },
    orderBy: [{ dateTo: "desc" }, { dateFrom: "desc" }],
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl bg-soft p-1">
          {AREAS.map((a) => (
            <Link
              key={a.key}
              href={`/panel/dane?area=${a.key}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${a.key === area.key ? "bg-card shadow-sm" : "text-muted hover:text-ink"}`}
            >
              {a.label}
            </Link>
          ))}
        </div>
        <Link href={`/panel/dane/nowy?area=${area.key}`} className="ml-auto rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent/90">
          Dodaj wpis
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-card border border-line shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="px-4 py-2 font-medium">Okres</th>
              {area.fields.map((f) => <th key={f.key} className="px-3 py-2 text-right font-medium">{f.label}</th>)}
              <th className="px-3 py-2 font-medium">Uwagi</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr><td colSpan={area.fields.length + 3} className="px-4 py-8 text-center text-muted">Brak wpisów.</td></tr>
            )}
            {entries.map((e) => {
              const from = toIso(e.dateFrom);
              const to = toIso(e.dateTo);
              const period = from === to ? formatDay(from) : `${formatDay(from)} – ${formatDay(to)}`;
              const values = e.values as Record<string, number>;
              return (
                <tr key={e.id} className="border-t border-line">
                  <td className="whitespace-nowrap px-4 py-2">
                    {period} {from !== to && <span className="ml-1 rounded bg-soft px-1.5 py-0.5 text-xs text-muted">zbiorczy</span>}
                    <span className="block text-xs text-muted">{to.slice(0, 4)}</span>
                  </td>
                  {area.fields.map((f) => (
                    <td key={f.key} className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatValue(values[f.key], f.unit)}</td>
                  ))}
                  <td className="max-w-xs truncate px-3 py-2 text-muted">{e.notes}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-right">
                    <Link href={`/panel/dane/${e.id}`} className="mr-3 text-ink-2 hover:underline">Edytuj</Link>
                    <DeleteButton id={e.id} label={`${area.label}, ${period}`} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
