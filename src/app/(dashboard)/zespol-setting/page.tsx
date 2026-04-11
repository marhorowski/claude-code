"use client";

import { useState, useEffect, useCallback } from "react";
import { useClient } from "../layout";
import { useSession } from "next-auth/react";
import {
  calcBookingRate,
  getKpiStatus,
  getStatusColor,
  getISOWeek,
  getWeekBounds,
} from "@/lib/calculations";
import { formatPercent, formatDateShort, getMonthName } from "@/lib/utils";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

interface DailyForm {
  id: string;
  userId: string;
  date: string;
  callsMade: number | null;
  callsReceived: number | null;
  meetingsBooked: number | null;
  followUpCount: number | null;
  user: { id: string; name: string; role: string };
}

interface SetterStats {
  id: string;
  name: string;
  calls: number;
  received: number;
  booked: number;
  followUps: number;
  bookingRate: number;
  pickupRate: number;
}

interface KpiTarget {
  code: string;
  label: string;
  target: number;
  unit: string;
  period: string;
}

type Period = "week" | "month";

const C_NEON = "#00ff88";
const C_ORANGE = "#ff9922";
const C_CYAN = "#00d4ff";
const TOOLTIP = {
  contentStyle: {
    background: "#0e1210",
    border: "1px solid rgba(0,255,136,0.2)",
    borderRadius: "12px",
    padding: "8px 12px",
  },
  labelStyle: { color: "#e8f0ec", fontWeight: 600 },
  itemStyle: { color: "#e8f0ec" },
};
const DAYS = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"];

