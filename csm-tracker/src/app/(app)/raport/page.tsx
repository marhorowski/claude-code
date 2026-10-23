"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/AppContext";
import { MonthPicker, PageTitle, StatusBadge } from "@/components/ui";
import { AREAS } from "@/lib/kpis";
import { MONTHS_PL, quarterOf } from "@/lib/dates";
import { statusColor, statusLabel } from "@/lib/grading";
import type { KpiResult } from "@/lib/report";
import { formatKpi, formatNumber } from "@/lib/format";

export default function ReportPage() {
  const { scope, scopeName } = useApp();
  const now = new Date();
  const [period, setPeriod] = useState<"month" | "quarter">("month");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [onlyKey, setOnlyKey] = useState(false);
  const [results, setResults] = useState<KpiResult[] | null>(null);
  const [previous, setPrevious] = useState<KpiResult[]>([]);
  const quarter = quarterOf(month);

  useEffect(() => {
    setResults(null);
    const q = period === "quarter" ? `period=quarter&quarter=${quarter}` : `period=month&month=${month}`;
    fetch(`/api/report?${q}&year=${year}&scope=${scope}`)
      .then((r) => (r.ok ? r.json() : { results: [] }))
      .then((d) => {
        setResults(d.results);
        setPrevious(d.previous ?? []);
      });
  }, [period, year, month, quarter, scope]);

  const prev = Object.fromEntries(previous.map((r) => [r.code, r]));
  const periodLabel = period === "quarter" ? `Q${quarter} ${year}` : `${MONTHS_PL[month - 1]} ${year}`;
  const shown = (results ?? []).filter((r) => !onlyKey || r.key);
  const counts = (["GOD", "GREEN", "ORANGE", "RED", "NONE"] as const).map((s) => ({ s, n: shown.filter((r) => r.status === s).length }));

  function exportCsv() {
    const rows = [["Obszar", "KPI", "Wynik", "Norma", "% normy", "Status"]];
    for (const r of shown) {
      rows.push([
        AREAS.find((a) => a.id === r.area)?.title ?? r.area,
        r.label,
        formatKpi(r.value, r.unit, r.decimals),
        `${r.lowerIsBetter ? "≤" : "≥"} ${formatKpi(r.target, r.unit, r.decimals)}`,
        r.perf === null ? "" : formatNumber(r.perf),
        statusLabel(r.status),
      ]);
    }
    const csv = "﻿" + rows.map((row) => row.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `raport-csm-${periodLabel.replace(/\s+/g, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-6">
      <PageTitle title="Raport KPI" subtitle={`${scopeName} · ${periodLabel}`}>
        <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border-bright)" }}>
          {(["month", "quarter"] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} className="px-3 py-1.5 text-sm font-medium"
              style={{ background: period === p ? "var(--neon-dim)" : "transparent", color: period === p ? "var(--neon)" : "var(--text-secondary)" }}>
              {p === "month" ? "Miesiąc" : "Kwartał"}
            </button>
          ))}
        </div>
        <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
      </PageTitle>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          <input type="checkbox" checked={onlyKey} onChange={(e) => setOnlyKey(e.target.checked)} /> Tylko KPI kluczowe
        </label>
        <div className="flex flex-wrap gap-2">
          {counts.filter((c) => c.n > 0).map((c) => (
            <span key={c.s} className="text-xs font-semibold" style={{ color: statusColor(c.s) }}>{statusLabel(c.s)}: {c.n}</span>
          ))}
        </div>
        <div className="flex-1" />
        <button className="btn-ghost" onClick={exportCsv} disabled={!results}>Eksport CSV</button>
      </div>

      {period === "quarter" && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          KPI miesięczne to średnia z miesięcy kwartału, które mają dane. KPI kwartalne (Upsell Rate, ARPA, dosprzedaż jednorazowa, NPS) — stan na ostatni miesiąc z danymi.
        </p>
      )}

      {results === null ? (
        <div style={{ color: "var(--text-muted)" }}>Ładowanie…</div>
      ) : (
        AREAS.map((area) => {
          const items = shown.filter((r) => r.area === area.id);
          if (items.length === 0) return null;
          return (
            <section key={area.id} className="card overflow-hidden">
              <div className="px-5 pt-4 pb-2">
                <h2 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{area.title}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="kpi-table w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left">KPI</th>
                      <th className="text-right">Wynik</th>
                      <th className="text-right">Norma</th>
                      <th className="text-right">% normy</th>
                      {period === "month" && <th className="text-right">Poprz. mies.</th>}
                      <th className="text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((r) => (
                      <tr key={r.code}>
                        <td>
                          <div style={{ color: "var(--text-primary)", fontWeight: 600 }}>{r.label}{r.key && <span className="ml-2 badge badge-neon">kluczowy</span>}</div>
                          <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }} title={r.definition}>{r.formula}</div>
                          {r.sub && <div className="text-xs" style={{ color: "var(--text-muted)" }}>{r.sub}</div>}
                        </td>
                        <td className="text-right whitespace-nowrap" style={{ color: statusColor(r.status), fontWeight: 800 }}>{formatKpi(r.value, r.unit, r.decimals)}</td>
                        <td className="text-right whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>{r.lowerIsBetter ? "≤" : "≥"} {formatKpi(r.target, r.unit, r.decimals)}</td>
                        <td className="text-right" style={{ color: "var(--text-secondary)" }}>{r.status === "GOD" && r.perf === null ? "∞" : r.perf === null ? "—" : `${formatNumber(r.perf)}%`}</td>
                        {period === "month" && <td className="text-right whitespace-nowrap" style={{ color: "var(--text-muted)" }}>{formatKpi(prev[r.code]?.value, r.unit, r.decimals)}</td>}
                        <td className="whitespace-nowrap"><StatusBadge status={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
