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

interface DailyForm {
  id: string;
  userId: string;
  date: string;
  callsMade: number | null;
  meetingsBooked: number | null;
  user: { id: string; name: string; role: string };
}

interface SetterStats {
  id: string;
  name: string;
  calls: number;
  booked: number;
  bookingRate: number;
}

type Period = "week" | "month" | "quarter";

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
  const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil((now.getMonth() + 1) / 3));
  const [selectedYear, setSelectedYear] = useState(todayYear);
  const [dailyForms, setDailyForms] = useState<DailyForm[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(() => {
    if (!selectedClientId) return;
    setLoading(true);
    fetch(`/api/daily?clientId=${selectedClientId}`)
      .then((r) => r.json())
      .then((data: DailyForm[]) => {
        const filtered = (Array.isArray(data) ? data : []).filter(
          (f) => f.user.role === "SETTER"
        );
        setDailyForms(filtered);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedClientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  const setterMap = new Map<string, SetterStats>();
  filteredForms.forEach((f) => {
    const existing = setterMap.get(f.userId) || { id: f.userId, name: f.user.name, calls: 0, booked: 0, bookingRate: 0 };
    existing.calls += f.callsMade ?? 0;
    existing.booked += f.meetingsBooked ?? 0;
    setterMap.set(f.userId, existing);
  });

  const setterStats: SetterStats[] = Array.from(setterMap.values()).map((s) => ({
    ...s,
    bookingRate: calcBookingRate(s.booked, s.calls),
  })).sort((a, b) => b.bookingRate - a.bookingRate);

  const displayStats = isSetter
    ? setterStats.filter((s) => s.id === session?.user?.id)
    : setterStats;

  const maxBR = Math.max(...displayStats.map((s) => s.bookingRate), 1);

  const weekOptions: Array<{ week: number; year: number; label: string }> = [];
  for (let i = 0; i < 26; i++) {
    let w = todayWeek - i;
    let y = todayYear;
    if (w < 1) { w += 52; y -= 1; }
    const b = getWeekBounds(w, y);
    weekOptions.push({ week: w, year: y, label: `Tydz. ${w} (${formatDateShort(b.start)}–${formatDateShort(b.end)}) ${y}` });
  }

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
        <h1 className="text-2xl font-bold flex-1" style={{ color: "var(--text-primary)" }}>Zespół — Setting</h1>

        <div className="flex gap-1 rounded-xl p-1" style={{ background: "var(--bg-input)", border: "1px solid var(--border-card)" }}>
          {(["week", "month", "quarter"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                period === p ? "" : "hover:text-white"
              }`}
              style={period === p
                ? { background: "var(--neon)", color: "#000" }
                : { color: "var(--text-muted)" }
              }
            >
              {p === "week" ? "Tydzień" : p === "month" ? "Miesiąc" : "Kwartał"}
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
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)", color: "var(--text-primary)" }}
          >
            {weekOptions.map((o) => (
              <option key={`${o.week}-${o.year}`} value={`${o.week}-${o.year}`}>{o.label}</option>
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
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)", color: "var(--text-primary)" }}
          >
            {monthOptions.map((o) => (
              <option key={`${o.m}-${o.y}`} value={`${o.m}-${o.y}`}>{getMonthName(o.m)} {o.y}</option>
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
            className="rounded-xl px-3 py-2 text-sm"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)", color: "var(--text-primary)" }}
          >
            {[1, 2, 3, 4].map((q) => (
              <option key={q} value={`${q}-${selectedYear}`}>Q{q} {selectedYear}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>Ładowanie...</div>
      ) : displayStats.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
          <div style={{ color: "var(--text-muted)" }}>Brak danych za wybrany okres</div>
        </div>
      ) : (
        <>
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
            <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border-card)" }}>
              <h2 className="font-bold" style={{ color: "var(--text-primary)" }}>Wyniki setterów</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full kpi-table">
                <thead>
                  <tr>
                    <th>Setter</th>
                    <th>Telefony</th>
                    <th>Umówione</th>
                    <th>Booking Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {displayStats.map((s) => (
                    <tr key={s.id}>
                      <td className="font-medium" style={{ color: "var(--text-primary)" }}>{s.name}</td>
                      <td style={{ color: "var(--text-secondary)" }}>{s.calls}</td>
                      <td style={{ color: "var(--text-secondary)" }}>{s.booked}</td>
                      <td style={{ color: getStatusColor(getKpiStatus(s.bookingRate, 20)) }}>
                        {formatPercent(s.bookingRate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {!isSetter && displayStats.length > 1 && (
            <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
              <h2 className="font-bold mb-4" style={{ color: "var(--text-primary)" }}>Ranking — Booking Rate</h2>
              <div className="space-y-3">
                {displayStats.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <span className="text-sm w-5" style={{ color: "var(--text-muted)" }}>{i + 1}.</span>
                    <span className="text-sm w-32 truncate" style={{ color: "var(--text-secondary)" }}>{s.name}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--border-card)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${maxBR > 0 ? (s.bookingRate / maxBR) * 100 : 0}%`,
                          backgroundColor: getStatusColor(getKpiStatus(s.bookingRate, 20)),
                        }}
                      />
                    </div>
                    <span
                      className="text-sm font-bold w-16 text-right"
                      style={{ color: getStatusColor(getKpiStatus(s.bookingRate, 20)) }}
                    >
                      {formatPercent(s.bookingRate)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
