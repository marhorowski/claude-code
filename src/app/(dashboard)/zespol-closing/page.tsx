"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useClient } from "../layout";
import { useSession } from "next-auth/react";
import {
  calcSUR, calcCP, getKpiStatus, getStatusColor, getISOWeek, getWeekBounds,
} from "@/lib/calculations";
import { formatPLN, formatPercent, formatDateShort, getMonthName } from "@/lib/utils";

interface DailyForm {
  id: string; userId: string; date: string;
  plannedMeetings: number | null; attendedMeetings: number | null;
  closings: number | null; revenue: number | null;
  user: { id: string; name: string; role: string };
}

interface CloserStats {
  id: string; name: string; planned: number; attended: number;
  closings: number; revenue: number; sur: number; cp: number;
}

type Period = "week" | "month" | "quarter";

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function ZespolClosingPage() {
  const { selectedClientId } = useClient();
  const { data: session } = useSession();
  const role = session?.user?.role || "";
  const isCloser = role === "CLOSER";

  const now = new Date();
  const { week: todayWeek, year: todayYear } = getISOWeek(now);

  const [period, setPeriod] = useState<Period>("week");
  const [selectedWeek, setSelectedWeek] = useState(todayWeek);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil((now.getMonth() + 1) / 3));
  const [selectedYear, setSelectedYear] = useState(todayYear);
  const [dailyForms, setDailyForms] = useState<DailyForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCloser, setSelectedCloser] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    if (!selectedClientId) return;
    setLoading(true);
    fetch(`/api/daily?clientId=${selectedClientId}`)
      .then(r => r.json())
      .then((data: DailyForm[]) => {
        const filtered = (Array.isArray(data) ? data : []).filter(
          f => f.user.role === "CLOSER" || f.user.role === "LIDER" || f.user.role === "ADMIN"
        );
        setDailyForms(filtered);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedClientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Today's planned meetings per closer
  const todayForms = useMemo(() => {
    const today = new Date();
    return dailyForms.filter(f => isSameDay(new Date(f.date), today));
  }, [dailyForms]);

  // Filter by period
  const filteredForms = useMemo(() => dailyForms.filter(f => {
    const d = new Date(f.date);
    if (period === "week") {
      const { start, end } = getWeekBounds(selectedWeek, selectedYear);
      return d >= start && d <= end;
    }
    if (period === "month") return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
    if (period === "quarter") {
      const qMonths = [(selectedQuarter - 1) * 3 + 1, (selectedQuarter - 1) * 3 + 2, selectedQuarter * 3];
      return qMonths.includes(d.getMonth() + 1) && d.getFullYear() === selectedYear;
    }
    return true;
  }), [dailyForms, period, selectedWeek, selectedMonth, selectedQuarter, selectedYear]);

  // Group by closer
  const closerStats: CloserStats[] = useMemo(() => {
    const map = new Map<string, CloserStats>();
    filteredForms.forEach(f => {
      const ex = map.get(f.userId) || { id: f.userId, name: f.user.name, planned: 0, attended: 0, closings: 0, revenue: 0, sur: 0, cp: 0 };
      ex.planned += f.plannedMeetings ?? 0;
      ex.attended += f.attendedMeetings ?? 0;
      ex.closings += f.closings ?? 0;
      ex.revenue += f.revenue ?? 0;
      map.set(f.userId, ex);
    });
    return Array.from(map.values()).map(c => ({ ...c, sur: calcSUR(c.attended, c.planned), cp: calcCP(c.closings, c.attended) }));
  }, [filteredForms]);

  const displayStats = isCloser
    ? closerStats.filter(c => c.id === session?.user?.id)
    : closerStats.sort((a, b) => b.revenue - a.revenue);

  const maxCP = Math.max(...displayStats.map(c => c.cp), 1);
  const totalRevenue = displayStats.reduce((s, c) => s + c.revenue, 0);
  const totalClosings = displayStats.reduce((s, c) => s + c.closings, 0);
  const totalPlanned = displayStats.reduce((s, c) => s + c.planned, 0);
  const totalAttended = displayStats.reduce((s, c) => s + c.attended, 0);

  const weekOptions: Array<{ week: number; year: number; label: string }> = [];
  for (let i = 0; i < 26; i++) {
    let w = todayWeek - i, y = todayYear;
    if (w < 1) { w += 52; y--; }
    const b = getWeekBounds(w, y);
    weekOptions.push({ week: w, year: y, label: `Tydz. ${w} (${formatDateShort(b.start)}–${formatDateShort(b.end)}) ${y}` });
  }

  const monthOptions: Array<{ m: number; y: number }> = [];
  for (let i = 0; i < 12; i++) {
    let m = now.getMonth() + 1 - i, y = now.getFullYear();
    if (m < 1) { m += 12; y--; }
    monthOptions.push({ m, y });
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header + period selector */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-white flex-1">Zespół — Closing</h1>
        <div className="flex gap-1 bg-[#0F172A] rounded-xl p-1 border border-[#334155]">
          {(["week", "month", "quarter"] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${period === p ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-white"}`}>
              {p === "week" ? "Tydzień" : p === "month" ? "Miesiąc" : "Kwartał"}
            </button>
          ))}
        </div>
        {period === "week" && (
          <select value={`${selectedWeek}-${selectedYear}`} onChange={e => { const [w, y] = e.target.value.split("-").map(Number); setSelectedWeek(w); setSelectedYear(y); }} className="bg-[#1E293B] border border-[#334155] rounded-xl px-3 py-2 text-white text-sm">
            {weekOptions.map(o => <option key={`${o.week}-${o.year}`} value={`${o.week}-${o.year}`}>{o.label}</option>)}
          </select>
        )}
        {period === "month" && (
          <select value={`${selectedMonth}-${selectedYear}`} onChange={e => { const [m, y] = e.target.value.split("-").map(Number); setSelectedMonth(m); setSelectedYear(y); }} className="bg-[#1E293B] border border-[#334155] rounded-xl px-3 py-2 text-white text-sm">
            {monthOptions.map(o => <option key={`${o.m}-${o.y}`} value={`${o.m}-${o.y}`}>{getMonthName(o.m)} {o.y}</option>)}
          </select>
        )}
        {period === "quarter" && (
          <select value={`${selectedQuarter}-${selectedYear}`} onChange={e => { const [q, y] = e.target.value.split("-").map(Number); setSelectedQuarter(q); setSelectedYear(y); }} className="bg-[#1E293B] border border-[#334155] rounded-xl px-3 py-2 text-white text-sm">
            {[1, 2, 3, 4].map(q => <option key={q} value={`${q}-${selectedYear}`}>Q{q} {selectedYear}</option>)}
          </select>
        )}
      </div>

      {/* TODAY's planned meetings */}
      {!isCloser && (
        <div className="bg-[#1E293B] border border-amber-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <h2 className="text-sm font-semibold text-amber-400">Dzisiaj — Spotkania zaplanowane</h2>
          </div>
          {todayForms.length === 0 ? (
            <p className="text-slate-400 text-sm">Brak danych za dzisiaj. Dodaj przez "Wprowadź dane".</p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {todayForms.map(f => (
                <div key={f.userId} className="bg-[#0F172A] rounded-xl px-4 py-2">
                  <div className="text-xs text-slate-400">{f.user.name}</div>
                  <div className="text-xl font-bold text-white">{f.plannedMeetings ?? 0}</div>
                  <div className="text-xs text-slate-500">zapl. spotkań</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-center text-slate-400 py-12">Ładowanie...</div>
      ) : displayStats.length === 0 ? (
        <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-12 text-center">
          <div className="text-slate-400">Brak danych za wybrany okres</div>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          {!isCloser && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryCard label="Przychód łącznie" value={formatPLN(totalRevenue)} color="#818CF8" />
              <SummaryCard label="Zamknięcia" value={String(totalClosings)} color="#34D399" />
              <SummaryCard label="SUR zespołu" value={formatPercent(calcSUR(totalAttended, totalPlanned))} color={getStatusColor(getKpiStatus(calcSUR(totalAttended, totalPlanned), 90))} />
              <SummaryCard label="CP zespołu" value={formatPercent(calcCP(totalClosings, totalAttended))} color={getStatusColor(getKpiStatus(calcCP(totalClosings, totalAttended), 60))} />
            </div>
          )}

          {/* Scorecard table */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#334155]">
              <h2 className="font-bold text-white">Scorecard closerów</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full kpi-table">
                <thead>
                  <tr>
                    <th>Closer</th>
                    <th>Zapl.</th>
                    <th>Odbyłe</th>
                    <th>SUR</th>
                    <th>Zamknięcia</th>
                    <th>CP</th>
                    <th>Przychód</th>
                  </tr>
                </thead>
                <tbody>
                  {displayStats.map(c => (
                    <tr key={c.id} className="cursor-pointer" onClick={() => setSelectedCloser(selectedCloser === c.id ? null : c.id)}>
                      <td className="text-white font-medium">{c.name}</td>
                      <td className="text-slate-300">{c.planned}</td>
                      <td className="text-slate-300">{c.attended}</td>
                      <td style={{ color: getStatusColor(getKpiStatus(c.sur, 90)) }}>{formatPercent(c.sur)}</td>
                      <td className="text-slate-300">{c.closings}</td>
                      <td style={{ color: getStatusColor(getKpiStatus(c.cp, 60)) }}>{formatPercent(c.cp)}</td>
                      <td className="text-slate-300">{formatPLN(c.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* CP Ranking */}
          {!isCloser && displayStats.length > 1 && (
            <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-6">
              <h2 className="font-bold text-white mb-4">Ranking — Closing %</h2>
              <div className="space-y-3">
                {[...displayStats].sort((a, b) => b.cp - a.cp).map((c, i) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="text-slate-400 text-sm w-5">{i + 1}.</span>
                    <span className="text-slate-200 text-sm w-32 truncate">{c.name}</span>
                    <div className="flex-1 h-2 bg-[#334155] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${maxCP > 0 ? (c.cp / maxCP) * 100 : 0}%`, backgroundColor: getStatusColor(getKpiStatus(c.cp, 60)) }} />
                    </div>
                    <span className="text-sm font-bold w-16 text-right" style={{ color: getStatusColor(getKpiStatus(c.cp, 60)) }}>{formatPercent(c.cp)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Revenue Ranking */}
          {!isCloser && displayStats.length > 1 && (
            <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-6">
              <h2 className="font-bold text-white mb-4">Ranking — Przychód</h2>
              <div className="space-y-3">
                {[...displayStats].sort((a, b) => b.revenue - a.revenue).map((c, i) => {
                  const maxRev = Math.max(...displayStats.map(x => x.revenue), 1);
                  return (
                    <div key={c.id} className="flex items-center gap-3">
                      <span className="text-slate-400 text-sm w-5">{i + 1}.</span>
                      <span className="text-slate-200 text-sm w-32 truncate">{c.name}</span>
                      <div className="flex-1 h-2 bg-[#334155] rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(c.revenue / maxRev) * 100}%` }} />
                      </div>
                      <span className="text-sm font-bold w-24 text-right text-indigo-300">{formatPLN(c.revenue)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected closer detail */}
          {selectedCloser && !isCloser && (() => {
            const closer = displayStats.find(c => c.id === selectedCloser);
            if (!closer) return null;
            const forms = filteredForms.filter(f => f.userId === selectedCloser);
            return (
              <div className="bg-[#1E293B] border border-indigo-500/30 rounded-2xl p-6">
                <h2 className="font-bold text-white mb-4">Szczegóły: {closer.name}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <Stat label="SUR" value={formatPercent(closer.sur)} color={getStatusColor(getKpiStatus(closer.sur, 90))} />
                  <Stat label="CP" value={formatPercent(closer.cp)} color={getStatusColor(getKpiStatus(closer.cp, 60))} />
                  <Stat label="Zamknięcia" value={String(closer.closings)} />
                  <Stat label="Przychód" value={formatPLN(closer.revenue)} />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full kpi-table text-xs">
                    <thead><tr><th>Data</th><th>Zapl.</th><th>Odbyłe</th><th>SUR</th><th>Zamknięcia</th><th>CP</th><th>Przychód</th></tr></thead>
                    <tbody>
                      {forms.map(f => {
                        const sur = calcSUR(f.attendedMeetings ?? 0, f.plannedMeetings ?? 0);
                        const cp = calcCP(f.closings ?? 0, f.attendedMeetings ?? 0);
                        return (
                          <tr key={f.id}>
                            <td className="text-slate-300">{new Date(f.date).toLocaleDateString("pl-PL")}</td>
                            <td className="text-slate-300">{f.plannedMeetings ?? 0}</td>
                            <td className="text-slate-300">{f.attendedMeetings ?? 0}</td>
                            <td style={{ color: getStatusColor(getKpiStatus(sur, 90)) }}>{formatPercent(sur)}</td>
                            <td className="text-slate-300">{f.closings ?? 0}</td>
                            <td style={{ color: getStatusColor(getKpiStatus(cp, 60)) }}>{formatPercent(cp)}</td>
                            <td className="text-slate-300">{formatPLN(f.revenue ?? 0)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-4">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-[#0F172A] rounded-xl p-3">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="text-xl font-bold" style={{ color: color || "#F1F5F9" }}>{value}</div>
    </div>
  );
}
