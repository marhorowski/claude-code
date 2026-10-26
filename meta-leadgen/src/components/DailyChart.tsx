"use client";

import { useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { date: string; spend: number; leads: number; bookings: number; cpl: number | null; cpb: number | null };

const fmtDate = (d: string) => d.slice(8, 10) + "." + d.slice(5, 7);
const fmtNum = (v: number) => Math.round(v).toLocaleString("pl-PL");

export function DailyChart({ data, currency, target }: { data: Point[]; currency: string; target: number }) {
  const [view, setView] = useState<"volume" | "cost">("volume");
  return (
    <div className="card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Wyniki dzień po dniu</h3>
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 text-xs">
          <button onClick={() => setView("volume")} className={`rounded-md px-2 py-1 ${view === "volume" ? "bg-slate-800 text-white" : "text-slate-600"}`}>
            Wydatki i wolumen
          </button>
          <button onClick={() => setView("cost")} className={`rounded-md px-2 py-1 ${view === "cost" ? "bg-slate-800 text-white" : "text-slate-600"}`}>
            Koszt spotkania i leada
          </button>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {view === "volume" ? (
            <ComposedChart data={data} margin={{ left: 0, right: 0, top: 5, bottom: 0 }}>
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} minTickGap={16} />
              <YAxis yAxisId="l" tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={fmtNum} tickLine={false} axisLine={false} width={48} />
              <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
              <Tooltip labelFormatter={fmtDate} formatter={(v: number, name) => [name === `Wydatki (${currency})` ? fmtNum(v) : v.toLocaleString("pl-PL"), name]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar isAnimationActive={false} yAxisId="l" dataKey="spend" name={`Wydatki (${currency})`} fill="#a5b4fc" radius={[3, 3, 0, 0]} />
              <Line isAnimationActive={false} yAxisId="r" dataKey="leads" name="Leady" stroke="#0ea5e9" strokeWidth={2} dot={false} />
              <Line isAnimationActive={false} yAxisId="r" dataKey="bookings" name="Spotkania" stroke="#059669" strokeWidth={2.5} dot={false} />
            </ComposedChart>
          ) : (
            <ComposedChart data={data} margin={{ left: 0, right: 0, top: 5, bottom: 0 }}>
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} minTickGap={16} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={fmtNum} tickLine={false} axisLine={false} width={48} />
              <Tooltip labelFormatter={fmtDate} formatter={(v: number, name) => [v === null ? "—" : `${fmtNum(v)} ${currency}`, name]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line isAnimationActive={false} dataKey={() => target} name="Cel kosztu spotkania" stroke="#94a3b8" strokeDasharray="4 4" dot={false} strokeWidth={1.5} />
              <Line isAnimationActive={false} dataKey="cpb" name="Koszt spotkania" stroke="#059669" strokeWidth={2.5} connectNulls dot={{ r: 2 }} />
              <Line isAnimationActive={false} dataKey="cpl" name="Koszt leada" stroke="#0ea5e9" strokeWidth={2} connectNulls dot={false} />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>
      {view === "cost" && <p className="hint mt-2">Dni bez spotkań nie mają punktu kosztu — linia łączy dni ze spotkaniami.</p>}
    </div>
  );
}
