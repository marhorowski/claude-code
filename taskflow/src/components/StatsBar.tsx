"use client";

import { useStore } from "@/lib/store";
import { computeStats } from "@/lib/stats";
import { fmtHM } from "@/lib/dates";

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="card px-4 py-3">
      <div className="text-[11px] uppercase text-stone2-400">
        {label}
      </div>
      <div className="font-display text-2xl text-stone2-100">{value}</div>
      {sub && <div className="text-xs text-stone2-400">{sub}</div>}
    </div>
  );
}

export default function StatsBar() {
  const tasks = useStore((s) => s.tasks);
  const workLog = useStore((s) => s.workLog);
  const st = computeStats(tasks, workLog);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat
        label="Zadania dziś"
        value={`${st.todayDone}/${st.todayTotal}`}
        sub={`zostało: ${st.todayRemaining}`}
      />
      <Stat label="Czas dziś" value={fmtHM(st.todaySec)} />
      <Stat
        label="Zadania w tym tygodniu"
        value={`${st.weekDone}/${st.weekTotal}`}
        sub={`zostało: ${st.weekRemaining}`}
      />
      <Stat label="Czas w tym tygodniu" value={fmtHM(st.weekSec)} />
    </div>
  );
}
