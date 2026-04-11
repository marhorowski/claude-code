"use client";

import { useState, useEffect } from "react";
import { useClient } from "../layout";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  calcSUR,
  calcCP,
  getISOWeek,
  getWeekBounds,
} from "@/lib/calculations";
import { formatPLN, formatPercent, formatDateShort, getMonthName } from "@/lib/utils";

interface WeeklyForm {
  id: string; weekNumber: number; year: number;
  weekStart: string; weekEnd: string;
  totalLeads: number; totalCallsMade: number; totalMeetingsBooked: number;
  totalPlannedMeetings: number; totalAttended: number;
  totalClosings: number; totalRevenue: number;
  adSpend: number | null; cpl: number | null;
}

interface KpiTarget { code: string; target: number; period: string }
interface Bottleneck { id: string; kpiCode: string; title: string; description: string; status: string }

function pct(val: number, target: number) {
  if (!target) return 0;
  return Math.round((val / target) * 100);
}

function statusColor(p: number) {
  if (p >= 150) return "#eab308";
  if (p >= 100) return "#00ff88";
  if (p >= 50) return "#f97316";
  return "#ff4444";
}

function kpiColor(val: number, target: number, lowerBetter = false) {
  if (!target || !val) return "#555";
  const r = lowerBetter ? target / val : val / target;
  if (r >= 1.5) return "#eab308";
  if (r >= 1) return "#00ff88";
  if (r >= 0.5) return "#f97316";
  return "#ff4444";
}

