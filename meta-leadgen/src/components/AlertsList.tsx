import type { Alert } from "@/lib/analytics/alerts";

export function AlertsList({ alerts, limit }: { alerts: Alert[]; limit?: number }) {
  if (!alerts.length)
    return <div className="card p-4 text-sm text-slate-500">Brak alertów — w ostatnich 3 dniach nie widać nagłych spadków.</div>;
  const shown = limit ? alerts.slice(0, limit) : alerts;
  return (
    <ul className="card divide-y divide-slate-100">
      {shown.map((a, i) => (
        <li key={i} className="flex gap-3 p-3 text-sm">
          <span className={`mt-0.5 h-fit shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${a.severity === "high" ? "bg-red-600 text-white" : "bg-amber-100 text-amber-800"}`}>
            {a.severity === "high" ? "PILNE" : "UWAGA"}
          </span>
          <div className="min-w-0">
            <div className="truncate font-medium">{a.entityName}</div>
            <div className="text-slate-600">{a.message}</div>
          </div>
        </li>
      ))}
      {limit && alerts.length > limit && <li className="p-3 text-xs text-slate-500">+ {alerts.length - limit} więcej alertów w zakładce Reklamy</li>}
    </ul>
  );
}
