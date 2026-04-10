"use client";

import { useState, useEffect, useCallback } from "react";
import { useClient } from "../layout";
import { useSession } from "next-auth/react";
import {
  calcSUR,
  calcCP,
  getKpiStatus,
  getStatusColor,
  getMonthsForQuarter,
} from "@/lib/calculations";
import { formatPLN, formatPercent, formatNumber, getMonthName } from "@/lib/utils";
import { KpiCard } from "@/components/ui/KpiCard";
import { Toast } from "@/components/ui/Toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface WeeklyForm {
  weekNumber: number;
  year: number;
  weekStart: string;
  totalLeads: number;
  totalPlannedMeetings: number;
  totalAttended: number;
  totalClosings: number;
  totalRevenue: number;
  adSpend: number | null;
}

interface QuarterlyForm {
  quarter: number;
  year: number;
  ltv: number | null;
  alpvc: number | null;
  notes: string | null;
}

interface KpiTarget {
  code: string;
  label: string;
  target: number;
  unit: string;
  period: string;
  lowerIsBetter: boolean;
}

function getQuarterFromDate(d: Date): number {
  return Math.ceil((d.getMonth() + 1) / 3);
}

export default function KwartalnyPage() {
  const { selectedClientId } = useClient();
  const { data: session } = useSession();
  const role = session?.user?.role || "";
  const isAdmin = role === "ADMIN";

  const now = new Date();
  const [selectedQuarter, setSelectedQuarter] = useState(getQuarterFromDate(now));
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [weeklyForms, setWeeklyForms] = useState<WeeklyForm[]>([]);
  const [quarterlyForm, setQuarterlyForm] = useState<QuarterlyForm | null>(null);
  const [baselineQ1, setBaselineQ1] = useState<QuarterlyForm | null>(null);
  const [targets, setTargets] = useState<KpiTarget[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);
  const [qForm, setQForm] = useState({ ltv: "", alpvc: "", notes: "" });

  const quarterMonths = getMonthsForQuarter(selectedQuarter);

  const fetchData = useCallback(() => {
    if (!selectedClientId) return;
    setLoading(true);

    Promise.all([
      fetch(`/api/weekly?clientId=${selectedClientId}`).then((r) => r.json()),
      fetch(`/api/quarterly?clientId=${selectedClientId}&quarter=${selectedQuarter}&year=${selectedYear}`).then((r) => r.json()),
      fetch(`/api/quarterly?clientId=${selectedClientId}&quarter=1&year=2026`).then((r) => r.json()),
      fetch(`/api/kpi-targets?clientId=${selectedClientId}`).then((r) => r.json()),
    ])
      .then(([wf, qf, bq1, kt]) => {
        const quarterWeeks = (Array.isArray(wf) ? wf : []).filter((w: WeeklyForm) => {
          const d = new Date(w.weekStart);
          return (
            quarterMonths.includes(d.getMonth() + 1) &&
            d.getFullYear() === selectedYear
          );
        });
        setWeeklyForms(quarterWeeks);

        const current = Array.isArray(qf) ? qf[0] : null;
        const baseline = Array.isArray(bq1) ? bq1[0] : null;
        setQuarterlyForm(current || null);
        setBaselineQ1(baseline || null);
        setQForm({
          ltv: String(current?.ltv ?? ""),
          alpvc: String(current?.alpvc ?? ""),
          notes: current?.notes ?? "",
        });
        setTargets(Array.isArray(kt) ? kt : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedClientId, selectedQuarter, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getTarget = (code: string, period = "WEEKLY") =>
    targets.find((t) => t.code === code && t.period === period);

  // Aggregate by month
  const monthData = quarterMonths.map((month) => {
    const monthWeeks = weeklyForms.filter((w) => {
      const d = new Date(w.weekStart);
      return d.getMonth() + 1 === month;
    });
    return {
      month,
      leads: monthWeeks.reduce((s, w) => s + w.totalLeads, 0),
      planned: monthWeeks.reduce((s, w) => s + w.totalPlannedMeetings, 0),
      attended: monthWeeks.reduce((s, w) => s + w.totalAttended, 0),
      closings: monthWeeks.reduce((s, w) => s + w.totalClosings, 0),
      revenue: monthWeeks.reduce((s, w) => s + w.totalRevenue, 0),
    };
  });

  const totalLeads = weeklyForms.reduce((s, w) => s + w.totalLeads, 0);
  const totalPlanned = weeklyForms.reduce((s, w) => s + w.totalPlannedMeetings, 0);
  const totalAttended = weeklyForms.reduce((s, w) => s + w.totalAttended, 0);
  const totalClosings = weeklyForms.reduce((s, w) => s + w.totalClosings, 0);
  const totalRevenue = weeklyForms.reduce((s, w) => s + w.totalRevenue, 0);

  const avgSUR = calcSUR(totalAttended, totalPlanned);
  const avgCP = calcCP(totalClosings, totalAttended);

  const revenueTarget = getTarget("REVENUE", "WEEKLY");
  const quarterRevenueTarget = (revenueTarget?.target ?? 0) * 13;

  const chartData = monthData.map((m) => ({
    name: getMonthName(m.month).slice(0, 3),
    revenue: m.revenue,
    closings: m.closings,
  }));

  async function handleSaveQuarterly() {
    if (!selectedClientId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/quarterly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          quarter: selectedQuarter,
          year: selectedYear,
          ltv: qForm.ltv ? parseFloat(qForm.ltv) : null,
          alpvc: qForm.alpvc ? parseFloat(qForm.alpvc) : null,
          notes: qForm.notes || null,
        }),
      });
      if (!res.ok) throw new Error();
      setToast({ msg: "Dane zapisane ✓", type: "success" });
      fetchData();
    } catch {
      setToast({ msg: "Błąd zapisu", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  // Quarter options
  const quarterOptions: Array<{ q: number; y: number }> = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 2; y--) {
    const maxQ = y === now.getFullYear() ? getQuarterFromDate(now) : 4;
    for (let q = maxQ; q >= 1; q--) {
      quarterOptions.push({ q, y });
    }
  }

  return (
    <div className="space-y-6 fade-in">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-white flex-1">Dashboard Kwartalny</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (selectedQuarter === 1) { setSelectedQuarter(4); setSelectedYear(y => y - 1); }
              else setSelectedQuarter(q => q - 1);
            }}
            className="p-2 bg-[#1E293B] border border-[#334155] rounded-xl text-slate-400 hover:text-white"
          >←</button>

          <select
            value={`${selectedQuarter}-${selectedYear}`}
            onChange={(e) => {
              const [q, y] = e.target.value.split("-").map(Number);
              setSelectedQuarter(q);
              setSelectedYear(y);
            }}
            className="bg-[#1E293B] border border-[#334155] rounded-xl px-3 py-2 text-white text-sm"
          >
            {quarterOptions.map((o) => (
              <option key={`${o.q}-${o.y}`} value={`${o.q}-${o.y}`}>
                Q{o.q} {o.y}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              const maxQ = getQuarterFromDate(now);
              if (selectedQuarter === maxQ && selectedYear === now.getFullYear()) return;
              if (selectedQuarter === 4) { setSelectedQuarter(1); setSelectedYear(y => y + 1); }
              else setSelectedQuarter(q => q + 1);
            }}
            disabled={selectedQuarter === getQuarterFromDate(now) && selectedYear === now.getFullYear()}
            className="p-2 bg-[#1E293B] border border-[#334155] rounded-xl text-slate-400 hover:text-white disabled:opacity-40"
          >→</button>
        </div>
      </div>

      <div className="text-slate-400 text-sm">
        Q{selectedQuarter} {selectedYear} · {quarterMonths.map(m => getMonthName(m).slice(0, 3)).join(" – ")}
      </div>

      {/* Monthly breakdown table */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#334155]">
          <h2 className="font-bold text-white">Zestawienie miesięczne</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full kpi-table">
            <thead>
              <tr>
                <th>Miesiąc</th>
                <th>Leady</th>
                <th>Spotkania</th>
                <th>SUR</th>
                <th>Zamknięcia</th>
                <th>CP</th>
                <th>Przychód</th>
              </tr>
            </thead>
            <tbody>
              {monthData.map((m) => {
                const sur = calcSUR(m.attended, m.planned);
                const cp = calcCP(m.closings, m.attended);
                return (
                  <tr key={m.month}>
                    <td className="text-white font-medium">{getMonthName(m.month)}</td>
                    <td className="text-slate-300">{m.leads}</td>
                    <td className="text-slate-300">{m.attended}</td>
                    <td style={{ color: getStatusColor(getKpiStatus(sur, 90)) }}>{formatPercent(sur)}</td>
                    <td className="text-slate-300">{m.closings}</td>
                    <td style={{ color: getStatusColor(getKpiStatus(cp, 60)) }}>{formatPercent(cp)}</td>
                    <td className="text-slate-300">{formatPLN(m.revenue)}</td>
                  </tr>
                );
              })}
              <tr className="font-bold bg-[#0F172A]">
                <td className="text-indigo-400">SUMA</td>
                <td className="text-white">{totalLeads}</td>
                <td className="text-white">{totalAttended}</td>
                <td style={{ color: getStatusColor(getKpiStatus(avgSUR, 90)) }}>{formatPercent(avgSUR)}</td>
                <td className="text-white">{totalClosings}</td>
                <td style={{ color: getStatusColor(getKpiStatus(avgCP, 60)) }}>{formatPercent(avgCP)}</td>
                <td className="text-white">{formatPLN(totalRevenue)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Quarterly KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">Przychód kwartalny</div>
          <div className="text-2xl font-bold text-white">{formatPLN(totalRevenue)}</div>
          <div className="text-xs text-slate-400 mt-1">Cel: {formatPLN(quarterRevenueTarget)}</div>
        </div>
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">Zamknięcia</div>
          <div className="text-2xl font-bold text-white">{totalClosings}</div>
        </div>
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">Śr. Show Up Rate</div>
          <div className="text-2xl font-bold" style={{ color: getStatusColor(getKpiStatus(avgSUR, 90)) }}>
            {formatPercent(avgSUR)}
          </div>
        </div>
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">Śr. Closing %</div>
          <div className="text-2xl font-bold" style={{ color: getStatusColor(getKpiStatus(avgCP, 60)) }}>
            {formatPercent(avgCP)}
          </div>
        </div>
      </div>

      {/* Quarterly form values */}
      {quarterlyForm && (
        <div className="grid grid-cols-2 gap-4">
          <KpiCard
            label="LTV — Lifetime Value"
            value={quarterlyForm.ltv ?? 0}
            target={getTarget("LTV", "QUARTERLY")?.target ?? 7990}
            unit="PLN"
          />
          <KpiCard
            label="ALPVC"
            value={quarterlyForm.alpvc ?? 0}
            target={getTarget("ALPVC", "QUARTERLY")?.target ?? 7271}
            unit="PLN"
          />
        </div>
      )}

      {/* Monthly chart */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-6">
        <h2 className="font-bold text-white mb-4">Przychód miesięczny w kwartale</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" stroke="#94A3B8" tick={{ fontSize: 12 }} />
            <YAxis stroke="#94A3B8" tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: "#1E293B", border: "1px solid #334155", borderRadius: "12px" }}
              formatter={(v: number) => [formatPLN(v), "Przychód"]}
            />
            <Bar dataKey="revenue" fill="#6366F1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Baseline comparison */}
      {baselineQ1 && (selectedQuarter !== 1 || selectedYear !== 2026) && (
        <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-6">
          <h2 className="font-bold text-white mb-4">Porównanie z baseline Q1 2026</h2>
          <div className="overflow-x-auto">
            <table className="w-full kpi-table">
              <thead>
                <tr>
                  <th>KPI</th>
                  <th>Q1 2026 (baseline)</th>
                  <th>Q{selectedQuarter} {selectedYear}</th>
                  <th>Zmiana</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Przychód (PLN)", baseline: 0, current: totalRevenue },
                  { label: "Zamknięcia", baseline: 0, current: totalClosings },
                  { label: "SUR (%)", baseline: 57.7, current: avgSUR },
                  { label: "CP (%)", baseline: 51, current: avgCP },
                  { label: "LTV (PLN)", baseline: baselineQ1.ltv ?? 0, current: quarterlyForm?.ltv ?? 0 },
                  { label: "ALPVC (PLN)", baseline: baselineQ1.alpvc ?? 0, current: quarterlyForm?.alpvc ?? 0 },
                ].map((row) => {
                  const diff = row.baseline !== 0 && row.current !== 0
                    ? ((row.current - row.baseline) / Math.abs(row.baseline)) * 100
                    : null;
                  return (
                    <tr key={row.label}>
                      <td className="text-slate-300 font-medium">{row.label}</td>
                      <td className="text-slate-400">{formatNumber(row.baseline, 1)}</td>
                      <td className="text-white">{formatNumber(row.current, 1)}</td>
                      <td>
                        {diff != null ? (
                          <span className={`text-sm font-semibold ${diff >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {diff >= 0 ? "↑" : "↓"} {Math.abs(diff).toFixed(1)}%
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quarterly form (Admin only) */}
      {isAdmin && (
        <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-6">
          <h2 className="font-bold text-white mb-5">Dane kwartalne — Q{selectedQuarter} {selectedYear}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">LTV — Lifetime Value (PLN)</label>
              <input
                type="number"
                step="0.01"
                value={qForm.ltv}
                onChange={(e) => setQForm((f) => ({ ...f, ltv: e.target.value }))}
                className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 text-white text-sm"
                placeholder="7990"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">ALPVC — Avg Lifetime Profit per Client (PLN)</label>
              <input
                type="number"
                step="0.01"
                value={qForm.alpvc}
                onChange={(e) => setQForm((f) => ({ ...f, alpvc: e.target.value }))}
                className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 text-white text-sm"
                placeholder="7271"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs text-slate-400 mb-1">Notatka</label>
            <textarea
              value={qForm.notes}
              onChange={(e) => setQForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 text-white text-sm resize-none"
            />
          </div>
          <button
            onClick={handleSaveQuarterly}
            disabled={loading}
            className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white font-semibold rounded-xl px-5 py-2.5 text-sm"
          >
            Zapisz
          </button>
        </div>
      )}
    </div>
  );
}
