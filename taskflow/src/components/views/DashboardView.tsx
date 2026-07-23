"use client";

import { useStore } from "@/lib/store";
import { computeStats, goalSeconds } from "@/lib/stats";
import { fmtHM, todayStr, isToday, weekDates } from "@/lib/dates";
import GoalBanner from "../GoalBanner";
import TaskItem from "../TaskItem";
import NotifBanner from "../NotifBanner";
import {
  computeDayPoints,
  computeGoalProgress,
  rankFor,
  pointsInputFromState,
} from "@/lib/points";
import {
  Sun,
  Repeat,
  Activity,
  ArrowRight,
  Plus,
  Check,
  Timer,
  Target,
  Flame,
  CircleSlash,
  CalendarDays,
  Trophy,
} from "lucide-react";

function StatTile({
  label,
  value,
  sub,
  accent,
  tile,
  icon: Icon,
  pct,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string; // pasek postępu
  tile: string; // tło kafelka ikony
  icon: typeof Timer;
  pct?: number | null;
}) {
  return (
    <div className="card px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] uppercase text-stone2-400">{label}</div>
          <div className="font-display text-2xl md:text-3xl text-stone2-100">
            {value}
          </div>
          {sub && <div className="text-xs text-stone2-400">{sub}</div>}
        </div>
        <span className={`icon-tile ${tile}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      {typeof pct === "number" && (
        <div className="mt-2 h-1.5 rounded-full bg-ink-700">
          <div
            className={`h-1.5 rounded-full ${accent}`}
            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function DashboardView({
  onOpen,
  onComplete,
  onNavigate,
}: {
  onOpen: (id: string) => void;
  onComplete: (id: string) => void;
  onNavigate: (kind: "today" | "habits" | "day" | "goals" | "points") => void;
}) {
  const store = useStore();
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const goals = useStore((s) => s.goals);
  const habits = useStore((s) => s.habits);
  const pulseLog = useStore((s) => s.pulseLog);
  const workLog = useStore((s) => s.workLog);
  const settings = useStore((s) => s.settings);
  const timer = useStore((s) => s.timer);
  const logHabit = useStore((s) => s.logHabit);

  const st = computeStats(tasks, workLog);
  const pInput = pointsInputFromState(store);
  const dayPts = computeDayPoints(todayStr(), pInput);
  const goalProg = computeGoalProgress(pInput);
  const rank = rankFor(dayPts.total, goalProg.goal);
  const today = todayStr();
  const week = weekDates();

  const todayTasks = tasks
    .filter((t) => !t.completedAt && isToday(t.dueDate))
    .sort(
      (a, b) =>
        Number(b.focusDay) - Number(a.focusDay) ||
        Number(b.focusWeek) - Number(a.focusWeek)
    );

  const todayPulses = pulseLog.filter((p) => p.ts.slice(0, 10) === today);
  const realize = todayPulses.filter((p) => p.answer === "realize").length;
  const waste = todayPulses.filter((p) => p.answer === "waste").length;
  const pulsePct =
    realize + waste > 0
      ? Math.round((realize / (realize + waste)) * 100)
      : null;

  const targetSec = (settings.targetHoursPerDay || 6) * 3600;
  const activeTask = tasks.find((t) => t.id === timer.taskId);

  const habitToday = (h: (typeof habits)[number]) => {
    const cnt =
      h.cadence === "daily"
        ? h.log[today] ?? 0
        : week.reduce((a, d) => a + (h.log[d] ?? 0), 0);
    return { cnt, target: h.targetCount, done: cnt >= h.targetCount };
  };

  return (
    <div className="space-y-5">
      <NotifBanner />
      <GoalBanner onGoals={() => onNavigate("goals")} />

      {/* Motto */}
      {settings.motto?.trim() ? (
        <div className="card overflow-hidden">
          <div className="meander" />
          <div className="px-5 py-4 text-center">
            <div className="font-display text-xl md:text-2xl text-bronze-300 leading-snug">
              „{settings.motto.trim()}"
            </div>
          </div>
        </div>
      ) : null}

      {/* Liczniki */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Czas pracy dziś"
          value={fmtHM(st.todaySec)}
          sub={`cel: ${settings.targetHoursPerDay} h`}
          accent="bg-bronze-400"
          tile="bg-bronze-500/15 text-bronze-300"
          icon={Timer}
          pct={(st.todaySec / targetSec) * 100}
        />
        <StatTile
          label="Zadania dziś"
          value={`${st.todayDone}/${st.todayTotal}`}
          sub={`zostało: ${st.todayRemaining}`}
          accent="bg-jade-500"
          tile="bg-jade-500/15 text-jade-400"
          icon={Check}
          pct={st.todayTotal ? (st.todayDone / st.todayTotal) * 100 : 0}
        />
        <StatTile
          label="Czas w tym tygodniu"
          value={fmtHM(st.weekSec)}
          sub={`zadania: ${st.weekDone}/${st.weekTotal}`}
          accent="bg-aegean-500"
          tile="bg-aegean-500/15 text-aegean-400"
          icon={CalendarDays}
          pct={(st.weekSec / (targetSec * 5)) * 100}
        />
        <StatTile
          label="Puls dziś"
          value={pulsePct === null ? "—" : `${pulsePct}%`}
          sub={
            pulsePct === null
              ? "brak odpowiedzi"
              : `realizuję ${realize} · marnuję ${waste}`
          }
          accent={pulsePct !== null && pulsePct < 50 ? "bg-terra-500" : "bg-jade-500"}
          tile={
            pulsePct !== null && pulsePct < 50
              ? "bg-terra-500/15 text-terra-400"
              : "bg-jade-500/15 text-jade-400"
          }
          icon={Activity}
          pct={pulsePct}
        />
      </div>

      {/* Punkty zwycięstwa */}
      <button
        className="card card-hover block w-full overflow-hidden text-left"
        onClick={() => onNavigate("points")}
      >
        <div className="flex items-center gap-4 px-5 py-4">
          <span className="icon-tile h-11 w-11 bg-bronze-500/15 text-bronze-300">
            <Trophy className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-[11px] uppercase text-stone2-400">
                Punkty zwycięstwa dziś
              </span>
              <span className={`text-xs ${rank.color}`}>· {rank.name}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`font-display text-3xl ${
                  dayPts.total < 0 ? "text-terra-400" : "text-stone2-100"
                }`}
              >
                {dayPts.total}
              </span>
              <span className="text-sm text-stone2-400">
                / {goalProg.goal} pkt (cel kaizen)
              </span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-ink-700">
              <div
                className={`h-1.5 rounded-full ${rank.bar}`}
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(100, (dayPts.total / goalProg.goal) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-stone2-400" />
        </div>
      </button>

      {/* Aktywna praca */}
      {activeTask && (
        <button
          className="card card-hover flex w-full items-center gap-3 border-l-4 border-l-bronze-400 px-4 py-3 text-left"
          onClick={() => onOpen(activeTask.id)}
        >
          <Timer className="h-5 w-5 shrink-0 text-bronze-300 pulse-soft" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-stone2-100">
              {activeTask.title}
            </div>
            <div className="text-xs text-stone2-400">
              {timer.running
                ? timer.phase === "work"
                  ? "trwa sesja pracy"
                  : "przerwa"
                : "timer zapauzowany"}{" "}
              · łącznie {fmtHM(activeTask.timeSpentSec)}
            </div>
          </div>
        </button>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Na dziś */}
        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-display text-xl text-stone2-100">
              <Sun className="h-4 w-4 text-bronze-300" />
              Na dziś
            </h3>
            <button
              className="btn-ghost text-xs"
              onClick={() => onNavigate("today")}
            >
              cały plan <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-1.5">
            {todayTasks.slice(0, 6).map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                onOpen={onOpen}
                onComplete={onComplete}
              />
            ))}
            {todayTasks.length > 6 && (
              <p className="pt-1 text-xs text-stone2-400">
                +{todayTasks.length - 6} kolejnych w Planie
              </p>
            )}
            {!todayTasks.length && (
              <p className="py-4 text-center text-sm text-stone2-400">
                {st.todayDone > 0
                  ? "Wszystko na dziś zrobione. Νίκη!"
                  : "Brak zadań na dziś — dodaj w Planie."}
              </p>
            )}
          </div>
        </section>

        {/* Nawyki dziś */}
        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-display text-xl text-stone2-100">
              <Repeat className="h-4 w-4 text-aegean-400" />
              Nawyki
            </h3>
            <button
              className="btn-ghost text-xs"
              onClick={() => onNavigate("habits")}
            >
              wszystkie <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            {habits.map((h) => {
              const { cnt, target, done } = habitToday(h);
              return (
                <div key={h.id} className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: h.color }}
                  />
                  <span
                    className={`min-w-0 flex-1 truncate text-sm ${
                      done ? "text-jade-400" : "text-stone2-200"
                    }`}
                  >
                    {h.name}
                  </span>
                  <span className="text-xs tabular-nums text-stone2-400">
                    {cnt}/{target}
                    {h.cadence === "weekly" ? " /tydz." : ""}
                  </span>
                  <button
                    className={`flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
                      done
                        ? "border-jade-500 bg-jade-500/15 text-jade-400"
                        : "border-ink-600 text-stone2-300 hover:border-bronze-400 hover:text-bronze-300"
                    }`}
                    onClick={() => logHabit(h.id, today, 1)}
                    title={done ? "Cel osiągnięty — dołóż jeszcze" : "Odhacz"}
                    aria-label={`Odhacz nawyk ${h.name}`}
                  >
                    {done ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              );
            })}
            {!habits.length && (
              <p className="py-4 text-center text-sm text-stone2-400">
                Brak nawyków — dodaj pierwszy w module Nawyki.
              </p>
            )}
          </div>
        </section>

        {/* Puls dnia */}
        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-display text-xl text-stone2-100">
              <Activity className="h-4 w-4 text-terra-400" />
              Puls potencjału
            </h3>
            <button
              className="btn-ghost text-xs"
              onClick={() => onNavigate("day")}
            >
              dziennik <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {realize + waste > 0 ? (
            <>
              <div className="flex h-3 overflow-hidden rounded-full bg-ink-700">
                {realize > 0 && (
                  <div
                    className="bg-jade-500"
                    style={{
                      width: `${(realize / (realize + waste)) * 100}%`,
                      marginRight: waste > 0 ? 2 : 0,
                    }}
                  />
                )}
                {waste > 0 && (
                  <div
                    className="flex-1 bg-terra-500"
                  />
                )}
              </div>
              <div className="mt-2 flex justify-between text-xs">
                <span className="inline-flex items-center gap-1 text-jade-400">
                  <Flame className="h-3.5 w-3.5" /> realizuję: {realize}
                </span>
                <span className="inline-flex items-center gap-1 text-terra-400">
                  <CircleSlash className="h-3.5 w-3.5" /> marnuję: {waste}
                </span>
              </div>
            </>
          ) : (
            <p className="py-4 text-center text-sm text-stone2-400">
              Jeszcze żadnej odpowiedzi dziś — pytanie przyjdzie co{" "}
              {settings.pulseIntervalMin ?? 15} min.
            </p>
          )}
        </section>

        {/* Cele — czas w tym co ważne */}
        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-display text-xl text-stone2-100">
              <Target className="h-4 w-4 text-jade-400" />
              Czas w celach
            </h3>
            <button
              className="btn-ghost text-xs"
              onClick={() => onNavigate("goals")}
            >
              cele <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            {goals.map((g) => (
              <div key={g.id} className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-stone2-200">
                  {g.isMain && "★ "}
                  {g.title}
                </span>
                <span className="font-display text-lg text-bronze-300">
                  {fmtHM(goalSeconds(g, projects, tasks))}
                </span>
              </div>
            ))}
            {!goals.length && (
              <p className="py-4 text-center text-sm text-stone2-400">
                Zdefiniuj cel, powiąż z nim projekty — tu zobaczysz włożony
                czas.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
