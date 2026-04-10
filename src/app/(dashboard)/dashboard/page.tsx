"use client";

import { useState, useEffect } from "react";
import { useClient } from "../layout";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  getKpiStatus,
  getStatusColor,
  calcSUR,
  calcCP,
  getISOWeek,
  getWeekBounds,
  isOnTrack,
} from "@/lib/calculations";
import {
  formatPLN,
  formatPercent,
  formatDate,
  formatDateShort,
  getMonthName,
} from "@/lib/utils";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface WeeklyForm {
  id: string;
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
}

interface KpiTarget {
  code: string;
  target: number;
  period: string;
}

interface Bottleneck {
  id: string;
  kpiCode: string;
  title: string;
  description: string;
  status: string;
}

export default function DashboardPage() {
  const { selectedClientId } = useClient();
  const { data: session } = useSession();
  const [weeklyForms, setWeeklyForms] = useState<WeeklyForm[]>([]);
  const [targets, setTargets] = useState<KpiTarget[]>([]);
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const { week: currentWeek, year: currentYear } = getISOWeek(today);
  const currentMonth = today.getMonth() + 1;
  const currentQuarter = Math.ceil(currentMonth / 3);

  useEffect(() => {
    if (!selectedClientId) return;
    setLoading(true);

    Promise.all([
      fetch(`/api/weekly?clientId=${selectedClientId}`).then((r) => r.json()),
      fetch(`/api/kpi-targets?clientId=${selectedClientId}`).then((r) => r.json()),
      fetch(`/api/bottlenecks?clientId=${selectedClientId}&status=ACTIVE`).then((r) => r.json()),
    ])
      .then(([wf, kt, bn]) => {
        setWeeklyForms(wf);
        setTargets(kt);
        setBottlenecks(bn);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedClientId]);

  const getTarget = (code: string, period: string) =>
    targets.find((t) => t.code === code && t.period === period)?.target ?? 0;

  // Current week data
  const currentWeekForm = weeklyForms.find(
    (wf) => wf.weekNumber === currentWeek && wf.year === currentYear
  );

  // Weekly totals
  const weekRevenue = currentWeekForm?.totalRevenue ?? 0;
  const weekTarget = getTarget("REVENUE", "WEEKLY");
  const weekSUR = calcSUR(
    currentWeekForm?.totalAttended ?? 0,
    currentWeekForm?.totalPlannedMeetings ?? 0
  );
  const weekCP = calcCP(
    currentWeekForm?.totalClosings ?? 0,
    currentWeekForm?.totalAttended ?? 0
  );

  // Monthly totals (sum of weeks in current month)
  const monthlyWeeks = weeklyForms.filter((wf) => {
    const d = new Date(wf.weekStart);
    return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
  });
  const monthRevenue = monthlyWeeks.reduce((s, wf) => s + wf.totalRevenue, 0);
  const monthlyWeekTarget = getTarget("REVENUE", "WEEKLY");
  const monthTarget = monthlyWeekTarget * 4;

  // Quarterly totals
  const quarterMonths = [
    (currentQuarter - 1) * 3 + 1,
    (currentQuarter - 1) * 3 + 2,
    currentQuarter * 3,
  ];
  const quarterWeeks = weeklyForms.filter((wf) => {
    const d = new Date(wf.weekStart);
    return quarterMonths.includes(d.getMonth() + 1) && d.getFullYear() === currentYear;
  });
  const quarterRevenue = quarterWeeks.reduce((s, wf) => s + wf.totalRevenue, 0);
  const quarterTarget = monthlyWeekTarget * 13;

  const weekBounds = getWeekBounds(currentWeek, currentYear);
  const onTrack = isOnTrack(weekRevenue, weekTarget, weekBounds.start, today);

  const weekPct = weekTarget > 0 ? Math.round((weekRevenue / weekTarget) * 100) : 0;
  const monthPct = monthTarget > 0 ? Math.round((monthRevenue / monthTarget) * 100) : 0;
  const quarterPct = quarterTarget > 0 ? Math.round((quarterRevenue / quarterTarget) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Ładowanie danych...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard Główny</h1>
        <p className="text-slate-400 text-sm mt-1">{formatDate(today)}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Daily Card */}
        <SummaryCard
          title={`Dziś — ${formatDate(today)}`}
          pct={weekPct}
          status={onTrack ? "on_track" : "behind"}
          details={[
            {
              label: "Spotkania",
              value: `${currentWeekForm?.totalAttended ?? 0}/${currentWeekForm?.totalPlannedMeetings ?? 0}`,
            },
            { label: "Zamknięcia", value: String(currentWeekForm?.totalClosings ?? 0) },
            { label: "Przychód", value: formatPLN(weekRevenue) },
          ]}
          link="/dzienny"
        />

        {/* Weekly Card */}
        <SummaryCard
          title={`Tydzień ${currentWeek} — ${formatDateShort(weekBounds.start)}–${formatDateShort(weekBounds.end)}`}
          pct={weekPct}
          status={onTrack ? "on_track" : "behind"}
          details={[
            { label: "SUR", value: formatPercent(weekSUR) },
            { label: "CP", value: formatPercent(weekCP) },
            { label: "Przychód", value: `${formatPLN(weekRevenue)} / ${formatPLN(weekTarget)}` },
          ]}
          link="/tygodniowy"
        />

        {/* Monthly Card */}
        <SummaryCard
          title={`${getMonthName(currentMonth)} ${currentYear}`}
          pct={monthPct}
          status={monthPct >= 80 ? "on_track" : "behind"}
          details={[{ label: "Przychód", value: `${formatPLN(monthRevenue)} / ${formatPLN(monthTarget)}` }]}
          link="/miesięczny"
          showProgress
        />

        {/* Quarterly Card */}
        <SummaryCard
          title={`Q${currentQuarter} ${currentYear}`}
          pct={quarterPct}
          status={quarterPct >= 60 ? "on_track" : "behind"}
          details={[
            { label: "Przychód kwartalny", value: formatPLN(quarterRevenue) },
            { label: "Cel", value: formatPLN(quarterTarget) },
          ]}
          link="/kwartalny"
          showProgress
        />
      </div>

      {/* Active Bottlenecks */}
      {bottlenecks.length > 0 && (
        <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              🚨 Aktywne bottlenecki
            </h2>
            <Link
              href="/bottlenecki"
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Zobacz wszystkie →
            </Link>
          </div>
          <div className="space-y-3">
            {bottlenecks.slice(0, 3).map((b) => (
              <div
                key={b.id}
                className="flex items-start gap-3 bg-red-500/5 border border-red-500/20 rounded-xl p-4"
              >
                <span className="text-red-400 text-lg">🔴</span>
                <div>
                  <div className="text-white font-medium text-sm">{b.title}</div>
                  <div className="text-slate-400 text-xs mt-0.5 line-clamp-2">{b.description}</div>
                </div>
                <Link
                  href="/bottlenecki"
                  className="ml-auto text-slate-400 hover:text-white text-xs whitespace-nowrap"
                >
                  Szczegóły →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickStat label="Leady (tydzień)" value={String(currentWeekForm?.totalLeads ?? 0)} />
        <QuickStat
          label="Show Up Rate"
          value={formatPercent(weekSUR)}
          color={getStatusColor(getKpiStatus(weekSUR, getTarget("SUR", "WEEKLY")))}
        />
        <QuickStat
          label="Closing %"
          value={formatPercent(weekCP)}
          color={getStatusColor(getKpiStatus(weekCP, getTarget("CP", "WEEKLY")))}
        />
        <QuickStat label="Zamknięcia (tydzień)" value={String(currentWeekForm?.totalClosings ?? 0)} />
      </div>
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  pct: number;
  status: "on_track" | "behind" | "god";
  details: Array<{ label: string; value: string }>;
  link: string;
  showProgress?: boolean;
}

function SummaryCard({ title, pct, status, details, link, showProgress }: SummaryCardProps) {
  const isOnTrack = status === "on_track" || status === "god";
  const color = pct >= 150 ? "#EAB308" : pct >= 100 ? "#22C55E" : pct >= 50 ? "#F97316" : "#EF4444";

  return (
    <Link href={link}>
      <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-5 hover:border-indigo-500/40 transition-all cursor-pointer h-full">
        <div className="text-slate-400 text-xs font-medium mb-2 truncate">{title}</div>

        <div className="text-4xl font-black mb-3" style={{ color }}>
          {pct}%
        </div>

        {showProgress && (
          <div className="mb-3">
            <div className="h-2 bg-[#334155] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          {details.map((d) => (
            <div key={d.label} className="flex justify-between text-xs">
              <span className="text-slate-400">{d.label}:</span>
              <span className="text-slate-200 font-medium">{d.value}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 pt-3 border-t border-[#334155]">
          <span
            className={`text-xs font-semibold ${isOnTrack ? "text-green-400" : "text-orange-400"}`}
          >
            {isOnTrack ? "Na torze ✅" : "Poniżej planu ⚠️"}
          </span>
        </div>
      </div>
    </Link>
  );
}

function QuickStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4">
      <div className="text-slate-400 text-xs mb-1">{label}</div>
      <div
        className="text-xl font-bold"
        style={{ color: color || "#F1F5F9" }}
      >
        {value}
      </div>
    </div>
  );
}