export default function ZespolSettingPage() {
  const { selectedClientId } = useClient();
  const { data: session } = useSession();
  const role = session?.user?.role || "";
  const isSetter = role === "SETTER";

  const now = new Date();
  const { week: todayWeek, year: todayYear } = getISOWeek(now);

  const [period, setPeriod] = useState<Period>("week");
  const [selectedWeek, setSelectedWeek] = useState(todayWeek);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(todayYear);
  const [selectedSetterId, setSelectedSetterId] = useState<string>("all");
  const [dailyForms, setDailyForms] = useState<DailyForm[]>([]);
  const [kpiTargets, setKpiTargets] = useState<KpiTarget[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(() => {
    if (!selectedClientId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/daily?clientId=${selectedClientId}`).then((r) => r.json()),
      fetch(`/api/kpi-targets?clientId=${selectedClientId}&period=DAILY`).then((r) => r.json()),
    ])
      .then(([data, kt]) => {
        const filtered = (Array.isArray(data) ? data : []).filter(
          (f: DailyForm) => f.user.role === "SETTER"
        );
        setDailyForms(filtered);
        setKpiTargets(Array.isArray(kt) ? kt : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedClientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredForms = dailyForms.filter((f) => {
    const d = new Date(f.date);
    if (period === "week") {
      const { start, end } = getWeekBounds(selectedWeek, selectedYear);
      return d >= start && d <= end;
    }
    if (period === "month") {
      return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
    }
    return true;
  });

  const viewForms =
    selectedSetterId === "all"
      ? filteredForms
      : filteredForms.filter((f) => f.userId === selectedSetterId);

  // Per-setter aggregation
  const setterMap = new Map<string, SetterStats>();
  filteredForms.forEach((f) => {
    const ex = setterMap.get(f.userId) || {
      id: f.userId,
      name: f.user.name,
      calls: 0,
      received: 0,
      booked: 0,
      followUps: 0,
      bookingRate: 0,
      pickupRate: 0,
    };
    ex.calls += f.callsMade ?? 0;
    ex.received += f.callsReceived ?? 0;
    ex.booked += f.meetingsBooked ?? 0;
    ex.followUps += f.followUpCount ?? 0;
    setterMap.set(f.userId, ex);
  });

  const setterStats: SetterStats[] = Array.from(setterMap.values())
    .map((s) => ({
      ...s,
      bookingRate: calcBookingRate(s.booked, s.calls),
      pickupRate: s.calls > 0 ? Math.round((s.received / s.calls) * 100) : 0,
    }))
    .sort((a, b) => b.bookingRate - a.bookingRate);

  const displayStats = isSetter
    ? setterStats.filter((s) => s.id === session?.user?.id)
    : setterStats;

  // Totals for selected view
  const totalCalls = viewForms.reduce((s, f) => s + (f.callsMade ?? 0), 0);
  const totalReceived = viewForms.reduce((s, f) => s + (f.callsReceived ?? 0), 0);
  const totalBooked = viewForms.reduce((s, f) => s + (f.meetingsBooked ?? 0), 0);
  const totalPickupRate =
    totalCalls > 0 ? Math.round((totalReceived / totalCalls) * 100) : 0;
  const totalBookingRate = calcBookingRate(totalBooked, totalCalls);

  // KPI targets
  const getKpiT = (code: string) =>
    kpiTargets.find((t) => t.code === code)?.target ?? 0;
  const callsTarget = getKpiT("CALLS_MADE_D") || 50;
  const pickupTarget = getKpiT("PICKUP_RATE") || 70;
  const bookingTarget = getKpiT("BOOKING_RATE_S") || 15;

  // Chart data
  const buildChartData = () => {
    if (period === "week") {
      const { start } = getWeekBounds(selectedWeek, selectedYear);
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const dayForms = viewForms.filter((f) => {
          const fd = new Date(f.date);
          return fd.toDateString() === d.toDateString();
        });
        const calls = dayForms.reduce((s, f) => s + (f.callsMade ?? 0), 0);
        const received = dayForms.reduce((s, f) => s + (f.callsReceived ?? 0), 0);
        const booked = dayForms.reduce((s, f) => s + (f.meetingsBooked ?? 0), 0);
        return {
          label: DAYS[i],
          calls,
          booked,
          bookingRate: calls > 0 ? Math.round((booked / calls) * 100) : 0,
          pickupRate: calls > 0 ? Math.round((received / calls) * 100) : 0,
        };
      });
    }
    // month: group by approximate week
    const buckets: Record<string, { calls: number; received: number; booked: number; label: string }> = {};
    viewForms.forEach((f) => {
      const d = new Date(f.date);
      const wk = `Tydz. ${Math.ceil(d.getDate() / 7)}`;
      if (!buckets[wk]) buckets[wk] = { calls: 0, received: 0, booked: 0, label: wk };
      buckets[wk].calls += f.callsMade ?? 0;
      buckets[wk].received += f.callsReceived ?? 0;
      buckets[wk].booked += f.meetingsBooked ?? 0;
    });
    return Object.values(buckets).map((w) => ({
      label: w.label,
      calls: w.calls,
      booked: w.booked,
      bookingRate: w.calls > 0 ? Math.round((w.booked / w.calls) * 100) : 0,
      pickupRate: w.calls > 0 ? Math.round((w.received / w.calls) * 100) : 0,
    }));
  };

  const chartData = buildChartData();
  const hasChartData = chartData.some((d) => d.calls > 0);

  // Period options
  const weekOptions: Array<{ week: number; year: number; label: string }> = [];
  for (let i = 0; i < 26; i++) {
    let w = todayWeek - i;
    let y = todayYear;
    if (w < 1) { w += 52; y -= 1; }
    const b = getWeekBounds(w, y);
    weekOptions.push({
      week: w,
      year: y,
      label: `Tydz. ${w} (${formatDateShort(b.start)}–${formatDateShort(b.end)}) ${y}`,
    });
  }
  const monthOptions: Array<{ m: number; y: number }> = [];
  for (let i = 0; i < 12; i++) {
    let m = now.getMonth() + 1 - i;
    let y = now.getFullYear();
    if (m < 1) { m += 12; y -= 1; }
    monthOptions.push({ m, y });
  }

  // Unique setters for selector
  const setters = Array.from(
    new Map(filteredForms.map((f) => [f.userId, f.user.name])).entries()
  ).map(([id, name]) => ({ id, name }));

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h1
          className="text-2xl font-bold flex-1"
          style={{ color: "var(--text-primary)" }}
        >
          Zespół — Setting
        </h1>

        {/* Period toggle */}
        <div
          className="flex gap-1 rounded-xl p-1"
          style={{
            background: "var(--bg-input)",
            border: "1px solid var(--border-card)",
          }}
        >
          {(["week", "month"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={
                period === p
                  ? { background: "var(--neon)", color: "#000" }
                  : { color: "var(--text-muted)" }
              }
            >
              {p === "week" ? "Tydzień" : "Miesiąc"}
            </button>
          ))}
        </div>

        {period === "week" && (
          <select
            value={`${selectedWeek}-${selectedYear}`}
            onChange={(e) => {
              const [w, y] = e.target.value.split("-").map(Number);
              setSelectedWeek(w);
              setSelectedYear(y);
            }}
            className="rounded-xl px-3 py-2 text-sm"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-card)",
              color: "var(--text-primary)",
            }}
          >
            {weekOptions.map((o) => (
              <option key={`${o.week}-${o.year}`} value={`${o.week}-${o.year}`}>
                {o.label}
              </option>
            ))}
          </select>
        )}

        {period === "month" && (
          <select
            value={`${selectedMonth}-${selectedYear}`}
            onChange={(e) => {
              const [m, y] = e.target.value.split("-").map(Number);
              setSelectedMonth(m);
              setSelectedYear(y);
            }}
            className="rounded-xl px-3 py-2 text-sm"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-card)",
              color: "var(--text-primary)",
            }}
          >
            {monthOptions.map((o) => (
              <option key={`${o.m}-${o.y}`} value={`${o.m}-${o.y}`}>
                {getMonthName(o.m)} {o.y}
              </option>
            ))}
          </select>
        )}

        {/* Setter selector */}
        {!isSetter && setters.length > 1 && (
          <select
            value={selectedSetterId}
            onChange={(e) => setSelectedSetterId(e.target.value)}
            className="rounded-xl px-3 py-2 text-sm"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-card)",
              color: "var(--text-primary)",
            }}
          >
            <option value="all">Cały zespół</option>
            {setters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>
          Ładowanie...
        </div>
      ) : (
        <>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                label: "Telefony wykonane",
                value: totalCalls,
                target: callsTarget,
                unit: "szt",
              },
              {
                label: "Odbieoralność",
                value: totalPickupRate,
                target: pickupTarget,
                unit: "%",
              },
              {
                label: "Booking Rate",
                value: totalBookingRate,
                target: bookingTarget,
                unit: "%",
              },
            ].map((kpi) => {
              const pct =
                kpi.target > 0
                  ? Math.min(Math.round((kpi.value / kpi.target) * 100), 100)
                  : 0;
              const status = getKpiStatus(kpi.value, kpi.target, false);
              const color = getStatusColor(status);
              const borderColor =
                status === "GREEN" || status === "GOD"
                  ? "rgba(0,255,136,0.28)"
                  : "var(--border-card)";
              return (
                <div
                  key={kpi.label}
                  style={{
                    background: "var(--bg-card)",
                    border: `1px solid ${borderColor}`,
                    borderRadius: "0.75rem",
                    padding: "1.25rem",
                    transition: "border-color 0.2s",
                  }}
                >
                  <div
                    className="text-xs font-semibold uppercase tracking-widest mb-3"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {kpi.label}
                  </div>
                  <div
                    className="flex items-end justify-between mb-3"
                  >
                    <div
                      className="text-3xl font-black"
                      style={{ color, letterSpacing: "-0.02em" }}
                    >
                      {kpi.unit === "%" ? `${kpi.value}%` : kpi.value}
                    </div>
                    <div className="text-right">
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                        Cel
                      </div>
                      <div
                        className="text-sm font-semibold"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {kpi.unit === "%" ? `${kpi.target}%` : kpi.target}
                      </div>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                  <div
                    className="mt-2 text-xs font-semibold"
                    style={{ color }}
                  >
                    {pct}% celu
                  </div>
                </div>
              );
            })}
          </div>

          {/* Charts */}
          {hasChartData && (
            <>
              {/* Calls + Booked bar chart */}
              <div
                className="rounded-2xl p-6"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-card)",
                }}
              >
                <h2
                  className="font-bold mb-4"
                  style={{ color: "var(--text-primary)" }}
                >
                  Telefony i umówione spotkania
                </h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} barCategoryGap="30%">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.06)"
                    />
                    <XAxis
                      dataKey="label"
                      stroke="#627a6d"
                      tick={{ fontSize: 12, fill: "#627a6d" }}
                    />
                    <YAxis
                      stroke="#627a6d"
                      tick={{ fontSize: 12, fill: "#627a6d" }}
                    />
                    <Tooltip {...TOOLTIP} />
                    <Legend
                      wrapperStyle={{ fontSize: "12px", color: "#94b8a4" }}
                    />
                    <Bar
                      dataKey="calls"
                      name="Telefony"
                      fill={C_NEON}
                      radius={[4, 4, 0, 0]}
                      opacity={0.9}
                    />
                    <Bar
                      dataKey="booked"
                      name="Umówione"
                      fill={C_ORANGE}
                      radius={[4, 4, 0, 0]}
                      opacity={0.9}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Booking rate + Pickup rate line chart */}
              <div
                className="rounded-2xl p-6"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-card)",
                }}
              >
                <h2
                  className="font-bold mb-1"
                  style={{ color: "var(--text-primary)" }}
                >
                  Skuteczność — Booking Rate & Odbieoralność
                </h2>
                <p
                  className="text-xs mb-4"
                  style={{ color: "var(--text-muted)" }}
                >
                  Cel Booking Rate:{" "}
                  <strong style={{ color: C_NEON }}>{bookingTarget}%</strong>
                  &nbsp;·&nbsp;Cel Odbieoralności:{" "}
                  <strong style={{ color: C_CYAN }}>{pickupTarget}%</strong>
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.06)"
                    />
                    <XAxis
                      dataKey="label"
                      stroke="#627a6d"
                      tick={{ fontSize: 12, fill: "#627a6d" }}
                    />
                    <YAxis
                      stroke="#627a6d"
                      tick={{ fontSize: 12, fill: "#627a6d" }}
                      tickFormatter={(v) => `${v}%`}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      {...TOOLTIP}
                      formatter={(v: number) => [`${v}%`]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "12px", color: "#94b8a4" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="bookingRate"
                      name="Booking Rate"
                      stroke={C_NEON}
                      strokeWidth={2.5}
                      dot={{ fill: C_NEON, r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="pickupRate"
                      name="Odbieoralność"
                      stroke={C_CYAN}
                      strokeWidth={2.5}
                      dot={{ fill: C_CYAN, r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {/* Setter table */}
          {displayStats.length > 0 ? (
            <>
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-card)",
                }}
              >
                <div
                  className="px-6 py-4"
                  style={{ borderBottom: "1px solid var(--border-card)" }}
                >
                  <h2
                    className="font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Wyniki setterów
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full kpi-table">
                    <thead>
                      <tr>
                        <th>Setter</th>
                        <th>Telefony</th>
                        <th>Odebrane</th>
                        <th>Odbieoralność</th>
                        <th>Umówione</th>
                        <th>Booking Rate</th>
                        <th>Follow-upy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayStats.map((s) => (
                        <tr key={s.id}>
                          <td
                            className="font-medium"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {s.name}
                          </td>
                          <td style={{ color: "var(--text-secondary)" }}>
                            {s.calls}
                          </td>
                          <td style={{ color: "var(--text-secondary)" }}>
                            {s.received}
                          </td>
                          <td
                            style={{
                              color: getStatusColor(
                                getKpiStatus(s.pickupRate, pickupTarget, false)
                              ),
                              fontWeight: 600,
                            }}
                          >
                            {s.pickupRate}%
                          </td>
                          <td style={{ color: "var(--text-secondary)" }}>
                            {s.booked}
                          </td>
                          <td
                            style={{
                              color: getStatusColor(
                                getKpiStatus(s.bookingRate, bookingTarget, false)
                              ),
                              fontWeight: 600,
                            }}
                          >
                            {formatPercent(s.bookingRate)}
                          </td>
                          <td style={{ color: "var(--text-secondary)" }}>
                            {s.followUps}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Booking rate ranking — team view only */}
              {!isSetter && selectedSetterId === "all" && displayStats.length > 1 && (
                <div
                  className="rounded-2xl p-6"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-card)",
                  }}
                >
                  <h2
                    className="font-bold mb-5"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Ranking — Booking Rate
                  </h2>
                  <div className="space-y-3">
                    {displayStats.map((s, i) => {
                      const color = getStatusColor(
                        getKpiStatus(s.bookingRate, bookingTarget, false)
                      );
                      const pct =
                        displayStats[0].bookingRate > 0
                          ? (s.bookingRate / displayStats[0].bookingRate) * 100
                          : 0;
                      return (
                        <div key={s.id} className="flex items-center gap-3">
                          <span
                            className="text-sm w-5 text-right flex-shrink-0"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {i + 1}.
                          </span>
                          <span
                            className="text-sm w-28 truncate flex-shrink-0"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {s.name}
                          </span>
                          <div
                            className="flex-1 h-2 rounded-full overflow-hidden"
                            style={{ background: "var(--border-card)" }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: color,
                                transition: "width 0.6s ease",
                              }}
                            />
                          </div>
                          <span
                            className="text-sm font-bold w-14 text-right flex-shrink-0"
                            style={{ color }}
                          >
                            {formatPercent(s.bookingRate)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div
              className="rounded-2xl p-12 text-center"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-card)",
              }}
            >
              <div style={{ color: "var(--text-muted)" }}>
                Brak danych za wybrany okres
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
