"use client";

import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { KPI_BY_CODE, KEY_KPI_ORDER } from "@/lib/kpis";
import { formatKpi } from "@/lib/format";

export function TrendChart({ year, month, scope, target }: { year: number; month: number; scope: string; target: (code: string) => number }) {
  const [code, setCode] = useState("NRR");
  const [series, setSeries] = useState<Record<string, number | string | null>[]>([]);
  const def = KPI_BY_CODE[code];

  useEffect(() => {
    fetch(`/api/report/trend?year=${year}&month=${month}&scope=${scope}&codes=${code}&months=6`)
      .then((r) => (r.ok ? r.json() : { series: [] }))
      .then((d) => setSeries(d.series))
      .catch(() => setSeries([]));
  }, [year, month, scope, code]);

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Trend 6 miesięcy</h2>
        <select className="input-dark" style={{ width: "auto" }} value={code} onChange={(e) => setCode(e.target.value)}>
          {KEY_KPI_ORDER.map((c) => <option key={c} value={c}>{KPI_BY_CODE[c].label}</option>)}
        </select>
      </div>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border-card)" strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 11 }} stroke="var(--border-card)" />
            <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} stroke="var(--border-card)" width={44} />
            <Tooltip
              contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-bright)", borderRadius: 8, fontSize: 12 }}
              formatter={(v: number) => [formatKpi(v, def.unit, def.decimals), def.label]}
            />
            <ReferenceLine y={target(code)} stroke="var(--gold)" strokeDasharray="4 4" label={{ value: "norma", fill: "var(--gold)", fontSize: 10, position: "insideTopRight" }} />
            <Line type="monotone" dataKey={code} stroke="var(--neon)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
