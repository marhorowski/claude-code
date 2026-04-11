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
import Link from "next/link";
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
  totalMeetingsBooked: number;
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
  targetRevenue: number | null;
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
  histRevenue: number | null;
  histLeads: number | null;
  histBooked: number | null;
  histAttended: number | null;
  histClosings: number | null;
  histSur: number | null;
  histCp: number | null;
}

interface KpiTarget {
  code: string;
  label: string;
  target: number;
  unit: string;
  period: string;
  lowerIsBetter: boolean;
}

interface SalesSettings {
  dealSize: number;
  leadToMeetingRate: number;
  setterBookingRate: number;
  vslConversionRate: number;
}

export default function MiesięcznyPage() {
  const { selectedClientId } = useClient();
  const { data: session } = useSession();
  const role = session?.user?.role || "";

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [weeklyForms, setWeeklyForms] = useState<WeeklyForm[]>([]);
  const [prevWeeklyForms, setPrevWeeklyForms] = useState<WeeklyForm[]>([]);
  const [monthlyForm, setMonthlyForm] = useState<MonthlyForm | null>(null);
  const [prevMonthlyForm, setPrevMonthlyForm] = useState<MonthlyForm | null>(null);
  const [targets, setTargets] = useState<KpiTarget[]>([]);
  const [salesSettings, setSalesSettings] = useState<SalesSettings>({ dealSize: 0, leadToMeetingRate: 0, setterBookingRate: 0, vslConversionRate: 0 });
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);

  const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
  const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;

  const isAdminOrLider = role === "ADMIN" || role === "LIDER";

  const fetchData = useCallback(() => {
    if (!selectedClientId) return;
    setLoading(true);

    Promise.all([
      fetch(`/api/weekly?clientId=${selectedClientId}`).then((r) => r.json()),
      fetch(`/api/monthly?clientId=${selectedClientId}&month=${selectedMonth}&year=${selectedYear}`).then((r) => r.json()),
      fetch(`/api/monthly?clientId=${selectedClientId}&month=${prevMonth}&year=${prevYear}`).then((r) => r.json()),
      fetch(`/api/kpi-targets?clientId=${selectedClientId}`).then((r) => r.json()),
      fetch(`/api/sales-settings?clientId=${selectedClientId}`).then((r) => r.json()),
    ])
      .then(([wf, mf, pmf, kt, ss]) => {
        const allWeekly = Array.isArray(wf) ? wf : [];
        // Filter weekly forms for selected month
        const monthWeeks = allWeekly.filter((w: WeeklyForm) => {
          const d = new Date(w.weekStart);
          return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
        });
        setWeeklyForms(monthWeeks);
        // Filter weekly forms for previous month
        const prevMonthWeeks = allWeekly.filter((w: WeeklyForm) => {
          const d = new Date(w.weekStart);
          return d.getMonth() + 1 === prevMonth && d.getFullYear() === prevYear;
        });
        setPrevWeeklyForms(prevMonthWeeks);

        const current = Array.isArray(mf) ? mf[0] : null;
        const prev = Array.isArray(pmf) ? pmf[0] : null;
        setMonthlyForm(current || null);
        setPrevMonthlyForm(prev || null);
        setTargets(Array.isArray(kt) ? kt : []);
        setSalesSettings({
          dealSize: ss?.dealSize ?? 0,
          leadToMeetingRate: ss?.leadToMeetingRate ?? 0,
          setterBookingRate: ss?.setterBookingRate ?? 0,
          vslConversionRate: ss?.vslConversionRate ?? 0,
        });
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
  const totalBooked = weeklyForms.reduce((s, w) => s + w.totalMeetingsBooked, 0);
  const totalPlanned = weeklyForms.reduce((s, w) => s + w.totalPlannedMeetings, 0);
  const totalAttended = weeklyForms.reduce((s, w) => s + w.totalAttended, 0);
  const totalClosings = weeklyForms.reduce((s, w) => s + w.totalClosings, 0);
  const totalRevenue = weeklyForms.reduce((s, w) => s + w.totalRevenue, 0);
  const totalAdSpend = weeklyForms.reduce((s, w) => s + (w.adSpend ?? 0), 0);

  // SUR: use booked as fallback denominator when planned = 0
  const surBase = totalPlanned > 0 ? totalPlanned : totalBooked;
  const avgSUR = calcSUR(totalAttended, surBase);
  const avgCP = calcCP(totalClosings, totalAttended);
  const avgLTS = calcLTS(totalClosings, totalLeads);
  const monthlyCPL = totalLeads > 0 && totalAdSpend > 0 ? totalAdSpend / totalLeads : 0;

  // Previous month aggregates — from weekly forms if available, else from hist* fields
  const prevWkRevenue = prevWeeklyForms.reduce((s, w) => s + w.totalRevenue, 0);
  const prevWkLeads = prevWeeklyForms.reduce((s, w) => s + w.totalLeads, 0);
  const prevWkAttended = prevWeeklyForms.reduce((s, w) => s + w.totalAttended, 0);
  const prevWkClosings = prevWeeklyForms.reduce((s, w) => s + w.totalClosings, 0);
  const prevWkBooked = prevWeeklyForms.reduce((s, w) => s + w.totalMeetingsBooked, 0);
  const prevWkPlanned = prevWeeklyForms.reduce((s, w) => s + w.totalPlannedMeetings, 0);
  const prevWkSurBase = prevWkPlanned > 0 ? prevWkPlanned : prevWkBooked;
  const prevWkSUR = calcSUR(prevWkAttended, prevWkSurBase);
  const prevWkCP = calcCP(prevWkClosings, prevWkAttended);

  const hasPrevWk = prevWeeklyForms.length > 0;
  const prevRevenue = hasPrevWk ? prevWkRevenue : (prevMonthlyForm?.histRevenue ?? null);
  const prevLeads = hasPrevWk ? prevWkLeads : (prevMonthlyForm?.histLeads ?? null);
  const prevAttended = hasPrevWk ? prevWkAttended : (prevMonthlyForm?.histAttended ?? null);
  const prevClosings = hasPrevWk ? prevWkClosings : (prevMonthlyForm?.histClosings ?? null);
  const prevSUR = hasPrevWk ? prevWkSUR : (prevMonthlyForm?.histSur ?? null);
  const prevCP = hasPrevWk ? prevWkCP : (prevMonthlyForm?.histCp ?? null);

  const weeklyRevTarget = getTarget("REVENUE", "WEEKLY")?.target ?? 0;
  const monthRevTarget = monthlyForm?.targetRevenue ?? (weeklyRevTarget * 4);

  // Derived monthly targets from goal cascade
  const surTarget = getTarget("SUR", "WEEKLY")?.target ?? 0;
  const cpTarget = getTarget("CP", "WEEKLY")?.target ?? 0;
  const dealSize = salesSettings.dealSize;
  // Combined lead→meeting rate: setter% × vsl% sequential funnel, or legacy single rate
  const setterRate = salesSettings.setterBookingRate;
  const vslRate = salesSettings.vslConversionRate;
  const combinedLtmRate = setterRate > 0 && vslRate > 0
    ? (setterRate / 100) * (vslRate / 100) * 100
    : salesSettings.leadToMeetingRate;
  const hasGoalBasis = monthlyForm?.targetRevenue != null && dealSize > 0;
  const monthlyClosings = hasGoalBasis && monthRevTarget > 0 ? Math.ceil(monthRevTarget / dealSize) : 0;
  const monthlyAttended = monthlyClosings > 0 && cpTarget > 0 ? Math.ceil(monthlyClosings / (cpTarget / 100)) : 0;
  const monthlyBooked = monthlyAttended > 0 && surTarget > 0 ? Math.ceil(monthlyAttended / (surTarget / 100)) : 0;
  const monthlyLeads = monthlyBooked > 0 && combinedLtmRate > 0 ? Math.ceil(monthlyBooked / (combinedLtmRate / 100)) : 0;
  // Daily leads target
  const dailyLeadsTarget = monthlyLeads > 0 ? Math.ceil(monthlyLeads / 22) : 0;

  // Week chart data
  const chartData = weeklyForms.map((w, i) => ({
    name: `Tydz. ${i + 1}`,
    revenue: w.totalRevenue,
    leads: w.totalLeads,
  }));

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

      {/* Alert banners */}
      {isAdminOrLider && monthlyForm?.targetRevenue == null && (
        <div className="rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2"
          style={{ background: "rgba(255,153,34,0.12)", border: "1px solid rgba(255,153,34,0.35)", color: "#ff9922" }}>
          ⚠ Brak celu miesięcznego — <Link href="/cele" className="underline">Ustaw w Cele →</Link>
        </div>
      )}
      {isAdminOrLider && monthlyForm?.targetRevenue != null && dealSize === 0 && (
        <div className="rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2"
          style={{ background: "rgba(255,153,34,0.12)", border: "1px solid rgba(255,153,34,0.35)", color: "#ff9922" }}>
          ⚠ Brak Deal Size — cele sprzedażowe nie mogą być obliczone. <Link href="/ustawienia" className="underline">Ustaw w Ustawieniach →</Link>
        </div>
      )}
      {isAdminOrLider && monthlyForm?.targetRevenue != null && dealSize > 0 && combinedLtmRate === 0 && (
        <div className="rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2"
          style={{ background: "rgba(255,153,34,0.12)", border: "1px solid rgba(255,153,34,0.35)", color: "#ff9922" }}>
          ⚠ Brak skuteczności settera / VSL — cel leadów nie zostanie obliczony. <Link href="/ustawienia" className="underline">Ustaw w Ustawieniach →</Link>
        </div>
      )}

      {/* Daily targets info */}
      {dailyLeadsTarget > 0 && (
        <div className="rounded-xl px-4 py-3 flex flex-wrap gap-6 text-sm"
          style={{ background: "var(--neon-dim)", border: "1px solid var(--neon-border)" }}>
          <span style={{ color: "var(--text-muted)" }}>Cele dzienne (wyliczone z celu miesięcznego):</span>
          <span style={{ color: "var(--neon)", fontWeight: 600 }}>Leady / dzień: {dailyLeadsTarget}</span>
          {monthlyBooked > 0 && <span style={{ color: "var(--neon)", fontWeight: 600 }}>Umawianie / dzień: {Math.ceil(monthlyBooked / 22)}</span>}
        </div>
      )}

      {/* Aggregated from weeks */}
      <div>
        <h2 className="text-lg font-bold mb-4" style={{ color: "var(--text-primary)" }}>Wyniki z tygodni</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {[
            { label: "Leady", value: totalLeads, code: "LEADS", derived: monthlyLeads, prev: prevLeads },
            { label: "Odbyłe spotkania", value: totalAttended, code: "MEETINGS_ATTENDED", derived: monthlyAttended, prev: prevAttended },
            { label: "Zamknięcia", value: totalClosings, code: "CLOSINGS", derived: monthlyClosings, prev: prevClosings },
            { label: "Przychód", value: totalRevenue, code: "REVENUE", derived: monthRevTarget, prev: prevRevenue },
            { label: "Show Up Rate", value: avgSUR, code: "SUR", derived: 0, prev: prevSUR },
            { label: "Closing %", value: avgCP, code: "CP", derived: 0, prev: prevCP },
          ].map((item) => {
            const t = getTarget(item.code, "WEEKLY");
            if (!t) return null;
            const target = item.derived > 0 ? item.derived : t.target;
            return (
              <KpiCard
                key={item.code}
                label={item.label}
                value={item.value}
                target={target}
                unit={t.unit}
                lowerIsBetter={t.lowerIsBetter}
                previousValue={item.prev}
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
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a2f" />
              <XAxis dataKey="name" stroke="#94A3B8" tick={{ fontSize: 12 }} />
              <YAxis stroke="#94A3B8" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: "#1E293B", border: "1px solid #334155", borderRadius: "12px" }}
                labelStyle={{ color: "#F1F5F9" }}
                formatter={(v: number) => [formatPLN(v), "Przychód"]}
              />
              <Bar dataKey="revenue" fill="#00ff88" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Strategic KPIs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>KPI strategiczne</h2>
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
