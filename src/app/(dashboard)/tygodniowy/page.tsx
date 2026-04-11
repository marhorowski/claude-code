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
} from "@/lib/calculations";
import {
  formatPLN,
  formatDateShort,
  formatNumber,
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

interface SalesSettings {
  dealSize: number;
  leadToMeetingRate: number;
  setterBookingRate: number;
  vslConversionRate: number;
}

export default function TygodniowyPage() {
  const { selectedClientId } = useClient();
  const { data: session } = useSession();
  const role = session?.user?.role || "";
  const isAdminOrLider = role === "ADMIN" || role === "LIDER";

  const now = new Date();
  const { week: todayWeek, year: todayYear } = getISOWeek(now);

  const [selectedWeek, setSelectedWeek] = useState(todayWeek);
  const [selectedYear, setSelectedYear] = useState(todayYear);

  const [weeklyForm, setWeeklyForm] = useState<WeeklyForm | null>(null);
  const [prevWeeklyForm, setPrevWeeklyForm] = useState<WeeklyForm | null>(null);
  const [targets, setTargets] = useState<KpiTarget[]>([]);
  const [dailyForms, setDailyForms] = useState<DailyForm[]>([]);
  const [monthlyRevGoal, setMonthlyRevGoal] = useState<number | null>(null);
  const [salesSettings, setSalesSettings] = useState<SalesSettings>({ dealSize: 0, leadToMeetingRate: 0 });
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);
  const [chartMetric, setChartMetric] = useState<"revenue" | "meetings">("revenue");

  const fetchData = useCallback(() => {
    if (!selectedClientId) return;
    setLoading(true);

    let prevWeek = selectedWeek - 1;
    let prevYear = selectedYear;
    if (prevWeek < 1) { prevWeek = 52; prevYear = selectedYear - 1; }

    const { start: weekStart, end: weekEnd } = getWeekBounds(selectedWeek, selectedYear);
    const weekMonth = weekStart.getMonth() + 1;
    const weekMonthYear = weekStart.getFullYear();

    Promise.all([
      fetch(`/api/weekly?clientId=${selectedClientId}&week=${selectedWeek}&year=${selectedYear}`).then(r => r.json()),
      fetch(`/api/weekly?clientId=${selectedClientId}&week=${prevWeek}&year=${prevYear}`).then(r => r.json()),
      fetch(`/api/kpi-targets?clientId=${selectedClientId}&period=WEEKLY`).then(r => r.json()),
      fetch(`/api/daily?clientId=${selectedClientId}`).then(r => r.json()),
      fetch(`/api/monthly?clientId=${selectedClientId}&month=${weekMonth}&year=${weekMonthYear}`).then(r => r.json()),
      fetch(`/api/sales-settings?clientId=${selectedClientId}`).then(r => r.json()),
    ])
      .then(([wf, pwf, kt, df, mf, ss]) => {
        setWeeklyForm(Array.isArray(wf) ? wf[0] || null : null);
        setPrevWeeklyForm(Array.isArray(pwf) ? pwf[0] || null : null);
        setTargets(Array.isArray(kt) ? kt : []);

        const monthGoal = Array.isArray(mf) ? mf[0] : null;
        setMonthlyRevGoal(monthGoal?.targetRevenue ?? null);

        if (ss && !ss.error) {
          setSalesSettings({
            dealSize: ss.dealSize ?? 0,
            leadToMeetingRate: ss.leadToMeetingRate ?? 0,
            setterBookingRate: ss.setterBookingRate ?? 0,
            vslConversionRate: ss.vslConversionRate ?? 0,
          });
        }

        const weekDailyForms = (Array.isArray(df) ? df : []).filter((f: DailyForm) => {
          const d = new Date(f.date);
          return d >= weekStart && d <= weekEnd;
        });
        setDailyForms(weekDailyForms);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedClientId, selectedWeek, selectedYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const weekBounds = getWeekBounds(selectedWeek, selectedYear);
  const getTarget = (code: string) => targets.find(t => t.code === code);

  // Revenue target from monthly goal
  const weeklyRevTarget = monthlyRevGoal
    ? Math.round(monthlyRevGoal / 4.33)
    : (getTarget("REVENUE")?.target ?? 0);

  // Derived targets computed from monthly goal + sales settings + KPI rates
  const surTarget = getTarget("SUR")?.target ?? 0;
  const cpTarget = getTarget("CP")?.target ?? 0;
  const dealSize = salesSettings.dealSize;
  // Combined lead→meeting rate: setter% × vsl% (sequential funnel), or legacy single rate
  const setterRate = salesSettings.setterBookingRate;
  const vslRate = salesSettings.vslConversionRate;
  const combinedLtmRate = setterRate > 0 && vslRate > 0
    ? (setterRate / 100) * (vslRate / 100) * 100  // result in %
    : salesSettings.leadToMeetingRate;
  const hasGoalBasis = monthlyRevGoal !== null && dealSize > 0;
  const derivedClosings = hasGoalBasis && weeklyRevTarget > 0 ? Math.ceil(weeklyRevTarget / dealSize) : 0;
  const derivedAttended = derivedClosings > 0 && cpTarget > 0 ? Math.ceil(derivedClosings / (cpTarget / 100)) : 0;
  const derivedBooked = derivedAttended > 0 && surTarget > 0 ? Math.ceil(derivedAttended / (surTarget / 100)) : 0;
  const derivedLeads = derivedBooked > 0 && combinedLtmRate > 0 ? Math.ceil(derivedBooked / (combinedLtmRate / 100)) : 0;
  // Daily leads target = weekly / 5 working days
  const dailyLeadsTarget = derivedLeads > 0 ? Math.ceil(derivedLeads / 5) : 0;

  // Actual KPIs
  const booked = weeklyForm?.totalMeetingsBooked ?? 0;
  const planned = weeklyForm?.totalPlannedMeetings ?? 0;
  const attended = weeklyForm?.totalAttended ?? 0;
  const closings = weeklyForm?.totalClosings ?? 0;
  const leads = weeklyForm?.totalLeads ?? 0;
  const revenue = weeklyForm?.totalRevenue ?? 0;
  const adSpendVal = weeklyForm?.adSpend ?? 0;

  // SUR: use booked as fallback when planned = 0
  const surBase = planned > 0 ? planned : booked;
  const sur = calcSUR(attended, surBase);
  const cp = calcCP(closings, attended);
  const lts = calcLTS(closings, leads);
  const cpl = calcCPL(adSpendVal, leads);

  const prevBooked = prevWeeklyForm?.totalMeetingsBooked ?? 0;
  const prevPlanned = prevWeeklyForm?.totalPlannedMeetings ?? 0;
  const prevSurBase = prevPlanned > 0 ? prevPlanned : prevBooked;
  const prevSur = calcSUR(prevWeeklyForm?.totalAttended ?? 0, prevSurBase);
  const prevCp = calcCP(prevWeeklyForm?.totalClosings ?? 0, prevWeeklyForm?.totalAttended ?? 0);

  // Daily chart data
  const DAYS = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"];
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekBounds.start);
    d.setDate(d.getDate() + i);
    const dayForms = dailyForms.filter(f => {
      const fd = new Date(f.date);
      return fd.toDateString() === d.toDateString();
    });
    return {
      name: DAYS[i],
      revenue: dayForms.reduce((s, f) => s + (f.revenue ?? 0), 0),
      meetings: dayForms.reduce((s, f) => s + (f.attendedMeetings ?? 0), 0),
    };
  });

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
        <div style={{ color: "var(--text-muted)" }}>Ładowanie danych...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold flex-1" style={{ color: "var(--text-primary)" }}>
          Dashboard Tygodniowy
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              let w = selectedWeek - 1; let y = selectedYear;
              if (w < 1) { w = 52; y--; }
              setSelectedWeek(w); setSelectedYear(y);
            }}
            className="p-2 rounded-xl transition-colors"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)", color: "var(--text-muted)" }}
          >←</button>

          <select
            value={`${selectedWeek}-${selectedYear}`}
            onChange={(e) => {
              const [w, y] = e.target.value.split("-").map(Number);
              setSelectedWeek(w); setSelectedYear(y);
            }}
            className="rounded-xl px-3 py-2 text-sm max-w-[260px]"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)", color: "var(--text-primary)" }}
          >
            {weekOptions.map(o => (
              <option key={`${o.week}-${o.year}`} value={`${o.week}-${o.year}`}>{o.label}</option>
            ))}
          </select>

          <button
            onClick={() => {
              let w = selectedWeek + 1; let y = selectedYear;
              if (w > 52) { w = 1; y++; }
              if (w > todayWeek || y > todayYear) return;
              setSelectedWeek(w); setSelectedYear(y);
            }}
            disabled={selectedWeek === todayWeek && selectedYear === todayYear}
            className="p-2 rounded-xl disabled:opacity-40 transition-colors"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)", color: "var(--text-muted)" }}
          >→</button>
        </div>
      </div>

      <div className="text-sm" style={{ color: "var(--text-muted)" }}>
        {`Tydzień ${selectedWeek} · ${formatDateShort(weekBounds.start)} – ${formatDateShort(weekBounds.end)} ${selectedYear}`}
        {isLocked && (
          <span className="ml-3 text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-lg">
            🔒 Zamknięty
          </span>
        )}
      </div>

      {/* Alert banners */}
      {isAdminOrLider && (
        <div className="space-y-2">
          {monthlyRevGoal === null && (
            <div
              className="px-4 py-3 rounded-xl text-sm flex flex-wrap items-center gap-2"
              style={{ background: "rgba(255,153,34,0.07)", border: "1px solid rgba(255,153,34,0.3)", color: "var(--orange)" }}
            >
              ⚠ Brak celu miesięcznego — cele ilościowe (spotkania, zamknięcia, leady) nie zostaną obliczone.
              <Link href="/cele" style={{ color: "var(--neon)", textDecoration: "underline" }}>
                Ustaw w zakładce Cele →
              </Link>
            </div>
          )}
          {monthlyRevGoal !== null && dealSize === 0 && (
            <div
              className="px-4 py-3 rounded-xl text-sm flex flex-wrap items-center gap-2"
              style={{ background: "rgba(255,153,34,0.07)", border: "1px solid rgba(255,153,34,0.3)", color: "var(--orange)" }}
            >
              ⚠ Brak Deal Size — cele zamknięć i spotkań nie zostaną obliczone.
              <Link href="/ustawienia" style={{ color: "var(--neon)", textDecoration: "underline" }}>
                Ustaw w Ustawienia →
              </Link>
            </div>
          )}
          {monthlyRevGoal !== null && dealSize > 0 && combinedLtmRate === 0 && (
            <div
              className="px-4 py-3 rounded-xl text-sm flex flex-wrap items-center gap-2"
              style={{ background: "rgba(255,153,34,0.07)", border: "1px solid rgba(255,153,34,0.3)", color: "var(--orange)" }}
            >
              ⚠ Brak skuteczności settera / VSL — cel leadów nie zostanie obliczony.
              <Link href="/ustawienia" style={{ color: "var(--neon)", textDecoration: "underline" }}>
                Ustaw w Ustawienia →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {[
          { code: "LEADS",             value: leads,   prev: prevWeeklyForm?.totalLeads,         derived: derivedLeads },
          { code: "MEETINGS_BOOKED",   value: booked,  prev: prevWeeklyForm?.totalMeetingsBooked, derived: derivedBooked },
          { code: "MEETINGS_ATTENDED", value: attended,prev: prevWeeklyForm?.totalAttended,       derived: derivedAttended },
          { code: "CLOSINGS",          value: closings,prev: prevWeeklyForm?.totalClosings,       derived: derivedClosings },
          { code: "REVENUE",           value: revenue, prev: prevWeeklyForm?.totalRevenue,        derived: weeklyRevTarget },
          { code: "SUR",               value: sur,     prev: prevSur,                             derived: 0 },
          { code: "CP",                value: cp,      prev: prevCp,                              derived: 0 },
          { code: "LTS",               value: lts,     prev: null,                                derived: 0 },
          ...(cpl > 0 ? [{ code: "CPL", value: cpl, prev: null, derived: 0 }] : []),
        ].map((item) => {
          const t = getTarget(item.code);
          if (!t) return null;
          const target = item.derived > 0 ? item.derived : t.target;
          return (
            <KpiCard
              key={item.code}
              label={t.label || item.code}
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

      {/* Daily breakdown */}
      {dailyLeadsTarget > 0 && (
        <div className="rounded-xl px-4 py-3 flex flex-wrap gap-6 text-sm"
          style={{ background: "var(--neon-dim)", border: "1px solid var(--neon-border)" }}>
          <span style={{ color: "var(--text-muted)" }}>Cele dzienne (wyliczone):</span>
          <span style={{ color: "var(--neon)", fontWeight: 600 }}>Leady / dzień: {dailyLeadsTarget}</span>
          {derivedBooked > 0 && <span style={{ color: "var(--neon)", fontWeight: 600 }}>Umawianie / dzień: {Math.ceil(derivedBooked / 5)}</span>}
        </div>
      )}

      {/* Chart */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold" style={{ color: "var(--text-primary)" }}>Wyniki dzienne w tygodniu</h2>
          <div className="flex gap-2">
            {(["revenue", "meetings"] as const).map(m => (
              <button
                key={m}
                onClick={() => setChartMetric(m)}
                className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                style={chartMetric === m
                  ? { background: "var(--neon-dim)", border: "1px solid var(--neon-border)", color: "var(--neon)" }
                  : { border: "1px solid var(--border-card)", color: "var(--text-muted)" }}
              >
                {m === "revenue" ? "Przychód" : "Spotkania"}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="name" stroke="#627a6d" tick={{ fontSize: 12, fill: "#627a6d" }} />
            <YAxis stroke="#627a6d" tick={{ fontSize: 12, fill: "#627a6d" }} />
            <Tooltip
              contentStyle={{ background: "#0e1210", border: "1px solid rgba(0,255,136,0.2)", borderRadius: "12px" }}
              labelStyle={{ color: "#e8f0ec", fontWeight: 600 }}
            />
            <Bar
              dataKey={chartMetric}
              fill="#00ff88"
              radius={[4, 4, 0, 0]}
              name={chartMetric === "revenue" ? "Przychód (PLN)" : "Spotkania"}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Week-to-week comparison */}
      {prevWeeklyForm && (
        <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
          <h2 className="font-bold mb-4" style={{ color: "var(--text-primary)" }}>
            Porównanie: Tydzień {selectedWeek} vs Tydzień {selectedWeek > 1 ? selectedWeek - 1 : 52}
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
                  { label: "Leady",            prev: prevWeeklyForm.totalLeads,    curr: leads },
                  { label: "Odbyłe spotkania", prev: prevWeeklyForm.totalAttended, curr: attended },
                  { label: "Zamknięcia",        prev: prevWeeklyForm.totalClosings, curr: closings },
                  { label: "Przychód (PLN)",    prev: prevWeeklyForm.totalRevenue,  curr: revenue },
                  { label: "SUR (%)",           prev: prevSur,                       curr: sur },
                  { label: "CP (%)",            prev: prevCp,                        curr: cp },
                ].map((row) => {
                  const diff = row.prev !== 0 ? ((row.curr - row.prev) / Math.abs(row.prev)) * 100 : 0;
                  const isPositive = diff >= 0;
                  return (
                    <tr key={row.label}>
                      <td className="font-medium" style={{ color: "var(--text-secondary)" }}>{row.label}</td>
                      <td style={{ color: "var(--text-muted)" }}>{formatNumber(row.prev, 1)}</td>
                      <td style={{ color: "var(--text-primary)" }}>{formatNumber(row.curr, 1)}</td>
                      <td>
                        <span style={{ color: isPositive ? "#22C55E" : "#EF4444", fontWeight: 600, fontSize: "0.875rem" }}>
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
    </div>
  );
}
