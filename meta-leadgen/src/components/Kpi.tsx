import { change } from "@/lib/analytics/metrics";

type Props = {
  label: string;
  value: string;
  current: number | null;
  previous: number | null;
  lowerIsBetter?: boolean;
  target?: string;
  status?: "good" | "bad" | null;
};

export function Kpi({ label, value, current, previous, lowerIsBetter, target, status }: Props) {
  const c = change(current, previous);
  const good = c === null ? null : lowerIsBetter ? c < 0 : c > 0;
  return (
    <div className={`card p-4 ${status === "good" ? "ring-1 ring-emerald-200" : status === "bad" ? "ring-1 ring-red-200" : ""}`}>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs">
        {c !== null && Math.abs(c) >= 0.5 ? (
          <span className={good ? "text-emerald-600" : "text-red-600"}>
            {c > 0 ? "▲" : "▼"} {Math.abs(c).toFixed(0)}% vs poprz.
          </span>
        ) : (
          <span className="text-slate-400">{c === null ? "brak porównania" : "bez zmian"}</span>
        )}
        {target && <span className="text-slate-500">cel {target}</span>}
      </div>
    </div>
  );
}
