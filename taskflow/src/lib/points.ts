import { Task, Habit, PulseEntry, Settings } from "./types";
import { JournalEntry } from "./journal";
import { todayStr, weekDates, DAY } from "./dates";
import {
  format,
  parseISO,
  addDays,
  startOfWeek,
  startOfMonth,
} from "date-fns";

/** Reguły punktacji zwycięstwa. */
export const PT = {
  per10min: 1, // każde 10 min pracy w skupieniu
  perPomodoro: 2, // ukończone pomodoro
  perTask: 2, // ukończone zadanie
  perRealize: 1, // zaznaczenie realizacji potencjału
  perReport: 4, // uzupełniony raport końca dnia
  perDailyHabit: 2, // nawyk dzienny zrealizowany
  perWeeklyHabitRep: 1, // pojedyncze odhaczenie nawyku tygodniowego
  focusFloorSec: 4 * 3600, // 4 h skupionej pracy
  perMissing30min: -1, // każde nieprzepracowane 30 min poniżej progu
  noReportPenalty: -4, // brak raportu w zakończonym dniu
};

export interface PointsInput {
  tasks: Task[];
  habits: Habit[];
  pulseLog: PulseEntry[];
  journal: JournalEntry[];
  workLog: Record<string, number>;
  pomodoroLog: Record<string, number>;
  settings: Settings;
}

export interface PointsBreakdown {
  label: string;
  points: number;
  detail: string;
  negative?: boolean;
}

export interface DayPoints {
  date: string;
  total: number; // z karami jeśli finalized
  positive: number; // same dodatnie
  pendingPenalty: number; // kary, które naliczą się po zakończeniu dnia (dla dziś)
  finalized: boolean;
  hasReport: boolean;
  breakdown: PointsBreakdown[];
}

function reportDone(journal: JournalEntry[], date: string): boolean {
  const j = journal.find((x) => x.type === "day" && x.date === date);
  if (!j) return false;
  return Object.values(j.answers).filter((a) => a.trim().length > 2).length >= 3;
}

/** Punkty za jeden dzień. finalized=true nalicza kary. */
export function computeDayPoints(
  date: string,
  input: PointsInput
): DayPoints {
  const finalized = date < todayStr();
  const workSec = input.workLog[date] ?? 0;
  const pomodoros = input.pomodoroLog[date] ?? 0;
  const tasksDone = input.tasks.filter(
    (t) => t.completedAt && t.completedAt.slice(0, 10) === date
  ).length;
  const realize = input.pulseLog.filter(
    (p) => p.answer === "realize" && p.ts.slice(0, 10) === date
  ).length;
  const hasReport = reportDone(input.journal, date);

  // nawyki
  let habitPts = 0;
  let dailyHabitsMet = 0;
  let weeklyReps = 0;
  for (const h of input.habits) {
    const reps = h.log[date] ?? 0;
    if (h.cadence === "daily") {
      if (reps >= h.targetCount) {
        habitPts += PT.perDailyHabit;
        dailyHabitsMet++;
      }
    } else {
      habitPts += reps * PT.perWeeklyHabitRep;
      weeklyReps += reps;
    }
  }

  const workPts = Math.floor(workSec / 600) * PT.per10min;
  const pomoPts = pomodoros * PT.perPomodoro;
  const taskPts = tasksDone * PT.perTask;
  const realizePts = realize * PT.perRealize;
  const reportPts = hasReport ? PT.perReport : 0;

  const breakdown: PointsBreakdown[] = [
    {
      label: "Praca w skupieniu",
      points: workPts,
      detail: `${Math.floor(workSec / 600)}× 10 min`,
    },
    {
      label: "Ukończone pomodoro",
      points: pomoPts,
      detail: `${pomodoros}× ⋅ 2`,
    },
    {
      label: "Ukończone zadania",
      points: taskPts,
      detail: `${tasksDone}× ⋅ 2`,
    },
    {
      label: "Puls: realizuję",
      points: realizePts,
      detail: `${realize}× ⋅ 1`,
    },
    {
      label: "Nawyki",
      points: habitPts,
      detail:
        `${dailyHabitsMet} dziennych` +
        (weeklyReps ? ` + ${weeklyReps} tyg.` : ""),
    },
    {
      label: "Raport końca dnia",
      points: reportPts,
      detail: hasReport ? "uzupełniony" : "brak",
    },
  ];

  const positive =
    workPts + pomoPts + taskPts + realizePts + habitPts + reportPts;

  const wastePulses = input.pulseLog.filter(
    (p) => p.answer === "waste" && p.ts.slice(0, 10) === date
  ).length;
  const hadActivity =
    workSec > 0 ||
    pomodoros > 0 ||
    tasksDone > 0 ||
    realize > 0 ||
    wastePulses > 0 ||
    habitPts > 0 ||
    hasReport;

  // dzień bez żadnej aktywności (sprzed startu korzystania) — nie karzemy
  if (finalized && !hadActivity) {
    return {
      date,
      total: 0,
      positive: 0,
      pendingPenalty: 0,
      finalized,
      hasReport,
      breakdown: [],
    };
  }

  // kary
  const deficitPenalty =
    workSec < PT.focusFloorSec
      ? Math.floor((PT.focusFloorSec - workSec) / 1800) * PT.perMissing30min
      : 0;
  const noReportPenalty = !hasReport ? PT.noReportPenalty : 0;
  const pendingPenalty = deficitPenalty + noReportPenalty;

  if (finalized) {
    if (deficitPenalty < 0) {
      breakdown.push({
        label: "Deficyt skupienia (<4 h)",
        points: deficitPenalty,
        detail: `${Math.floor(
          (PT.focusFloorSec - workSec) / 1800
        )}× 30 min`,
        negative: true,
      });
    }
    if (noReportPenalty < 0) {
      breakdown.push({
        label: "Brak raportu dnia",
        points: noReportPenalty,
        detail: "kara",
        negative: true,
      });
    }
  }

  return {
    date,
    total: finalized ? positive + pendingPenalty : positive,
    positive,
    pendingPenalty,
    finalized,
    hasReport,
    breakdown: breakdown.filter((b) => b.points !== 0 || !b.negative),
  };
}

