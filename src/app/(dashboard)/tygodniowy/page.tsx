"use client";

import { useState, useEffect, useCallback } from "react";
import { useClient } from "../layout";
import { useSession } from "next-auth/react";
import {
  getISOWeek,
  getWeekBounds,
  calcSUR,
  calcCP,
  calcLTS,
  calcCPL,
  getKpiStatus,
  getStatusColor,
} from "@/lib/calculations";
import {
  formatPLN,
  formatPercent,
  formatDateShort,
  formatNumber,
  formatValue,
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
  id?: string;
  weekNumber: number;
  year: number;
  weekStart: string;
  weekEnd: string;
  totalLeads: number;
  totalCallsMade: number;
  totalMeetingsBooked: number;
  totalPlannedMeetings: number;
  totalAttended: number;
  totalClosings: number;
  totalRevenue: number;
  adSpend: number | null;
  cpl: number | null;
  notes: string | null;
  lockedAt: string | null;
}

interface KpiTarget {
  code: string;
  label: string;
  target: number;
  period: string;
  unit: string;
  lowerIsBetter: boolean;
}

interface DailyForm {
  date: string;
  plannedMeetings: number | null;
  attendedMeetings: number | null;
  closings: number | null;
  revenue: number | null;
}

export default function TygodniowyPage() {
  const { selectedClientId } = useClient();
  const { data: session } = useSession();
  const role = session?.user?.role || "";
  const isAdmin = role === "ADMIN";
  const isLider = role === "LIDER";

  const now = new Date();
  const { week: todayWeek, year: todayYear } = getISOWeek(now);

  const [selectedWeek, setSelectedWeek] = useState(todayWeek);
  const [selectedYear, setSelectedYear] = useState(todayYear);

  const [weeklyForm, setWeeklyForm] = useState<WeeklyForm | null>(null);
  const [prevWeeklyForm, setPrevWeeklyForm] = useState<WeeklyForm | null>(null);
  const [targets, setTargets] = useState<KpiTarget[]>([]);
  const [dailyForms, setDailyForms] = useState<DailyForm[]>([]);
  const [allWeeklyForms, setAllWeeklyForms] = useState<WeeklyForm[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [totalLeads, setTotalLeads] = useState("");
  const [adSpend, setAdSpend] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [chartMetric, setChartMetric] = useState<"revenue" | "meetings">("revenue");

  const fetchData = useCallback(() => {
    if (!selectedClientId) return;
    setLoading(true);

    // Prev week
    let prevWeek = selectedWeek - 1;
    let prevYear = selectedYear;
    if (prevWeek < 1) {
      prevWeek = 52;
      prevYear = selectedYear - 1;
    }

    const { start: weekStart, end: weekEnd } = getWeekBounds(selectedWeek, selectedYear);

    Promise.all([
      fetch(`/api/weekly?clientId=${selectedClientId}&week=${selectedWeek}&year=${selectedYear}`).then((r) => r.json()),
      fetch(`/api/weekly?clientId=${selectedClientId}&week=${prevWeek}&year=${prevYear}`).then((r) => r.json()),
      fetch(`/api/kpi-targets?clientId=${selectedClientId}&period=WEEKLY`).then((r) => r.json()),
      fetch(`/api/daily?clientId=${selectedClientId}`).then((r) => r.json()),
      fetch(`/api/weekly?clientId=${selectedClientId}`).then((r) => r.json()),
    ])
      .then(([wf, pwf, kt, df, allWf]) => {
        const current = Array.isArray(wf) ? wf[0] : null;
        const prev = Array.isArray(pwf) ? pwf[0] : null;
        setWeeklyForm(current || null);
        setPrevWeeklyForm(prev || null);
        setTargets(kt);
        setAllWeeklyForms(Array.isArray(allWf) ? allWf : []);

        // Filter daily forms for selected week
        const weekDailyForms = (Array.isArray(df) ? df : []).filter((f: DailyForm) => {
          const d = new Date(f.date);
          return d >= weekStart && d <= weekEnd;
        });
        setDailyForms(weekDailyForms);

        if (current) {
          setTotalLeads(String(current.totalLeads));
          setAdSpend(current.adSpend ? String(current.adSpend) : "");
          setFormNotes(current.notes || "");
        } else {
          setTotalLeads("");
          setAdSpend("");
          setFormNotes("");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedClientId, selectedWeek, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const weekBounds = getWeekBounds(selectedWeek, selectedYear);

  const getTarget = (code: string) => targets.find((t) => t.code === code);

  // Computed KPIs
  const planned = weeklyForm?.totalPlannedMeetings ?? 0;
  const attended = weeklyForm?.totalAttended ?? 0;
  const closings = weeklyForm?.totalClosings ?? 0;
  const leads = weeklyForm?.totalLeads ?? 0;
  const revenue = weeklyForm?.totalRevenue ?? 0;
  const adSpendVal = weeklyForm?.adSpend ?? 0;

  const sur = calcSUR(attended, planned);
  const cp = calcCP(closings, attended);
  const lts = calcLTS(closings, leads);
  const cpl = calcCPL(adSpendVal, leads);

  // Prev week KPIs
  const prevSur = calcSUR(prevWeeklyForm?.totalAttended ?? 0, prevWeeklyForm?.totalPlannedMeetings ?? 0);
  const prevCp = calcCP(prevWeeklyForm?.totalClosings ?? 0, prevWeeklyForm?.totalAttended ?? 0);

  // Daily chart data
  const DAYS = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"];
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekBounds.start);
    d.setDate(d.getDate() + i);
    const dayForms = dailyForms.filter((f) => {
      const fd = new Date(f.date);
      return fd.toDateString() === d.toDateString();
    });
    return {
      name: DAYS[i],
      revenue: dayForms.reduce((s, f) => s + (f.revenue ?? 0), 0),
      meetings: dayForms.reduce((s, f) => s + (f.attendedMeetings ?? 0), 0),
    };
  });

  async function handleSave(lock = false) {
    if (!selectedClientId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          weekNumber: selectedWeek,
          year: selectedYear,
          totalLeads: parseInt(totalLeads) || 0,
          adSpend: adSpend ? parseFloat(adSpend) : null,
          notes: formNotes || null,
          lock,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Błąd");
      setToast({ msg: lock ? "Tydzień zamknięty ✓" : "Dane zapisane ✓", type: "success" });
      fetchData();
    } catch (err: any) {
      setToast({ msg: err.message || "Błąd zapisu", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  // Generate week options for dropdown (last 52 weeks)
  const weekOptions: Array<{ week: number; year: number; label: string }> = [];
  for (let i = 0; i < 52; i++) {
    let w = todayWeek - i;
    let y = todayYear;
    if (w < 1) { w += 52; y -= 1; }
    const b = getWeekBounds(w, y);
    weekOptions.push({
      week: w,
      year: y,
      label: `Tydzień ${w} (${formatDateShort(b.start)}–${formatDateShort(b.end)}) ${y}`,
    });
  }

  const isLocked = !!weeklyForm?.lockedAt;

  if (loading && !weeklyForm && targets.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Ładowanie danych...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header with navigation */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-white flex-1">Dashboard Tygodniowy</h1>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              let w = selectedWeek - 1;
              let y = selectedYear;
              if (w < 1) { w = 52; y--; }
              setSelectedWeek(w);
              setSelectedYear(y);
            }}
            className="p-2 bg-[#1E293B] border border-[#334155] rounded-xl text-slate-400 hover:text-white transition-colors"
          >
            ←
          </button>

          <select
            value={`${selectedWeek}-${selectedYear}`}
            onChange={(e) => {
              const [w, y] = e.target.value.split("-").map(Number);
              setSelectedWeek(w);
              setSelectedYear(y);
            }}
            className="bg-[#1E293B] border border-[#334155] rounded-xl px-3 py-2 text-white text-sm max-w-[260px]"
          >
            {weekOptions.map((o) => (
              <option key={`${o.week}-${o.year}`} value={`${o.week}-${o.year}`}>
                {o.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              let w = selectedWeek + 1;
              let y = selectedYear;
              if (w > 52) { w = 1; y++; }
              if (w > todayWeek || y > todayYear) return;
              setSelectedWeek(w);
              setSelectedYear(y);
            }}
            disabled={selectedWeek === todayWeek && selectedYear === todayYear}
            className="p-2 bg-[#1E293B] border border-[#334155] rounded-xl text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
          >
            →
          </button>
        </div>
      </div>

      <div className="text-slate-400 text-sm">
        {`Tydzień ${selectedWeek} · ${formatDateShort(weekBounds.start)} – ${formatDateShort(weekBounds.end)} ${selectedYear}`}
        {isLocked && (
          <span className="ml-3 text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-lg">
            🔒 Zamknięty
          </span>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {[
          { code: "LEADS", value: leads, prev: prevWeeklyForm?.totalLeads },
          { code: "MEETINGS_BOOKED", value: weeklyForm?.totalMeetingsBooked ?? 0, prev: prevWeeklyForm?.totalMeetingsBooked },
          { code: "MEETINGS_ATTENDED", value: attended, prev: prevWeeklyForm?.totalAttended },
          { code: "CLOSINGS", value: closings, prev: prevWeeklyForm?.totalClosings },
          { code: "REVENUE", value: revenue, prev: prevWeeklyForm?.totalRevenue },
          { code: "SUR", value: sur, prev: prevSur },
          { code: "CP", value: cp, prev: prevCp },
          { code: "LTS", value: lts, prev: null },
          ...(cpl > 0 ? [{ code: "CPL", value: cpl, prev: null }] : []),
        ].map((item) => {
          const t = getTarget(item.code);
          if (!t) return null;
          return (
            <KpiCard
              key={item.code}
              label={t.label || item.code}
              value={item.value}
              target={t.target}
              unit={t.unit}
              lowerIsBetter={t.lowerIsBetter}
              previousValue={item.prev}
              compact
            />
          );
        })}
      </div>

      {/* Chart */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-white">Wyniki dzienne w tygodniu</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setChartMetric("revenue")}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                chartMetric === "revenue"
                  ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-400"
                  : "border-[#334155] text-slate-400 hover:text-white"
              }`}
            >
              Przychód
            </button>
            <button
              onClick={() => setChartMetric("meetings")}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                chartMetric === "meetings"
                  ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-400"
                  : "border-[#334155] text-slate-400 hover:text-white"
              }`}
            >
              Spotkania
            </button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" stroke="#94A3B8" tick={{ fontSize: 12 }} />
            <YAxis stroke="#94A3B8" tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: "#1E293B", border: "1px solid #334155", borderRadius: "12px" }}
              labelStyle={{ color: "#F1F5F9" }}
              itemStyle={{ color: "#6366F1" }}
            />
            <Bar
              dataKey={chartMetric}
              fill="#6366F1"
              radius={[4, 4, 0, 0]}
              name={chartMetric === "revenue" ? "Przychód (PLN)" : "Spotkania"}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Comparison with previous week */}
      {prevWeeklyForm && (
        <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-6">
          <h2 className="font-bold text-white mb-4">
            Porównanie: Tydzień {selectedWeek} vs Tydzień{" "}
            {selectedWeek > 1 ? selectedWeek - 1 : 52}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full kpi-table">
              <thead>
                <tr>
                  <th>KPI</th>
                  <th>Poprzedni tydzień</th>
                  <th>Ten tydzień</th>
                  <th>Zmiana</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Leady", prev: prevWeeklyForm.totalLeads, curr: leads },
                  { label: "Odbyłe spotkania", prev: prevWeeklyForm.totalAttended, curr: attended },
                  { label: "Zamknięcia", prev: prevWeeklyForm.totalClosings, curr: closings },
                  { label: "Przychód (PLN)", prev: prevWeeklyForm.totalRevenue, curr: revenue },
                  { label: "SUR (%)", prev: prevSur, curr: sur },
                  { label: "CP (%)", prev: prevCp, curr: cp },
                ].map((row) => {
                  const diff = row.prev !== 0 ? ((row.curr - row.prev) / Math.abs(row.prev)) * 100 : 0;
                  const isPositive = diff >= 0;
                  return (
                    <tr key={row.label}>
                      <td className="text-slate-300 font-medium">{row.label}</td>
                      <td className="text-slate-400">{formatNumber(row.prev, 1)}</td>
                      <td className="text-white">{formatNumber(row.curr, 1)}</td>
                      <td>
                        <span className={`text-sm font-semibold ${isPositive ? "text-green-400" : "text-red-400"}`}>
                          {isPositive ? "↑" : "↓"} {Math.abs(diff).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Weekly Form (Lider/Admin) */}
      {(isAdmin || isLider) && (
        <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-6">
          <h2 className="font-bold text-white mb-5">
            Formularz tygodniowy
            {isLocked && (
              <span className="ml-2 text-xs text-yellow-400">(zablokowany)</span>
            )}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Liczba leadów w tygodniu</label>
              <input
                type="number"
                value={totalLeads}
                onChange={(e) => setTotalLeads(e.target.value)}
                disabled={isLocked}
                min="0"
                className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 text-white text-sm disabled:opacity-50"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Wydatki na reklamy (PLN)</label>
              <input
                type="number"
                value={adSpend}
                onChange={(e) => setAdSpend(e.target.value)}
                disabled={isLocked}
                min="0"
                step="0.01"
                className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 text-white text-sm disabled:opacity-50"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">CPL (auto)</label>
              <div className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 text-slate-400 text-sm">
                {totalLeads && adSpend && parseInt(totalLeads) > 0
                  ? formatPLN(parseFloat(adSpend) / parseInt(totalLeads))
                  : "— obliczany automatycznie"}
              </div>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs text-slate-400 mb-1">Notatka</label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              disabled={isLocked}
              rows={2}
              className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 text-white text-sm resize-none disabled:opacity-50"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => handleSave(false)}
              disabled={loading || isLocked}
              className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors"
            >
              Zapisz dane
            </button>
            {!isLocked && (
              <button
                onClick={() => {
                  if (confirm("Czy na pewno chcesz zamknąć ten tydzień? Danych nie będzie można edytować.")) {
                    handleSave(true);
                  }
                }}
                disabled={loading}
                className="bg-orange-500/20 border border-orange-500/40 hover:bg-orange-500/30 text-orange-400 font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors"
              >
                🔒 Zamknij tydzień
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
