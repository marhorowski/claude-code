"use client";

import { useState, useEffect, useCallback } from "react";
import { useClient } from "../layout";
import { useSession } from "next-auth/react";
import {
  calcSUR,
  calcCP,
  getKpiStatus,
  getStatusColor,
  getISOWeek,
  getWeekBounds,
} from "@/lib/calculations";
import { formatPLN, formatPercent, formatDateShort, getMonthName } from "@/lib/utils";

interface DailyForm {
  id: string;
  userId: string;
  date: string;
  plannedMeetings: number | null;
  attendedMeetings: number | null;
  closings: number | null;
  revenue: number | null;
  user: { id: string; name: string; role: string };
}

interface CloserStats {
  id: string;
  name: string;
  planned: number;
  attended: number;
  closings: number;
  revenue: number;
  sur: number;
  cp: number;
}

type Period = "week" | "month" | "quarter";

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
      .then((r) => r.json())
      .then((data: DailyForm[]) => {
        const filtered = (Array.isArray(data) ? data : []).filter(
          (f) => f.user.role === "CLOSER" || f.user.role === "LIDER" || f.user.role === "ADMIN"
        );
        setDailyForms(filtered);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedClientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter by period
  const filteredForms = dailyForms.filter((f) => {
    const d = new Date(f.date);
    if (period === "week") {
      const { start, end } = getWeekBounds(selectedWeek, selectedYear);
      return d >= start && d <= end;
    }
    if (period === "month") {
      return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
    }
    if (period === "quarter") {
      const qMonths = [(selectedQuarter - 1) * 3 + 1, (selectedQuarter - 1) * 3 + 2, selectedQuarter * 3];
      return qMonths.includes(d.getMonth() + 1) && d.getFullYear() === selectedYear;
    }
    return true;
  });

  // Group by closer
  const closerMap = new Map<string, CloserStats>();
  filteredForms.forEach((f) => {
    const existing = closerMap.get(f.userId) || {
      id: f.userId,
      name: f.user.name,
      planned: 0,
      attended: 0,
      closings: 0,
      revenue: 0,
      sur: 0,
      cp: 0,
    };
    existing.planned += f.plannedMeetings ?? 0;
    existing.attended += f.attendedMeetings ?? 0;
    existing.closings += f.closings ?? 0;
    existing.revenue += f.revenue ?? 0;
    closerMap.set(f.userId, existing);
  });

  const closerStats: CloserStats[] = Array.from(closerMap.values()).map((c) => ({
    ...c,
    sur: calcSUR(c.attended, c.planned),
    cp: calcCP(c.closings, c.attended),
  }));

  // If user is CLOSER, show only own data
  const displayStats = isCloser
    ? closerStats.filter((c) => c.id === session?.user?.id)
    : closerStats.sort((a, b) => b.cp - a.cp);

  const maxCP = Math.max(...displayStats.map((c) => c.cp), 1);

  // Week options
  const weekOptions: Array<{ week: number; year: number; label: string }> = [];
  for (let i = 0; i < 26; i++) {
    let w = todayWeek - i;
    let y = todayYear;
    if (w < 1) { w += 52; y -= 1; }
    const b = getWeekBounds(w, y);
    weekOptions.push({ week: w, year: y, label: `Tydz. ${w} (${formatDateShort(b.start)}–${formatDateShort(b.end)}) ${y}` });
  }

  // Month options
  const monthOptions: Array<{ m: number; y: number }> = [];
  for (let i = 0; i < 12; i++) {
    let m = now.getMonth() + 1 - i;
    let y = now.getFullYear();
    if (m < 1) { m += 12; y -= 1; }
    monthOptions.push({ m, y });
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-white flex-1">Zespół — Closing</h1>

        {/* Period selector */}
        <div className="flex gap-1 bg-[#0F172A] rounded-xl p-1 border border-[#334155]">
          {(["week", "month", "quarter"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                period === p
                  ? "bg-indigo-500 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {p === "week" ? "Tydzień" : p === "month" ? "Miesiąc" : "Kwartał"}
            </button>
          ))}
        </div>

        {/* Period navigation */}
        {period === "week" && (
          <select
            value={`${selectedWeek}-${selectedYear}`}
            onChange={(e) => {
              const [w, y] = e.target.value.split("-").map(Number);
              setSelectedWeek(w);
              setSelectedYear(y);
            }}
            className="bg-[#1E293B] border border-[#334155] rounded-xl px-3 py-2 text-white text-sm"
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
            className="bg-[#1E293B] border border-[#334155] rounded-xl px-3 py-2 text-white text-sm"
          >
            {monthOptions.map((o) => (
              <option key={`${o.m}-${o.y}`} value={`${o.m}-${o.y}`}>
                {getMonthName(o.m)} {o.y}
              </option>
            ))}
          </select>
        )}

        {period === "quarter" && (
          <select
            value={`${selectedQuarter}-${selectedYear}`}
            onChange={(e) => {
              const [q, y] = e.target.value.split("-").map(Number);
              setSelectedQuarter(q);
              setSelectedYear(y);
            }}
            className="bg-[#1E293B] border border-[#334155] rounded-xl px-3 py-2 text-white text-sm"
          >
            {[1, 2, 3, 4].map((q) => (
              <option key={q} value={`${q}-${selectedYear}`}>Q{q} {selectedYear}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-12">Ładowanie...</div>
      ) : displayStats.length === 0 ? (
        <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-12 text-center">
          <div className="text-slate-400">Brak danych za wybrany okres</div>
        </div>
      ) : (
        <>
          {/* Closer table */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#334155]">
              <h2 className="font-bold text-white">Wyniki closerów</h2>
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
                  {displayStats.map((c) => (
                    <tr
                      key={c.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedCloser(selectedCloser === c.id ? null : c.id)}
                    >
                      <td className="text-white font-medium">{c.name}</td>
                      <td className="text-slate-300">{c.planned}</td>
                      <td className="text-slate-300">{c.attended}</td>
                      <td style={{ color: getStatusColor(getKpiStatus(c.sur, 90)) }}>
                        {formatPercent(c.sur)}
                      </td>
                      <td className="text-slate-300">{c.closings}</td>
                      <td style={{ color: getStatusColor(getKpiStatus(c.cp, 60)) }}>
                        {formatPercent(c.cp)}
                      </td>
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
              <h2 className="font-bold text-white mb-4">Ranking — Closing Percentage</h2>
              <div className="space-y-3">
                {displayStats.sort((a, b) => b.cp - a.cp).map((c, i) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="text-slate-400 text-sm w-5">{i + 1}.</span>
                    <span className="text-slate-200 text-sm w-32 truncate">{c.name}</span>
                    <div className="flex-1 h-2 bg-[#334155] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${maxCP > 0 ? (c.cp / maxCP) * 100 : 0}%`,
                          backgroundColor: getStatusColor(getKpiStatus(c.cp, 60)),
                        }}
                      />
                    </div>
                    <span
                      className="text-sm font-bold w-16 text-right"
                      style={{ color: getStatusColor(getKpiStatus(c.cp, 60)) }}
                    >
                      {formatPercent(c.cp)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected closer detail */}
          {selectedCloser && !isCloser && (
            <CloserDetail
              closer={displayStats.find((c) => c.id === selectedCloser)!}
              forms={filteredForms.filter((f) => f.userId === selectedCloser)}
            />
          )}
        </>
      )}
    </div>
  );
}

function CloserDetail({ closer, forms }: { closer: CloserStats; forms: DailyForm[] }) {
  const dayData = forms.map((f) => ({
    date: new Date(f.date).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" }),
    revenue: f.revenue ?? 0,
    closings: f.closings ?? 0,
    sur: calcSUR(f.attendedMeetings ?? 0, f.plannedMeetings ?? 0),
  }));

  return (
    <div className="bg-[#1E293B] border border-indigo-500/30 rounded-2xl p-6">
      <h2 className="font-bold text-white mb-4">Szczegóły: {closer.name}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat label="SUR" value={formatPercent(closer.sur)} color={getStatusColor(getKpiStatus(closer.sur, 90))} />
        <Stat label="CP" value={formatPercent(closer.cp)} color={getStatusColor(getKpiStatus(closer.cp, 60))} />
        <Stat label="Zamknięcia" value={String(closer.closings)} />
        <Stat label="Przychód" value={formatPLN(closer.revenue)} />
      </div>
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