/** Ostatnie N dni jako punkty (od najstarszego do najnowszego). */
export function lastNDays(n: number, input: PointsInput): DayPoints[] {
  const out: DayPoints[] = [];
  const today = parseISO(todayStr());
  for (let i = n - 1; i >= 0; i--) {
    const d = format(addDays(today, -i), DAY);
    out.push(computeDayPoints(d, input));
  }
  return out;
}

export interface GoalProgress {
  goal: number; // dzisiejszy cel punktowy (kaizen)
  level: number; // ile razy podniesiono poprzeczkę
  successes: number; // dni z osiągniętym celem
  toNextLevel: number; // ile udanych dni do podniesienia poprzeczki
}

/**
 * Kaizen: startujemy od bazy (np. 3 pkt/dzień), a po każdych 3 udanych
 * dniach poprzeczka rośnie o 1. Liczone po zakończonych dniach.
 */
export function computeGoalProgress(input: PointsInput): GoalProgress {
  const base = input.settings.pointGoalBase ?? 3;
  // zbierz zakończone dni z jakąkolwiek aktywnością, chronologicznie
  const activeDates = new Set<string>();
  for (const d of Object.keys(input.workLog)) activeDates.add(d);
  for (const d of Object.keys(input.pomodoroLog)) activeDates.add(d);
  for (const t of input.tasks)
    if (t.completedAt) activeDates.add(t.completedAt.slice(0, 10));
  for (const p of input.pulseLog) activeDates.add(p.ts.slice(0, 10));
  for (const j of input.journal)
    if (j.type === "day") activeDates.add(j.date);

  const today = todayStr();
  const past = Array.from(activeDates)
    .filter((d) => d < today)
    .sort();

  let level = 0;
  let successes = 0;
  let sinceBump = 0;
  for (const d of past) {
    const goal = base + level;
    const p = computeDayPoints(d, input);
    if (p.total >= goal) {
      successes++;
      sinceBump++;
      if (sinceBump >= 3) {
        level++;
        sinceBump = 0;
      }
    }
  }
  return {
    goal: base + level,
    level,
    successes,
    toNextLevel: 3 - sinceBump,
  };
}

export interface Rank {
  name: string;
  color: string; // klasa tekstu tailwind
  bar: string; // klasa tła paska
}

export function rankFor(score: number, goal: number): Rank {
  if (score <= 0)
    return { name: "Cień", color: "text-terra-400", bar: "bg-terra-500" };
  if (score < goal)
    return {
      name: "Idiotes",
      color: "text-stone2-300",
      bar: "bg-stone2-400",
    };
  if (score < goal * 1.5)
    return { name: "Hoplita", color: "text-jade-400", bar: "bg-jade-500" };
  if (score < goal * 2.5)
    return { name: "Strateg", color: "text-aegean-400", bar: "bg-aegean-500" };
  return { name: "Heros", color: "text-bronze-300", bar: "bg-bronze-400" };
}

/** Agregacja tygodniowa (ostatnie n tygodni). */
export function weeklyTotals(
  weeks: number,
  input: PointsInput
): { label: string; total: number; start: string }[] {
  const out: { label: string; total: number; start: string }[] = [];
  const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  for (let i = weeks - 1; i >= 0; i--) {
    const ws = addDays(thisWeekStart, -7 * i);
    let total = 0;
    for (let d = 0; d < 7; d++) {
      const date = format(addDays(ws, d), DAY);
      if (date > todayStr()) continue;
      total += computeDayPoints(date, input).total;
    }
    out.push({
      label: format(ws, "d MMM"),
      total,
      start: format(ws, DAY),
    });
  }
  return out;
}

/** Agregacja miesięczna (ostatnie n miesięcy). */
export function monthlyTotals(
  months: number,
  input: PointsInput
): { label: string; total: number }[] {
  const out: { label: string; total: number }[] = [];
  const first = startOfMonth(new Date());
  for (let i = months - 1; i >= 0; i--) {
    const m = new Date(first.getFullYear(), first.getMonth() - i, 1);
    const next = new Date(m.getFullYear(), m.getMonth() + 1, 1);
    let total = 0;
    let d = new Date(m);
    while (d < next) {
      const date = format(d, DAY);
      if (date <= todayStr()) total += computeDayPoints(date, input).total;
      d = addDays(d, 1);
    }
    out.push({ label: format(m, "LLL"), total });
  }
  return out;
}

export function pointsInputFromState(s: {
  tasks: Task[];
  habits: Habit[];
  pulseLog: PulseEntry[];
  journal: JournalEntry[];
  workLog: Record<string, number>;
  pomodoroLog: Record<string, number>;
  settings: Settings;
}): PointsInput {
  return {
    tasks: s.tasks,
    habits: s.habits,
    pulseLog: s.pulseLog,
    journal: s.journal,
    workLog: s.workLog,
    pomodoroLog: s.pomodoroLog ?? {},
    settings: s.settings,
  };
}

export { weekDates };
