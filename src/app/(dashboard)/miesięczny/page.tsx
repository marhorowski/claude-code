"use client";

import { useState, useEffect, useCallback } from "react";
import { useClient } from "../layout";
import { useSession } from "next-auth/react";
import {
  calcSUR,
  calcCP,
  calcLTS,
  getKpiStatus,
  getStatusColor,
} from "@/lib/calculations";
import {
  formatPLN,
  formatPercent,
  formatNumber,
  formatValue,
  getMonthName,
} from "@/lib/utils";
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
  cpl: number | null;
}

interface MonthlyForm {
  month: number;
  year: number;
  enge: number | null;
  mer: number | null;
  roas: number | null;
  cac: number | null;
  aov: number | null;
  ltvCac: number | null;
  gp: number | null;
  ar: number | null;
  leadToClose: number | null;
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

export default function MiesięcznyPage() {
  const { selectedClientId } = useClient();
  const { data: session } = useSession();
  const role = session?.user?.role || "";
  const isAdmin = role === "ADMIN";

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [weeklyForms, setWeeklyForms] = useState<WeeklyForm[]>([]);
  const [monthlyForm, setMonthlyForm] = useState<MonthlyForm | null>(null);
  const [prevMonthlyForm, setPrevMonthlyForm] = useState<MonthlyForm | null>(null);
  const [targets, setTargets] = useState<KpiTarget[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Monthly form state
  const [mForm, setMForm] = useState<Partial<MonthlyForm>>({});

  const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
  const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;

  const fetchData = useCallback(() => {
    if (!selectedClientId) return;
    setLoading(true);

    Promise.all([
      fetch(`/api/weekly?clientId=${selectedClientId}`).then((r) => r.json()),
      fetch(`/api/monthly?clientId=${selectedClientId}&month=${selectedMonth}&year=${selectedYear}`).then((r) => r.json()),
      fetch(`/api/monthly?clientId=${selectedClientId}&month=${prevMonth}&year=${prevYear}`).then((r) => r.json()),
      fetch(`/api/kpi-targets?clientId=${selectedClientId}`).then((r) => r.json()),
    ])
      .then(([wf, mf, pmf, kt]) => {
        // Filter weekly forms for selected month
        const monthWeeks = (Array.isArray(wf) ? wf : []).filter((w: WeeklyForm) => {
          const d = new Date(w.weekStart);
          return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
        });
        setWeeklyForms(monthWeeks);

        const current = Array.isArray(mf) ? mf[0] : null;
        const prev = Array.isArray(pmf) ? pmf[0] : null;
        setMonthlyForm(current || null);
        setPrevMonthlyForm(prev || null);
        setMForm(current || {});
        setTargets(Array.isArray(kt) ? kt : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedClientId, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getTarget = (code: string, period = "MONTHLY") =>
    targets.find((t) => t.code === code && t.period === period);

  // Aggregate from weekly forms
  const totalLeads = weeklyForms.reduce((s, w) => s + w.totalLeads, 0);
  const totalPlanned = weeklyForms.reduce((s, w) => s + w.totalPlannedMeetings, 0);
  const totalAttended = weeklyForms.reduce((s, w) => s + w.totalAttended, 0);
  const totalClosings = weeklyForms.reduce((s, w) => s + w.totalClosings, 0);
  const totalRevenue = weeklyForms.reduce((s, w) => s + w.totalRevenue, 0);
  const totalAdSpend = weeklyForms.reduce((s, w) => s + (w.adSpend ?? 0), 0);

  const avgSUR = calcSUR(totalAttended, totalPlanned);
  const avgCP = calcCP(totalClosings, totalAttended);
  const avgLTS = calcLTS(totalClosings, totalLeads);
  const monthlyCPL = totalLeads > 0 && totalAdSpend > 0 ? totalAdSpend / totalLeads : 0;

  const weeklyRevTarget = getTarget("REVENUE", "WEEKLY")?.target ?? 0;
  const monthRevTarget = weeklyRevTarget * 4;

  // Week chart data
  const chartData = weeklyForms.map((w, i) => ({
    name: `Tydz. ${i + 1}`,
    revenue: w.totalRevenue,
    leads: w.totalLeads,
  }));

  async function handleSaveMonthly() {
    if (!selectedClientId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          month: selectedMonth,
          year: selectedYear,
          ...mForm,
        }),
      });
      if (!res.ok) throw new Error();
      setToast({ msg: "Dane zapisane ✓", type: "success" });
      setShowForm(false);
      fetchData();
    } catch {
      setToast({ msg: "Błąd zapisu danych", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  // Month options
  const monthOptions: Array<{ month: number; year: number }> = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 2; y--) {
    const maxMonth = y === now.getFullYear() ? now.getMonth() + 1 : 12;
    for (let m = maxMonth; m >= 1; m--) {
      monthOptions.push({ month: m, year: y });
    }
  }

  const strategicKpis = [
    { code: "ENGE", value: monthlyForm?.enge },
    { code: "MER", value: monthlyForm?.mer },
    { code: "ROAS", value: monthlyForm?.roas },
    { code: "CAC", value: monthlyForm?.cac },
    { code: "AOV", value: monthlyForm?.aov },
    { code: "LTV_CAC", value: monthlyForm?.ltvCac },
    { code: "GP", value: monthlyForm?.gp },
    { code: "AR", value: monthlyForm?.ar },
    { code: "LEAD_TO_CLOSE", value: monthlyForm?.leadToClose },
  ];

  return (
    <div className="space-y-6 fade-in">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold flex-1" style={{ color: "var(--text-primary)" }}>Dashboard Miesięczny</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(y => y - 1); }
              else setSelectedMonth(m => m - 1);
            }}
            className="p-2 rounded-xl"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)", color: "var(--text-muted)" }}
          >←</button>

          <select
            value={`${selectedMonth}-${selectedYear}`}
            onChange={(e) => {
              const [m, y] = e.target.value.split("-").map(Number);
              setSelectedMonth(m);
              setSelectedYear(y);
            }}
            className="rounded-xl px-3 py-2 text-sm"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)", color: "var(--text-primary)" }}
          >
            {monthOptions.map((o) => (
              <option key={`${o.month}-${o.year}`} value={`${o.month}-${o.year}`}>
                {getMonthName(o.month)} {o.year}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              if (selectedMonth === now.getMonth() + 1 && selectedYear === now.getFullYear()) return;
              if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear(y => y + 1); }
              else setSelectedMonth(m => m + 1);
            }}
            disabled={selectedMonth === now.getMonth() + 1 && selectedYear === now.getFullYear()}
            className="p-2 rounded-xl disabled:opacity-40"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)", color: "var(--text-muted)" }}
          >→</button>
        </div>
      </div>

      <div className="text-sm" style={{ color: "var(--text-muted)" }}>{getMonthName(selectedMonth)} {selectedYear}</div>

      {/* Aggregated from weeks */}
      <div>
        <h2 className="text-lg font-bold mb-4" style={{ color: "var(--text-primary)" }}>Wyniki z tygodni</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {[
            { label: "Leady", value: totalLeads, code: "LEADS" },
            { label: "Odbyłe spotkania", value: totalAttended, code: "MEETINGS_ATTENDED" },
            { label: "Zamknięcia", value: totalClosings, code: "CLOSINGS" },
            { label: "Przychód", value: totalRevenue, code: "REVENUE" },
            { label: "Show Up Rate", value: avgSUR, code: "SUR" },
            { label: "Closing %", value: avgCP, code: "CP" },
          ].map((item) => {
            const t = getTarget(item.code, "WEEKLY");
            if (!t) return null;
            return (
              <KpiCard
                key={item.code}
                label={item.label}
                value={item.value}
                target={t.target}
                unit={t.unit}
                lowerIsBetter={t.lowerIsBetter}
                compact
              />
            );
          })}
        </div>
      </div>

      {/* Weekly chart */}
      {chartData.length > 0 && (
        <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
          <h2 className="font-bold mb-4" style={{ color: "var(--text-primary)" }}>Przychód tygodniowy</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94A3B8" tick={{ fontSize: 12 }} />
              <YAxis stroke="#94A3B8" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: "#1E293B", border: "1px solid #334155", borderRadius: "12px" }}
                labelStyle={{ color: "#F1F5F9" }}
                formatter={(v: number) => [formatPLN(v), "Przychód"]}
              />
              <Bar dataKey="revenue" fill="#6366F1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Strategic KPIs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>KPI strategiczne</h2>
          {isAdmin && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-indigo-500/20 border border-indigo-500/40 hover:bg-indigo-500/30 text-sm font-medium rounded-xl px-4 py-2 transition-colors"
              style={{ color: "var(--neon)" }}
            >
              {showForm ? "Zamknij" : "Uzupełnij dane strategiczne"}
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {strategicKpis.map((item) => {
            const t = getTarget(item.code, "MONTHLY");
            if (!t) return null;
            return (
              <KpiCard
                key={item.code}
                label={t.label}
                value={item.value ?? null}
                target={t.target}
                unit={t.unit}
                lowerIsBetter={t.lowerIsBetter}
                compact
              />
            );
          })}
        </div>
      </div>

      {/* Strategic form */}
      {isAdmin && showForm && (
        <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
          <h2 className="font-bold mb-5" style={{ color: "var(--text-primary)" }}>Dane strategiczne — {getMonthName(selectedMonth)} {selectedYear}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {[
              { key: "enge", label: "Engagement Rate IG (%)" },
              { key: "mer", label: "Marketing Efficiency Ratio (x)" },
              { key: "roas", label: "ROAS (x)" },
              { key: "cac", label: "CAC (PLN)" },
              { key: "aov", label: "AOV (PLN)" },
              { key: "ltvCac", label: "LTV:CAC (:1)" },
              { key: "gp", label: "Gross Profit Margin (%)" },
              { key: "ar", label: "Ascension Rate (%)" },
              { key: "leadToClose", label: "Lead to Close (%)" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>{label}</label>
                <input
                  type="number"
                  step="0.01"
                  value={(mForm as any)[key] ?? ""}
                  onChange={(e) => setMForm((f) => ({ ...f, [key]: e.target.value ? parseFloat(e.target.value) : null }))}
                  className="w-full rounded-xl px-3 py-2 text-sm"
                  style={{ background: "var(--bg-input)", border: "1px solid var(--border-card)", color: "var(--text-primary)" }}
                  placeholder="0"
                />
              </div>
            ))}
          </div>
          <div className="mb-4">
            <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Notatka</label>
            <textarea
              value={mForm.notes ?? ""}
              onChange={(e) => setMForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full rounded-xl px-3 py-2 text-sm resize-none"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border-card)", color: "var(--text-primary)" }}
            />
          </div>
          <button
            onClick={handleSaveMonthly}
            disabled={loading}
            className="disabled:opacity-60 font-semibold rounded-xl px-5 py-2.5 text-sm"
            style={{ background: "var(--neon)", color: "#000" }}
          >
            Zapisz
          </button>
        </div>
      )}

      {/* Month-to-month comparison */}
      {prevMonthlyForm && (
        <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
          <h2 className="font-bold mb-4" style={{ color: "var(--text-primary)" }}>
            Porównanie: {getMonthName(selectedMonth)} vs {getMonthName(prevMonth)}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full kpi-table">
              <thead>
                <tr>
                  <th>KPI</th>
                  <th>{getMonthName(prevMonth)}</th>
                  <th>{getMonthName(selectedMonth)}</th>
                  <th>Zmiana</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Engagement Rate IG", prev: prevMonthlyForm.enge, curr: monthlyForm?.enge },
                  { label: "MER", prev: prevMonthlyForm.mer, curr: monthlyForm?.mer },
                  { label: "ROAS", prev: prevMonthlyForm.roas, curr: monthlyForm?.roas },
                  { label: "CAC (PLN)", prev: prevMonthlyForm.cac, curr: monthlyForm?.cac },
                  { label: "AOV (PLN)", prev: prevMonthlyForm.aov, curr: monthlyForm?.aov },
                  { label: "GP (%)", prev: prevMonthlyForm.gp, curr: monthlyForm?.gp },
                ].map((row) => {
                  if (row.prev == null && row.curr == null) return null;
                  const diff = row.prev && row.prev !== 0 && row.curr != null
                    ? ((row.curr - row.prev) / Math.abs(row.prev)) * 100
                    : null;
                  return (
                    <tr key={row.label}>
                      <td className="font-medium" style={{ color: "var(--text-secondary)" }}>{row.label}</td>
                      <td style={{ color: "var(--text-muted)" }}>{row.prev != null ? formatNumber(row.prev, 2) : "—"}</td>
                      <td style={{ color: "var(--text-primary)" }}>{row.curr != null ? formatNumber(row.curr, 2) : "—"}</td>
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
    </div>
  );
}
