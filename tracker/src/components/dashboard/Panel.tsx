import type { PanelData } from "@/lib/dashboard";
import { formatShare, formatValue } from "@/lib/format";

/** Lista etapów z cienkim paskiem udziału wzdłuż dolnej krawędzi wiersza. */
export function Panel({ panel }: { panel: PanelData }) {
  return (
    <section className="card flex flex-col p-4">
      <h3 className="px-3 pb-2 text-[15px] font-semibold">{panel.title}</h3>
      <ul className="flex-1">
        {panel.rows.map((r) => (
          <li key={r.key} className="relative flex h-11 items-center gap-3 rounded-[10px] px-3 pb-1.5 text-[14px] hover:bg-soft/60">
            {r.pct !== null && (
              <span aria-hidden className="absolute inset-x-3 bottom-[5px] h-[3px] overflow-hidden rounded-full bg-line">
                {r.pct > 0 && (
                  <span
                    className={`absolute inset-y-0 left-0 rounded-full opacity-75 ${panel.money ? "bg-money" : "bg-accent"}`}
                    style={{ width: `${Math.max(1.5, Math.min(100, r.pct))}%` }}
                  />
                )}
              </span>
            )}
            <span className="min-w-0 flex-1 truncate text-ink-2">{r.label}</span>
            <span className="tnum font-medium text-ink">{formatValue(r.value, r.unit)}</span>
            <span className="tnum w-12 text-right text-[13px] text-muted">{panel.showShare && r.pct !== null ? formatShare(r.pct) : ""}</span>
          </li>
        ))}
      </ul>
      <p className="px-3 pt-2 text-[12px] text-muted">{panel.note}</p>
    </section>
  );
}
