import { Task, Project, Goal } from "./types";
import { isToday, isThisWeek, todayStr, weekDates } from "./dates";

export interface DayStats {
  todayTotal: number;
  todayDone: number;
  todayRemaining: number;
  todaySec: number;
  weekTotal: number;
  weekDone: number;
  weekRemaining: number;
  weekSec: number;
}

function completedOn(t: Task, day: string): boolean {
  return !!t.completedAt && t.completedAt.slice(0, 10) === day;
}

export function computeStats(
  tasks: Task[],
  workLog: Record<string, number>
): DayStats {
  const today = todayStr();
  const week = weekDates();

  const active = tasks.filter((t) => !t.completedAt);
  const todayActive = active.filter((t) => isToday(t.dueDate));
  const weekActive = active.filter(
    (t) => isThisWeek(t.dueDate) || isToday(t.dueDate)
  );

  const todayDone = tasks.filter((t) => completedOn(t, today)).length;
  const weekDone = tasks.filter(
    (t) => t.completedAt && week.includes(t.completedAt.slice(0, 10))
  ).length;

  const todaySec = workLog[today] ?? 0;
  const weekSec = week.reduce((acc, d) => acc + (workLog[d] ?? 0), 0);

  return {
    todayTotal: todayActive.length + todayDone,
    todayDone,
    todayRemaining: todayActive.length,
    todaySec,
    weekTotal: weekActive.length + weekDone,
    weekDone,
    weekRemaining: weekActive.length,
    weekSec,
  };
}

export function goalSeconds(
  goal: Goal,
  projects: Project[],
  tasks: Task[]
): number {
  const projectIds = new Set(
    projects.filter((p) => p.goalId === goal.id).map((p) => p.id)
  );
  return tasks
    .filter((t) => t.projectId && projectIds.has(t.projectId))
    .reduce((acc, t) => acc + t.timeSpentSec, 0);
}