export default function DashboardPage() {
  const { selectedClientId, selectedClientName } = useClient();
  const { data: session } = useSession();
  const [weeklyForms, setWeeklyForms] = useState<WeeklyForm[]>([]);
  const [targets, setTargets] = useState<KpiTarget[]>([]);
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const hour = today.getHours();
  const greeting = hour < 12 ? "Dzień dobry" : hour < 18 ? "Dzień dobry" : "Dobry wieczór";
  const { week: currentWeek, year: currentYear } = getISOWeek(today);
  const currentMonth = today.getMonth() + 1;
  const currentQuarter = Math.ceil(currentMonth / 3);

  useEffect(() => {
    if (!selectedClientId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/weekly?clientId=${selectedClientId}`).then(r => r.json()),
      fetch(`/api/kpi-targets?clientId=${selectedClientId}`).then(r => r.json()),
      fetch(`/api/bottlenecks?clientId=${selectedClientId}&status=ACTIVE`).then(r => r.json()),
    ])
      .then(([wf, kt, bn]) => { setWeeklyForms(wf); setTargets(kt); setBottlenecks(bn); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedClientId]);

  const getTarget = (code: string, period: string) =>
    targets.find(t => t.code === code && t.period === period)?.target ?? 0;

  const weekForm = weeklyForms.find(w => w.weekNumber === currentWeek && w.year === currentYear);
  const weekBounds = getWeekBounds(currentWeek, currentYear);

  const weekRevenue = weekForm?.totalRevenue ?? 0;
  const weekTarget = getTarget("REVENUE", "WEEKLY");
  const weekPct = pct(weekRevenue, weekTarget);
  const sur = calcSUR(weekForm?.totalAttended ?? 0, weekForm?.totalPlannedMeetings ?? 0);
  const cp = calcCP(weekForm?.totalClosings ?? 0, weekForm?.totalAttended ?? 0);
  const surTarget = getTarget("SUR", "WEEKLY");
  const cpTarget = getTarget("CP", "WEEKLY");

  const monthlyWeeks = weeklyForms.filter(w => {
    const d = new Date(w.weekStart);
    return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
  });
  const monthRevenue = monthlyWeeks.reduce((s, w) => s + w.totalRevenue, 0);
  const monthTarget = weekTarget * 4;
  const monthPct = pct(monthRevenue, monthTarget);

  const quarterMonths = [(currentQuarter - 1) * 3 + 1, (currentQuarter - 1) * 3 + 2, currentQuarter * 3];
  const quarterWeeks = weeklyForms.filter(w => {
    const d = new Date(w.weekStart);
    return quarterMonths.includes(d.getMonth() + 1) && d.getFullYear() === currentYear;
  });
  const quarterRevenue = quarterWeeks.reduce((s, w) => s + w.totalRevenue, 0);
  const quarterTarget = weekTarget * 13;
  const quarterPct = pct(quarterRevenue, quarterTarget);

  // Recent weeks for mini chart
  const recentWeeks = weeklyForms.slice(0, 8).reverse();

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-pulse text-sm" style={{ color: "#333" }}>Ładowanie...</div>
    </div>
  );

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm mb-1" style={{ color: "#555" }}>
            {today.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
          <h1 className="text-2xl font-bold text-white">
            {greeting}, <span style={{ color: "#00ff88" }}>{session?.user?.name?.split(" ")[0]}</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: "#444" }}>
            Bieżący status KPI — {selectedClientName}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dane" className="text-sm font-medium px-4 py-2 rounded-lg transition-all"
            style={{ background: "rgba(0,255,136,0.12)", border: "1px solid rgba(0,255,136,0.3)", color: "#00ff88" }}>
            + Wprowadź dane
          </Link>
          <Link href="/bottlenecki" className="text-sm font-medium px-4 py-2 rounded-lg transition-all"
            style={{ background: "#111", border: "1px solid #1a1a1a", color: "#888" }}>
            Bottlenecki {bottlenecks.length > 0 && <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,68,68,0.2)", color: "#ff4444" }}>{bottlenecks.length}</span>}
          </Link>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={`Tydz. ${currentWeek} przychód`}
          value={formatPLN(weekRevenue)}
          sub={weekTarget > 0 ? `cel: ${formatPLN(weekTarget)}` : "brak celu"}
          pct={weekPct}
          href="/tygodniowy"
        />
        <KpiCard
          label={`${getMonthName(currentMonth)} przychód`}
          value={formatPLN(monthRevenue)}
          sub={monthTarget > 0 ? `cel: ${formatPLN(monthTarget)}` : "brak celu"}
          pct={monthPct}
          href="/miesięczny"
        />
        <KpiCard
          label="Show Up Rate"
          value={formatPercent(sur)}
          sub={`cel: ${surTarget}%`}
          pct={surTarget > 0 ? pct(sur, surTarget) : 0}
          href="/tygodniowy"
          colorOverride={sur > 0 ? kpiColor(sur, surTarget) : undefined}
        />
        <KpiCard
          label="Closing %"
          value={formatPercent(cp)}
          sub={`cel: ${cpTarget}%`}
          pct={cpTarget > 0 ? pct(cp, cpTarget) : 0}
          href="/tygodniowy"
          colorOverride={cp > 0 ? kpiColor(cp, cpTarget) : undefined}
        />
      </div>

      {/* Secondary metrics + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weekly stats */}
        <div className="rounded-2xl p-5 space-y-3" style={{ background: "#0f0f0f", border: "1px solid #1a1a1a" }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#555" }}>Ten tydzień</span>
            <span className="text-xs" style={{ color: "#444" }}>{formatDateShort(weekBounds.start)} – {formatDateShort(weekBounds.end)}</span>
          </div>
          {[
            { label: "Zamknięcia", value: weekForm?.totalClosings ?? 0, unit: "" },
            { label: "Spotkania zaplanowane", value: weekForm?.totalPlannedMeetings ?? 0, unit: "" },
            { label: "Spotkania odbyte", value: weekForm?.totalAttended ?? 0, unit: "" },
            { label: "Leady", value: weekForm?.totalLeads ?? 0, unit: "" },
            { label: "Telefony (setting)", value: weekForm?.totalCallsMade ?? 0, unit: "" },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "#555" }}>{item.label}</span>
              <span className="text-sm font-bold text-white">{item.value}{item.unit}</span>
            </div>
          ))}
        </div>

        {/* Revenue trend chart */}
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: "#0f0f0f", border: "1px solid #1a1a1a" }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#555" }}>Przychód — ostatnie tygodnie</span>
            <Link href="/tygodniowy" className="text-xs" style={{ color: "#00ff88" }}>Szczegóły →</Link>
          </div>
          <MiniBarChart data={recentWeeks.map(w => ({ label: `T${w.weekNumber}`, value: w.totalRevenue }))} target={weekTarget} />
        </div>
      </div>

      {/* Quarterly overview + Bottlenecks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Q overview */}
        <div className="rounded-2xl p-5" style={{ background: "#0f0f0f", border: "1px solid #1a1a1a" }}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "#555" }}>
            Q{currentQuarter} {currentYear}
          </div>
          <div className="text-3xl font-black mb-1 text-white">{formatPLN(quarterRevenue)}</div>
          <div className="text-xs mb-4" style={{ color: "#444" }}>cel: {formatPLN(quarterTarget)}</div>
          <div className="h-2 rounded-full overflow-hidden mb-1" style={{ background: "#1a1a1a" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(quarterPct, 100)}%`, background: statusColor(quarterPct) }}
            />
          </div>
          <div className="text-xs" style={{ color: statusColor(quarterPct) }}>{quarterPct}% celu</div>
        </div>

        {/* Active Bottlenecks */}
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: "#0f0f0f", border: "1px solid #1a1a1a" }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#555" }}>
              Aktywne bottlenecki
              {bottlenecks.length > 0 && (
                <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,68,68,0.15)", color: "#ff4444" }}>
                  {bottlenecks.length}
                </span>
              )}
            </span>
            <Link href="/bottlenecki" className="text-xs" style={{ color: "#00ff88" }}>Zarządzaj →</Link>
          </div>
          {bottlenecks.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-2xl mb-1">✅</div>
              <div className="text-sm font-medium" style={{ color: "#00ff88" }}>Brak aktywnych bottlenecków</div>
              <div className="text-xs mt-1" style={{ color: "#333" }}>Wszystkie KPI pod kontrolą</div>
            </div>
          ) : (
            <div className="space-y-2">
              {bottlenecks.slice(0, 3).map(b => (
                <Link key={b.id} href="/bottlenecki">
                  <div className="flex items-start gap-3 px-4 py-3 rounded-xl transition-colors hover:bg-[#111]" style={{ border: "1px solid rgba(255,68,68,0.15)" }}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: "#ff4444", boxShadow: "0 0 4px #ff4444" }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold mb-0.5" style={{ color: "#ff4444" }}>{b.kpiCode}</div>
                      <div className="text-sm font-medium text-white truncate">{b.title}</div>
                    </div>
                  </div>
                </Link>
              ))}
              {bottlenecks.length > 3 && (
                <div className="text-xs text-center pt-1" style={{ color: "#444" }}>
                  +{bottlenecks.length - 3} więcej
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, pct: p, href, colorOverride }: {
  label: string; value: string; sub: string; pct: number; href: string; colorOverride?: string;
}) {
  const color = colorOverride ?? statusColor(p);
  return (
    <Link href={href}>
      <div className="rounded-2xl p-5 cursor-pointer transition-all hover:scale-[1.01]" style={{ background: "#0f0f0f", border: "1px solid #1a1a1a" }}>
        <div className="text-xs mb-3" style={{ color: "#555" }}>{label}</div>
        <div className="text-2xl font-black mb-1" style={{ color }}>{value}</div>
        <div className="text-xs mb-3" style={{ color: "#444" }}>{sub}</div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1a1a1a" }}>
          <div className="h-full rounded-full" style={{ width: `${Math.min(p, 100)}%`, background: color, boxShadow: `0 0 6px ${color}55` }} />
        </div>
        <div className="text-xs mt-1.5 font-semibold" style={{ color }}>{p}%</div>
      </div>
    </Link>
  );
}

function MiniBarChart({ data, target }: { data: { label: string; value: number }[]; target: number }) {
  if (data.length === 0) return (
    <div className="flex items-center justify-center h-32 text-xs" style={{ color: "#333" }}>Brak danych</div>
  );
  const max = Math.max(...data.map(d => d.value), target || 0, 1);
  return (
    <div className="flex items-end gap-1.5 h-32">
      {data.map((d, i) => {
        const h = (d.value / max) * 100;
        const color = target > 0 ? (d.value >= target ? "#00ff88" : d.value >= target * 0.5 ? "#f97316" : "#ff4444") : "#00ff88";
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full rounded-t-sm relative flex-1 flex items-end" style={{ minHeight: "4px" }}>
              <div
                className="w-full rounded-t-sm transition-all"
                style={{ height: `${Math.max(h, 2)}%`, background: color, opacity: 0.8 }}
              />
            </div>
            <span className="text-xs truncate w-full text-center" style={{ color: "#444", fontSize: "9px" }}>{d.label}</span>
          </div>
        );
      })}
      {target > 0 && (
        <div className="absolute pointer-events-none" style={{ borderTop: "1px dashed rgba(0,255,136,0.2)", width: "100%" }} />
      )}
    </div>
  );
}
