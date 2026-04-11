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
  if (p >= 150) return "var(--gold)";
  if (p >= 100) return "var(--neon)";
  if (p >= 50) return "var(--orange)";
  return "var(--red)";
}

function kpiColor(val: number, target: number, lowerBetter = false) {
  if (!target || !val) return "var(--text-muted)";
  const r = lowerBetter ? target / val : val / target;
  if (r >= 1.5) return "var(--gold)";
  if (r >= 1) return "var(--neon)";
  if (r >= 0.5) return "var(--orange)";
  return "var(--red)";
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
  const greeting = hour < 18 ? "Dzień dobry" : "Dobry wieczór";
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

  const recentWeeks = weeklyForms.slice(0, 8).reverse();

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-pulse text-sm" style={{ color: "var(--text-muted)" }}>Ładowanie...</div>
    </div>
  );

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
            {today.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            {greeting}, <span style={{ color: "var(--neon)" }}>{session?.user?.name?.split(" ")[0]}</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Bieżący status KPI — {selectedClientName}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dane" className="text-sm font-medium px-4 py-2 rounded-lg transition-all"
            style={{ background: "var(--neon-dim)", border: "1px solid var(--neon-border)", color: "var(--neon)" }}>
            + Wprowadź dane
          </Link>
          <Link href="/bottlenecki" className="text-sm font-medium px-4 py-2 rounded-lg transition-all"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-card)", color: "var(--text-secondary)" }}>
            Bottlenecki{bottlenecks.length > 0 && (
              <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--red-dim)", color: "var(--red)" }}>
                {bottlenecks.length}
              </span>
            )}
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
          sub={surTarget > 0 ? `cel: ${surTarget}%` : "brak celu"}
          pct={surTarget > 0 ? pct(sur, surTarget) : 0}
          href="/tygodniowy"
          colorOverride={sur > 0 ? kpiColor(sur, surTarget) : undefined}
        />
        <KpiCard
          label="Closing %"
          value={formatPercent(cp)}
          sub={cpTarget > 0 ? `cel: ${cpTarget}%` : "brak celu"}
          pct={cpTarget > 0 ? pct(cp, cpTarget) : 0}
          href="/tygodniowy"
          colorOverride={cp > 0 ? kpiColor(cp, cpTarget) : undefined}
        />
      </div>

      {/* Secondary metrics + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weekly stats */}
        <div className="rounded-2xl p-5 space-y-3"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Ten tydzień</span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{formatDateShort(weekBounds.start)} – {formatDateShort(weekBounds.end)}</span>
          </div>
          {[
            { label: "Zamknięcia", value: weekForm?.totalClosings ?? 0 },
            { label: "Spotkania zaplanowane", value: weekForm?.totalPlannedMeetings ?? 0 },
            { label: "Spotkania odbyte", value: weekForm?.totalAttended ?? 0 },
            { label: "Leady", value: weekForm?.totalLeads ?? 0 },
            { label: "Telefony (setting)", value: weekForm?.totalCallsMade ?? 0 },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{item.label}</span>
              <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* Revenue trend chart */}
        <div className="lg:col-span-2 rounded-2xl p-5"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Przychód — ostatnie tygodnie</span>
            <Link href="/tygodniowy" className="text-xs" style={{ color: "var(--neon)" }}>Szczegóły →</Link>
          </div>
          <MiniBarChart data={recentWeeks.map(w => ({ label: `T${w.weekNumber}`, value: w.totalRevenue }))} target={weekTarget} />
        </div>
      </div>

      {/* Quarterly overview + Bottlenecks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Q overview */}
        <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
            Q{currentQuarter} {currentYear}
          </div>
          <div className="text-3xl font-black mb-1" style={{ color: "var(--text-primary)" }}>{formatPLN(quarterRevenue)}</div>
          <div className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>cel: {formatPLN(quarterTarget)}</div>
          <div className="h-2 rounded-full overflow-hidden mb-1" style={{ background: "var(--bg-elevated)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(quarterPct, 100)}%`, background: statusColor(quarterPct) }}
            />
          </div>
          <div className="text-xs" style={{ color: statusColor(quarterPct) }}>{quarterPct}% celu</div>
        </div>

        {/* Active Bottlenecks */}
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              Aktywne bottlenecki
              {bottlenecks.length > 0 && (
                <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--red-dim)", color: "var(--red)" }}>
                  {bottlenecks.length}
                </span>
              )}
            </span>
            <Link href="/bottlenecki" className="text-xs" style={{ color: "var(--neon)" }}>Zarządzaj →</Link>
          </div>
          {bottlenecks.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-2xl mb-1">✅</div>
              <div className="text-sm font-medium" style={{ color: "var(--neon)" }}>Brak aktywnych bottlenecków</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Wszystkie KPI pod kontrolą</div>
            </div>
          ) : (
            <div className="space-y-2">
              {bottlenecks.slice(0, 3).map(b => (
                <Link key={b.id} href="/bottlenecki">
                  <div
                    className="flex items-start gap-3 px-4 py-3 rounded-xl transition-colors"
                    style={{ border: "1px solid rgba(255,68,68,0.18)", background: "var(--red-dim)" }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: "var(--red)", boxShadow: "0 0 4px var(--red)" }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold mb-0.5" style={{ color: "var(--red)" }}>{b.kpiCode}</div>
                      <div className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{b.title}</div>
                    </div>
                  </div>
                </Link>
              ))}
              {bottlenecks.length > 3 && (
                <div className="text-xs text-center pt-1" style={{ color: "var(--text-muted)" }}>
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
      <div
        className="rounded-2xl p-5 cursor-pointer transition-all hover:scale-[1.01]"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
      >
        <div className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>{label}</div>
        <div className="text-2xl font-black mb-1" style={{ color }}>{value}</div>
        <div className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>{sub}</div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
          <div className="h-full rounded-full" style={{ width: `${Math.min(p, 100)}%`, background: color, boxShadow: `0 0 6px ${color}55` }} />
        </div>
        <div className="text-xs mt-1.5 font-semibold" style={{ color }}>{p}%</div>
      </div>
    </Link>
  );
}

function MiniBarChart({ data, target }: { data: { label: string; value: number }[]; target: number }) {
  if (data.length === 0) return (
    <div className="flex items-center justify-center h-32 text-xs" style={{ color: "var(--text-muted)" }}>Brak danych</div>
  );
  const max = Math.max(...data.map(d => d.value), target || 0, 1);
  return (
    <div className="flex items-end gap-1.5 h-32">
      {data.map((d, i) => {
        const h = (d.value / max) * 100;
        const color = target > 0
          ? (d.value >= target ? "var(--neon)" : d.value >= target * 0.5 ? "var(--orange)" : "var(--red)")
          : "var(--neon)";
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full rounded-t-sm relative flex-1 flex items-end" style={{ minHeight: "4px" }}>
              <div
                className="w-full rounded-t-sm transition-all"
                style={{ height: `${Math.max(h, 2)}%`, background: color, opacity: 0.85 }}
              />
            </div>
            <span className="text-xs truncate w-full text-center" style={{ color: "var(--text-muted)", fontSize: "9px" }}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
