"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useClient } from "../layout";
import { useSession } from "next-auth/react";
import { DatePicker } from "@/components/ui/DatePicker";
import { calcSUR, calcCP, getISOWeek, getWeekBounds } from "@/lib/calculations";
import { formatPLN, formatPercent, formatDateShort, getMonthName } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

interface DailyFormData {
  id: string; userId: string; date: string;
  plannedMeetings: number | null; attendedMeetings: number | null;
  closings: number | null; revenue: number | null;
  meetingsBooked: number | null;
  meetingFollowUps: number | null;
  unqualifiedMeetings: number | null;
  user: { id: string; name: string; role: string };
}

interface Closer { id: string; name: string }

type Period = "day" | "week" | "month";

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}
function toDateInput(d: Date) { return d.toISOString().split("T")[0]; }

const C_NEON = "#00ff88";
const C_ORANGE = "#ff9922";
const C_CHART_BG = "#0a0d0b";
const C_GRID = "rgba(255,255,255,0.06)";
const C_AXIS = "#627a6d";

const customTooltipStyle = {
  contentStyle: { background: C_CHART_BG, border: `1px solid rgba(255,255,255,0.12)`, borderRadius: "10px" },
  labelStyle: { color: "#e8f0ec" },
};

export default function ZespolClosingPage() {
  const { selectedClientId } = useClient();
  const { data: session } = useSession();
  const role = session?.user?.role ?? "";
  const isCloser = role === "CLOSER";
  const isAdminOrLider = role === "ADMIN" || role === "LIDER";

  const now = new Date();
  const { week: todayWeek, year: todayYear } = getISOWeek(now);

  const [period, setPeriod] = useState<Period>("week");
  const [selectedDate, setSelectedDate] = useState(toDateInput(now));
  const [selectedWeek, setSelectedWeek] = useState(todayWeek);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(todayYear);
  const [selectedCloserId, setSelectedCloserId] = useState<string>("all");
  const [dailyForms, setDailyForms] = useState<DailyFormData[]>([]);
  const [loading, setLoading] = useState(false);

  // Add closer state
  const [showAddCloser, setShowAddCloser] = useState(false);
  const [newCloserName, setNewCloserName] = useState("");
  const [addingCloser, setAddingCloser] = useState(false);
  const [addMsg, setAddMsg] = useState<string | null>(null);
  const [addOk, setAddOk] = useState(true);

  const fetchData = useCallback(() => {
    if (!selectedClientId) return;
    setLoading(true);
    fetch(`/api/daily?clientId=${selectedClientId}`)
      .then(r => r.json())
      .then((data: DailyFormData[]) => {
        const arr = Array.isArray(data) ? data : [];
        const closerRoles = ["CLOSER", "LIDER", "ADMIN"];
        setDailyForms(arr.filter(f => closerRoles.includes(f.user.role)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedClientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // If closer, force-select themselves
  useEffect(() => {
    if (isCloser && session?.user?.id) {
      setSelectedCloserId(session.user.id);
    }
  }, [isCloser, session?.user?.id]);

  // Build closers list from forms
  const closers: Closer[] = useMemo(() => {
    const map = new Map<string, string>();
    dailyForms.forEach(f => { if (!map.has(f.userId)) map.set(f.userId, f.user.name); });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [dailyForms]);

  // Filter forms by period
  const periodForms = useMemo(() => {
    const base = selectedCloserId === "all" ? dailyForms : dailyForms.filter(f => f.userId === selectedCloserId);
    return base.filter(f => {
      const d = new Date(f.date);
      if (period === "day") return isSameDay(d, new Date(selectedDate));
      if (period === "week") {
        const { start, end } = getWeekBounds(selectedWeek, selectedYear);
        return d >= start && d <= end;
      }
      return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [dailyForms, selectedCloserId, period, selectedDate, selectedWeek, selectedMonth, selectedYear]);

  // Totals
  const T = useMemo(() => ({
    closings: periodForms.reduce((s, f) => s + (f.closings ?? 0), 0),
    revenue: periodForms.reduce((s, f) => s + (f.revenue ?? 0), 0),
    attended: periodForms.reduce((s, f) => s + (f.attendedMeetings ?? 0), 0),
    planned: periodForms.reduce((s, f) => s + (f.plannedMeetings ?? 0), 0),
    booked: periodForms.reduce((s, f) => s + (f.meetingsBooked ?? 0), 0),
    followUps: periodForms.reduce((s, f) => s + ((f.meetingFollowUps as any) ?? 0), 0),
    unqualified: periodForms.reduce((s, f) => s + ((f.unqualifiedMeetings as any) ?? 0), 0),
  }), [periodForms]);

  const sur = calcSUR(T.attended, T.planned);
  const cp = calcCP(T.closings, T.attended);

  // Per-closer scorecard
  const closerStats = useMemo(() => {
    const map = new Map<string, { id: string; name: string; closings: number; revenue: number; attended: number; planned: number; booked: number; followUps: number }>();
    periodForms.forEach(f => {
      const ex = map.get(f.userId) ?? { id: f.userId, name: f.user.name, closings: 0, revenue: 0, attended: 0, planned: 0, booked: 0, followUps: 0 };
      ex.closings += f.closings ?? 0;
      ex.revenue += f.revenue ?? 0;
      ex.attended += f.attendedMeetings ?? 0;
      ex.planned += f.plannedMeetings ?? 0;
      ex.booked += f.meetingsBooked ?? 0;
      ex.followUps += (f.meetingFollowUps as any) ?? 0;
      map.set(f.userId, ex);
    });
    return Array.from(map.values())
      .map(c => ({ ...c, sur: calcSUR(c.attended, c.planned), cp: calcCP(c.closings, c.attended) }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [periodForms]);

  // Chart data for week view (Mon–Fri)
  const weekChartData = useMemo(() => {
    if (period !== "week") return [];
    const DAYS = ["Pon", "Wt", "Śr", "Czw", "Pt"];
    const { start } = getWeekBounds(selectedWeek, selectedYear);
    return DAYS.map((name, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dayForms = periodForms.filter(f => isSameDay(new Date(f.date), d));
      return {
        name,
        Zamknięcia: dayForms.reduce((s, f) => s + (f.closings ?? 0), 0),
        "Odbyte spotk.": dayForms.reduce((s, f) => s + (f.attendedMeetings ?? 0), 0),
        "Follow-upy": dayForms.reduce((s, f) => s + ((f.meetingFollowUps as any) ?? 0), 0),
      };
    });
  }, [period, periodForms, selectedWeek, selectedYear]);

  // Chart data for month view (by week)
  const monthChartData = useMemo(() => {
    if (period !== "month") return [];
    const weekMap = new Map<number, { Zamknięcia: number; "Odbyte spotk.": number; "Follow-upy": number }>();
    periodForms.forEach(f => {
      const { week } = getISOWeek(new Date(f.date));
      const ex = weekMap.get(week) ?? { Zamknięcia: 0, "Odbyte spotk.": 0, "Follow-upy": 0 };
      ex.Zamknięcia += f.closings ?? 0;
      ex["Odbyte spotk."] += f.attendedMeetings ?? 0;
      ex["Follow-upy"] += (f.meetingFollowUps as any) ?? 0;
      weekMap.set(week, ex);
    });
    return Array.from(weekMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([week, data]) => ({ name: `Tydz. ${week}`, ...data }));
  }, [period, periodForms]);

  const chartData = period === "week" ? weekChartData : monthChartData;
  const showChart = (period === "week" || period === "month") && chartData.length > 0;

  // Week/month selectors
  const weekOptions = Array.from({ length: 26 }, (_, i) => {
    let w = todayWeek - i, y = todayYear;
    if (w < 1) { w += 52; y--; }
    const b = getWeekBounds(w, y);
    return { week: w, year: y, label: `Tydz. ${w} · ${formatDateShort(b.start)}–${formatDateShort(b.end)} ${y}` };
  });
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    let m = now.getMonth() + 1 - i, y = now.getFullYear();
    if (m < 1) { m += 12; y--; }
    return { m, y };
  });

  const addVirtualCloser = async () => {
    if (!newCloserName.trim() || !selectedClientId) return;
    setAddingCloser(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCloserName.trim(),
          role: "CLOSER",
          virtual: true,
          clientIds: [selectedClientId],
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Błąd");
      setAddMsg(`Dodano ${newCloserName.trim()}!`);
      setAddOk(true);
      setNewCloserName("");
      setTimeout(() => { setAddMsg(null); setShowAddCloser(false); }, 2000);
      fetchData();
    } catch (e: any) {
      setAddMsg(e.message);
      setAddOk(false);
      setTimeout(() => setAddMsg(null), 3000);
    }
    setAddingCloser(false);
  };

  // Helpers
  const color = (val: number, target: number) => {
    if (!target || !val) return "var(--text-muted)";
    const r = val / target;
    if (r >= 1.5) return "var(--gold)";
    if (r >= 1) return "var(--neon)";
    if (r >= 0.5) return "var(--orange)";
    return "var(--red)";
  };

  const TABS: { id: Period; label: string }[] = [
    { id: "day", label: "Dzienny" },
    { id: "week", label: "Tygodniowy" },
    { id: "month", label: "Miesięczny" },
  ];

  const card = {
    background: "var(--bg-card)",
    border: "1px solid var(--border-card)",
    borderRadius: "1rem",
  } as const;

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Zespół — Closing</h1>
        {isAdminOrLider && (
          <button
            onClick={() => setShowAddCloser(!showAddCloser)}
            className="text-sm font-medium px-4 py-2 rounded-lg transition-all"
            style={{
              background: showAddCloser ? "var(--neon-dim)" : "var(--bg-elevated)",
              border: "1px solid var(--border-card)",
              color: showAddCloser ? "var(--neon)" : "var(--text-muted)",
            }}
          >
            {showAddCloser ? "✕ Anuluj" : "+ Dodaj closera"}
          </button>
        )}
      </div>

      {/* Quick-add closer panel */}
      {showAddCloser && isAdminOrLider && (
        <div style={{ ...card, padding: "1.25rem", border: "1px solid var(--neon-border)" }}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--neon)" }}>
            Szybkie dodawanie closera
          </div>
          <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
            Closer nie będzie miał dostępu do logowania — dane za niego wprowadza Lider/Admin.
          </p>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="lbl">Imię i Nazwisko</label>
              <input
                type="text"
                placeholder="np. Jan Kowalski"
                className="w-full text-sm px-3 py-2.5 rounded-lg"
                style={{ background: "var(--bg-input)", border: "1px solid var(--border-card)", color: "var(--text-primary)" }}
                value={newCloserName}
                onChange={e => setNewCloserName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addVirtualCloser()}
              />
            </div>
            <button
              onClick={addVirtualCloser}
              disabled={addingCloser || !newCloserName.trim()}
              className="text-sm font-semibold px-5 py-2.5 rounded-lg"
              style={{ background: "var(--neon)", color: "#000", opacity: addingCloser ? 0.7 : 1 }}
            >
              {addingCloser ? "..." : "Dodaj"}
            </button>
          </div>
          {addMsg && (
            <div className="text-xs mt-2" style={{ color: addOk ? "var(--neon)" : "var(--red)" }}>{addMsg}</div>
          )}
        </div>
      )}

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Period tabs */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-card)" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setPeriod(t.id)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={period === t.id
                ? { background: "var(--neon-dim)", color: "var(--neon)", border: "1px solid var(--neon-border)" }
                : { color: "var(--text-muted)", border: "1px solid transparent" }
              }>
              {t.label}
            </button>
          ))}
        </div>

        {/* Closer selector */}
        {!isCloser && closers.length > 0 && (
          <select value={selectedCloserId} onChange={e => setSelectedCloserId(e.target.value)}
            className="text-sm px-3 py-2 rounded-lg"
            style={{ background: "var(--bg-input)", border: "1px solid var(--border-card)", color: "var(--text-primary)" }}>
            <option value="all">Cały zespół</option>
            {closers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}

        {/* Time range */}
        {period === "day" && (
          <DatePicker value={selectedDate} onChange={setSelectedDate}
            max={new Date().toISOString().split("T")[0]}
            className="text-sm px-3 py-2 rounded-lg"
            style={{ background: "var(--bg-input)", border: "1px solid var(--border-card)", color: "var(--text-primary)", minWidth: "150px" }} />
        )}
        {period === "week" && (
          <select value={`${selectedWeek}-${selectedYear}`}
            onChange={e => { const [w, y] = e.target.value.split("-").map(Number); setSelectedWeek(w); setSelectedYear(y); }}
            className="text-sm px-3 py-2 rounded-lg"
            style={{ background: "var(--bg-input)", border: "1px solid var(--border-card)", color: "var(--text-primary)" }}>
            {weekOptions.map(o => <option key={`${o.week}-${o.year}`} value={`${o.week}-${o.year}`}>{o.label}</option>)}
          </select>
        )}
        {period === "month" && (
          <select value={`${selectedMonth}-${selectedYear}`}
            onChange={e => { const [m, y] = e.target.value.split("-").map(Number); setSelectedMonth(m); setSelectedYear(y); }}
            className="text-sm px-3 py-2 rounded-lg"
            style={{ background: "var(--bg-input)", border: "1px solid var(--border-card)", color: "var(--text-primary)" }}>
            {monthOptions.map(o => <option key={`${o.m}-${o.y}`} value={`${o.m}-${o.y}`}>{getMonthName(o.m)} {o.y}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm animate-pulse" style={{ color: "var(--text-muted)" }}>Ładowanie...</div>
      ) : (
        <>
          {/* Primary KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Zamknięcia", value: T.closings, formatted: String(T.closings), target: 1 },
              { label: "Przychód", value: T.revenue, formatted: formatPLN(T.revenue), target: 1 },
              { label: "Show Up Rate", value: sur, formatted: `${sur.toFixed(1)}%`, target: 70 },
              { label: "Closing %", value: cp, formatted: `${cp.toFixed(1)}%`, target: 30 },
            ].map(c => (
              <div key={c.label} style={{ ...card, padding: "1.25rem" }}>
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>{c.label}</div>
                <div className="text-2xl font-black" style={{ color: c.value > 0 ? color(c.value, c.target) : "var(--text-muted)" }}>
                  {c.formatted}
                </div>
              </div>
            ))}
          </div>

          {/* Secondary metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Odbyte spotkania", value: T.attended },
              { label: "Umówione spotkania", value: T.booked },
              { label: "Follow-upy ze spotk.", value: T.followUps },
              { label: "Spotk. niekwalifikowane", value: T.unqualified },
            ].map(c => (
              <div key={c.label} style={{ ...card, padding: "1rem" }}>
                <div className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>{c.label}</div>
                <div className="text-xl font-bold" style={{ color: c.value > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          {showChart && (
            <div style={{ ...card, padding: "1.25rem" }}>
              <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
                {period === "week" ? "Wyniki dzienne w tygodniu" : "Wyniki tygodniowe w miesiącu"}
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke={C_GRID} />
                  <XAxis dataKey="name" stroke={C_AXIS} tick={{ fontSize: 11 }} />
                  <YAxis stroke={C_AXIS} tick={{ fontSize: 11 }} />
                  <Tooltip {...customTooltipStyle} />
                  <Legend wrapperStyle={{ color: C_AXIS, fontSize: "11px" }} />
                  <Bar dataKey="Zamknięcia" fill={C_NEON} radius={[4, 4, 0, 0]} opacity={0.9} />
                  <Bar dataKey="Odbyte spotk." fill={C_ORANGE} radius={[4, 4, 0, 0]} opacity={0.85} />
                  <Bar dataKey="Follow-upy" fill="#6366f1" radius={[4, 4, 0, 0]} opacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Closer scorecard */}
          {!isCloser && closerStats.length > 0 && (
            <div style={{ ...card, overflow: "hidden" }}>
              <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border-card)" }}>
                <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                  Scorecard closerów
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full kpi-table">
                  <thead>
                    <tr>
                      <th>Closer</th>
                      <th>Plan. spotk.</th>
                      <th>Odbyte spotk.</th>
                      <th>SUR</th>
                      <th>Zamknięcia</th>
                      <th>CP</th>
                      <th>Follow-upy</th>
                      <th>Przychód</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closerStats.map(c => (
                      <tr key={c.id}
                        style={{ cursor: "pointer" }}
                        onClick={() => setSelectedCloserId(selectedCloserId === c.id ? "all" : c.id)}>
                        <td style={{ color: selectedCloserId === c.id ? "var(--neon)" : "var(--text-primary)", fontWeight: 600 }}>
                          {c.name}
                          {selectedCloserId === c.id && <span className="ml-1 text-xs" style={{ color: "var(--neon)" }}>●</span>}
                        </td>
                        <td>{c.planned}</td>
                        <td>{c.attended}</td>
                        <td style={{ color: c.sur > 0 ? (c.sur >= 70 ? "var(--neon)" : c.sur >= 40 ? "var(--orange)" : "var(--red)") : "var(--text-muted)" }}>
                          {formatPercent(c.sur)}
                        </td>
                        <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>{c.closings}</td>
                        <td style={{ color: c.cp > 0 ? (c.cp >= 30 ? "var(--neon)" : c.cp >= 15 ? "var(--orange)" : "var(--red)") : "var(--text-muted)" }}>
                          {formatPercent(c.cp)}
                        </td>
                        <td>{c.followUps}</td>
                        <td style={{ color: "var(--neon)", fontWeight: 600 }}>{formatPLN(c.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Individual closer view */}
          {selectedCloserId !== "all" && (() => {
            const closerInfo = closerStats.find(c => c.id === selectedCloserId);
            if (!closerInfo) return null;
            return (
              <div style={{ ...card, padding: "1.25rem", border: "1px solid var(--neon-border)" }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-bold" style={{ color: "var(--neon)" }}>{closerInfo.name}</div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>Szczegóły indywidualne</div>
                  </div>
                  <button onClick={() => setSelectedCloserId("all")} className="text-xs px-3 py-1.5 rounded-lg"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-card)", color: "var(--text-muted)" }}>
                    ← Cały zespół
                  </button>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {[
                    { label: "Close Rate", value: `${closerInfo.cp.toFixed(1)}%`, color: closerInfo.cp >= 30 ? "var(--neon)" : "var(--orange)" },
                    { label: "Zamknięcia", value: String(closerInfo.closings), color: "var(--text-primary)" },
                    { label: "Przychód", value: formatPLN(closerInfo.revenue), color: "var(--neon)" },
                    { label: "SUR", value: `${closerInfo.sur.toFixed(1)}%`, color: closerInfo.sur >= 70 ? "var(--neon)" : "var(--orange)" },
                    { label: "Odbyte spotk.", value: String(closerInfo.attended), color: "var(--text-primary)" },
                    { label: "Follow-upy", value: String(closerInfo.followUps), color: "var(--text-primary)" },
                  ].map(m => (
                    <div key={m.label} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-card)", borderRadius: "0.75rem", padding: "0.875rem" }}>
                      <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{m.label}</div>
                      <div className="text-lg font-bold" style={{ color: m.color }}>{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Empty state */}
          {periodForms.length === 0 && !loading && (
            <div style={{ ...card, padding: "3rem", textAlign: "center" }}>
              <div className="text-3xl mb-3" style={{ opacity: 0.2 }}>◉</div>
              <div className="text-sm" style={{ color: "var(--text-muted)" }}>Brak danych za wybrany okres</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
