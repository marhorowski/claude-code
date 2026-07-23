"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  computeDayPoints,
  computeGoalProgress,
  lastNDays,
  weeklyTotals,
  monthlyTotals,
  rankFor,
  pointsInputFromState,
} from "@/lib/points";
import { todayStr } from "@/lib/dates";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { Trophy, TrendingUp, Target, Flame, Info } from "lucide-react";

type Range = "day" | "week" | "month";

function Bars({
  data,
  goal,
  unit,
}: {
  data: { label: string; value: number; highlight?: boolean }[];
  goal?: number;
  unit?: string;
}) {
  const max = Math.max(goal ?? 0, ...data.map((d) => Math.abs(d.value)), 1);
  const H = 150;
  // prosta skala: wartości >=0 nad linią zera, ujemne poniżej.
  const minV = Math.min(0, ...data.map((d) => d.value));
  const span = max - minV || 1;
  const y0 = (H * max) / span; // pozycja zera od góry
  const barW = 100 / data.length;

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: Math.max(320, data.length * 26) }}>
        <svg
          viewBox={`0 0 100 ${H + 18}`}
          preserveAspectRatio="none"
          className="w-full"
          style={{ height: H + 18 }}
        >
          {/* linia zera */}
          <line
            x1="0"
            x2="100"
            y1={y0}
            y2={y0}
            stroke="#3a3226"
            strokeWidth="0.3"
          />
          {goal !== undefined && (
            <line
              x1="0"
              x2="100"
              y1={y0 - (H * goal) / span}
              y2={y0 - (H * goal) / span}
              stroke="#f0a83d"
              strokeWidth="0.4"
              strokeDasharray="1.5 1.5"
              opacity="0.7"
            />
          )}
          {data.map((d, i) => {
            const h = (H * Math.abs(d.value)) / span;
            const x = i * barW + barW * 0.18;
            const w = barW * 0.64;
            const y = d.value >= 0 ? y0 - h : y0;
            const color =
              d.value < 0
                ? "#d4663d"
                : d.highlight
                ? "#f0a83d"
                : "#b2883a";
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={Math.max(0.6, h)}
                  rx="0.6"
                  fill={color}
                  opacity={d.highlight ? 1 : 0.85}
                >
                  <title>
                    {d.label}: {d.value}
                    {unit ? " " + unit : ""}
                  </title>
                </rect>
              </g>
            );
          })}
        </svg>
        <div
          className="flex text-[9px] text-stone2-400"
          style={{ minWidth: Math.max(320, data.length * 26) }}
        >
          {data.map((d, i) => (
            <div
              key={i}
              className="text-center"
              style={{ width: `${barW}%` }}
            >
              {d.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PointsView() {
  const state = useStore();
  const [range, setRange] = useState<Range>("day");
  const input = useMemo(() => pointsInputFromState(state), [state]);

  const today = todayStr();
  const todayPts = computeDayPoints(today, input);
  const progress = computeGoalProgress(input);
  const rank = rankFor(todayPts.total, progress.goal);

  const daily = lastNDays(30, input).map((d) => ({
    label: format(parseISO(d.date), "d"),
    value: d.total,
    highlight: d.date === today,
  }));
  const weekly = weeklyTotals(8, input).map((w) => ({
    label: w.label,
    value: w.total,
  }));
  const monthly = monthlyTotals(6, input).map((m) => ({
    label: m.label,
    value: m.total,
  }));

  const chart =
    range === "day" ? daily : range === "week" ? weekly : monthly;
  const goalLine = range === "day" ? progress.goal : undefined;

  const pct = Math.min(100, Math.round((todayPts.total / progress.goal) * 100));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 font-display text-3xl text-stone2-100">
          <Trophy className="h-7 w-7 text-bronze-300" />
          Punkty zwycięstwa
        </h2>
        <p className="mt-1 text-sm text-stone2-400">
          Codzienna dyscyplina w liczbach. Poprzeczka rośnie sama — filozofia
          kaizen.
        </p>
      </div>

      {/* Dziś: wynik vs cel */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="card p-5 md:col-span-2">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[11px] uppercase text-stone2-400">
                Wynik dnia
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  className={`font-display text-5xl ${
                    todayPts.total < 0 ? "text-terra-400" : "text-stone2-100"
                  }`}
                >
                  {todayPts.total}
                </span>
                <span className="text-lg text-stone2-400">
                  / {progress.goal} pkt
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase text-stone2-400">Ranga</div>
              <div className={`font-display text-2xl ${rank.color}`}>
                {rank.name}
              </div>
            </div>
          </div>
          <div className="mt-3 h-2.5 rounded-full bg-ink-700">
            <div
              className={`h-2.5 rounded-full ${rank.bar} transition-all`}
              style={{ width: `${Math.max(0, pct)}%` }}
            />
          </div>
          {todayPts.total >= progress.goal ? (
            <div className="mt-2 text-xs text-jade-400">
              Cel dnia zdobyty. Νίκη — trzymaj tempo.
            </div>
          ) : (
            <div className="mt-2 text-xs text-stone2-400">
              Do celu brakuje {progress.goal - todayPts.total} pkt.
            </div>
          )}
          {todayPts.pendingPenalty < 0 && (
            <div className="mt-1 flex items-center gap-1 text-xs text-terra-400">
              <Info className="h-3.5 w-3.5" />
              Jeśli zakończysz dzień teraz, kary odejmą{" "}
              {todayPts.pendingPenalty} pkt (mało pracy / brak raportu).
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 text-[11px] uppercase text-stone2-400">
            <Target className="h-3.5 w-3.5" /> Kaizen
          </div>
          <div className="mt-1 font-display text-2xl text-bronze-300">
            Poziom {progress.level + 1}
          </div>
          <div className="mt-1 text-sm text-stone2-300">
            Cel: {progress.goal} pkt/dzień
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-stone2-400">
            <Flame className="h-3.5 w-3.5 text-bronze-400" />
            Jeszcze {progress.toNextLevel}{" "}
            {progress.toNextLevel === 1 ? "udany dzień" : "udane dni"} do
            podniesienia poprzeczki.
          </div>
        </div>
      </div>

      {/* Rozbicie punktów dziś */}
      <div className="card p-5">
        <div className="mb-3 text-[11px] uppercase text-stone2-400">
          Skąd dziś punkty
        </div>
        <div className="space-y-1.5">
          {todayPts.breakdown.map((b, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <span className="flex-1 text-stone2-200">{b.label}</span>
              <span className="text-xs text-stone2-400">{b.detail}</span>
              <span
                className={`w-10 text-right font-display text-lg ${
                  b.points < 0 ? "text-terra-400" : "text-bronze-300"
                }`}
              >
                {b.points > 0 ? "+" : ""}
                {b.points}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Wykres */}
      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-display text-xl text-stone2-100">
            <TrendingUp className="h-4 w-4 text-jade-400" />
            Progres
          </div>
          <div
            className="flex rounded-lg border border-ink-600 overflow-hidden"
            role="group"
          >
            {(
              [
                ["day", "Dzień"],
                ["week", "Tydzień"],
                ["month", "Miesiąc"],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                className={`px-3 py-1.5 text-xs ${
                  range === v
                    ? "bg-bronze-400 text-ink-950 font-semibold"
                    : "text-stone2-300 hover:bg-ink-700"
                }`}
                onClick={() => setRange(v)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <Bars data={chart} goal={goalLine} unit="pkt" />
        {range === "day" && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-stone2-400">
            <span className="inline-block h-2 w-4 border-t-2 border-dashed border-bronze-400" />
            linia celu dnia ({progress.goal} pkt)
          </div>
        )}
      </div>
    </div>
  );
}
