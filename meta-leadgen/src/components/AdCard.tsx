import type { AdRow } from "@/lib/data";
import { money, num, pct } from "@/lib/format";
import { AdThumb } from "./AdThumb";
import { LabelBadge, StatusDot } from "./LabelBadge";

export function AdCard({ row, currency }: { row: AdRow; currency: string }) {
  const { ad, metrics: m, classification } = row;
  return (
    <div className="card flex min-w-0 gap-3 p-3">
      <AdThumb src={ad.thumbnailUrl ?? ad.imageUrl} size={64} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <StatusDot active={row.active} />
              <span className="truncate text-sm font-medium" title={ad.name}>{ad.name}</span>
            </div>
            <div className="truncate text-xs text-slate-500" title={row.adSetName}>{row.adSetName}</div>
          </div>
          <LabelBadge label={classification.label} />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <div><div className="text-slate-400">Koszt spotk.</div><div className="font-semibold tabular-nums">{money(m.cpb, currency)}</div></div>
          <div><div className="text-slate-400">Spotkania</div><div className="font-semibold tabular-nums">{num(m.bookings)}</div></div>
          <div><div className="text-slate-400">CPL</div><div className="tabular-nums">{money(m.cpl, currency)}</div></div>
          <div><div className="text-slate-400">Wydatki</div><div className="tabular-nums">{money(m.spend, currency)}</div></div>
        </div>
        <p className="mt-2 text-xs text-slate-600">{classification.reasons.join(" ")}</p>
        <div className="mt-1 text-[11px] text-slate-400">
          CTR {pct(m.ctr, 2)} · lead→spotkanie {pct(m.bookingRate, 0)}
          {ad.frequency7d !== null && <> · freq. 7d {ad.frequency7d.toFixed(1)}</>}
        </div>
      </div>
    </div>
  );
}
