"use client";

import { Fragment, useMemo, useState } from "react";
import { LABELS, type Label } from "@/lib/analytics/classify";
import { money, num, pct } from "@/lib/format";
import { AdThumb } from "./AdThumb";
import { LabelBadge, StatusDot } from "./LabelBadge";

export type TableRow = {
  id: string;
  name: string;
  group: string; // nazwa zestawu (dla reklam) lub kampanii (dla zestawów)
  detail?: string | null;
  thumb?: string | null;
  link?: string | null;
  active: boolean;
  label: Label;
  reasons: string[];
  spend: number;
  leads: number;
  bookings: number;
  cpl: number | null;
  cpb: number | null;
  ctr: number | null;
  cpm: number | null;
  bookingRate: number | null;
  frequency?: number | null;
  prevCpb: number | null;
};

type SortKey = "label" | "spend" | "leads" | "bookings" | "cpl" | "cpb" | "ctr" | "bookingRate" | "cpm";

const COLS: { key: SortKey; label: string }[] = [
  { key: "spend", label: "Wydatki" },
  { key: "leads", label: "Leady" },
  { key: "cpl", label: "CPL" },
  { key: "bookings", label: "Spotkania" },
  { key: "cpb", label: "Koszt spotk." },
  { key: "bookingRate", label: "Lead→spotk." },
  { key: "ctr", label: "CTR" },
  { key: "cpm", label: "CPM" },
];

export function AdsTable({ rows, currency, target, kind = "ad" }: { rows: TableRow[]; currency: string; target: number; kind?: "ad" | "adset" }) {
  const [label, setLabel] = useState<Label | "all">("all");
  const [delivery, setDelivery] = useState<"spend" | "active" | "all">("spend");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "label", dir: 1 });
  const [open, setOpen] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter(
      (r) =>
        (label === "all" || r.label === label) &&
        (delivery === "all" || (delivery === "spend" ? r.spend > 0 : r.active)) &&
        (!q || r.name.toLowerCase().includes(q) || r.group.toLowerCase().includes(q)),
    );
    const val = (r: TableRow): number => {
      if (sort.key === "label") return LABELS[r.label].order * 1e9 - r.spend;
      const v = r[sort.key];
      // brak wartości zawsze na końcu
      return v === null ? (sort.dir === 1 ? Infinity : -Infinity) : v;
    };
    return list.sort((a, b) => (val(a) - val(b)) * sort.dir);
  }, [rows, label, delivery, query, sort]);

  const counts = useMemo(() => {
    const c: Partial<Record<Label, number>> = {};
    for (const r of rows) if (delivery === "all" || (delivery === "spend" ? r.spend > 0 : r.active)) c[r.label] = (c[r.label] ?? 0) + 1;
    return c;
  }, [rows, delivery]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: ["cpl", "cpb", "cpm"].includes(key) ? 1 : -1 }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select value={delivery} onChange={(e) => setDelivery(e.target.value as typeof delivery)} className="input w-auto">
          <option value="spend">Z wydatkami w okresie</option>
          <option value="active">Tylko aktywne</option>
          <option value="all">Wszystkie</option>
        </select>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Szukaj po nazwie…" className="input w-56" />
        <div className="flex flex-wrap gap-1">
          <button onClick={() => setLabel("all")} className={`rounded-full px-2.5 py-1 text-xs ${label === "all" ? "bg-slate-800 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>
            Wszystkie
          </button>
          {(Object.keys(LABELS) as Label[])
            .filter((l) => counts[l])
            .map((l) => (
              <button key={l} onClick={() => setLabel(l)} className={`rounded-full px-2.5 py-1 text-xs ${label === l ? "bg-slate-800 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>
                {LABELS[l].text} ({counts[l]})
              </button>
            ))}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">{kind === "ad" ? "Reklama" : "Zestaw reklam"}</th>
              <th className="th cursor-pointer" onClick={() => toggleSort("label")}>Ocena {sort.key === "label" && (sort.dir === 1 ? "↑" : "↓")}</th>
              {COLS.map((c) => (
                <th key={c.key} className="th cursor-pointer text-right" onClick={() => toggleSort(c.key)}>
                  {c.label} {sort.key === c.key && (sort.dir === 1 ? "↑" : "↓")}
                </th>
              ))}
              {kind === "ad" && <th className="th text-right">Freq. 7d</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((r) => (
              <Fragment key={r.id}>
                <tr className="cursor-pointer hover:bg-slate-50" onClick={() => setOpen(open === r.id ? null : r.id)}>
                  <td className="td max-w-xs">
                    <div className="flex items-center gap-2">
                      {kind === "ad" && <AdThumb src={r.thumb} size={36} />}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <StatusDot active={r.active} />
                          <span className="truncate font-medium" title={r.name}>{r.name}</span>
                        </div>
                        <div className="truncate text-xs text-slate-500" title={r.group}>{r.group}</div>
                      </div>
                    </div>
                  </td>
                  <td className="td"><LabelBadge label={r.label} /></td>
                  <td className="td text-right tabular-nums">{money(r.spend, currency)}</td>
                  <td className="td text-right tabular-nums">{num(r.leads)}</td>
                  <td className="td text-right tabular-nums">{money(r.cpl, currency)}</td>
                  <td className="td text-right tabular-nums">{num(r.bookings)}</td>
                  <td className={`td text-right font-semibold tabular-nums ${r.cpb === null ? "" : r.cpb <= target ? "text-emerald-700" : "text-red-600"}`}>{money(r.cpb, currency)}</td>
                  <td className="td text-right tabular-nums">{pct(r.bookingRate, 0)}</td>
                  <td className="td text-right tabular-nums">{pct(r.ctr, 2)}</td>
                  <td className="td text-right tabular-nums">{money(r.cpm, currency, 2)}</td>
                  {kind === "ad" && (
                    <td className={`td text-right tabular-nums ${r.frequency && r.frequency > 3 ? "text-amber-700" : ""}`}>{r.frequency ? r.frequency.toFixed(1) : "—"}</td>
                  )}
                </tr>
                {open === r.id && (
                  <tr className="bg-slate-50">
                    <td colSpan={kind === "ad" ? 11 : 10} className="px-3 py-3 text-sm">
                      <div className="flex flex-wrap gap-6">
                        {kind === "ad" && r.thumb && <AdThumb src={r.thumb} size={120} />}
                        <div className="max-w-2xl space-y-1">
                          {r.reasons.map((x, i) => <p key={i}>{x}</p>)}
                          <p className="text-xs text-slate-500">Koszt spotkania w poprzednim okresie: {money(r.prevCpb, currency)}</p>
                          {r.detail && <p className="whitespace-pre-line text-xs text-slate-500">{r.detail}</p>}
                          {r.link && <a href={r.link} target="_blank" rel="noreferrer" className="text-xs text-indigo-700 hover:underline">Zobacz post z reklamą ↗</a>}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {!filtered.length && (
              <tr><td colSpan={11} className="p-6 text-center text-sm text-slate-500">Brak pozycji dla wybranych filtrów.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="hint">Kliknij wiersz, żeby zobaczyć uzasadnienie oceny. Zielony koszt spotkania = poniżej celu ({money(target, currency)}).</p>
    </div>
  );
}
