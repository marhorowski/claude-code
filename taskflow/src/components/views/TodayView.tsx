"use client";

import { useStore } from "@/lib/store";
import { Task } from "@/lib/types";
import {
  isToday,
  isTomorrow,
  isThisWeek,
  todayStr,
  tomorrowStr,
} from "@/lib/dates";
import TaskItem from "../TaskItem";
import QuickAdd from "../QuickAdd";

function GroupedByProject({
  tasks,
  onOpen,
  onComplete,
}: {
  tasks: Task[];
  onOpen: (id: string) => void;
  onComplete: (id: string) => void;
}) {
  const projects = useStore((s) => s.projects);
  const groups: { name: string; color: string | null; tasks: Task[] }[] = [];

  const inbox = tasks.filter((t) => !t.projectId);
  if (inbox.length)
    groups.push({ name: "Skrzynka", color: null, tasks: inbox });
  for (const p of projects) {
    const pt = tasks.filter((t) => t.projectId === p.id);
    if (pt.length) groups.push({ name: p.name, color: p.color, tasks: pt });
  }

  const sortTasks = (list: Task[]) =>
    [...list].sort(
      (a, b) =>
        Number(b.focusDay) - Number(a.focusDay) ||
        Number(b.focusWeek) - Number(a.focusWeek)
    );

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.name}>
          <div className="mb-1.5 flex items-center gap-2 text-xs uppercase tracking-wider text-stone2-400">
            {g.color && (
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: g.color }}
              />
            )}
            {g.name}
          </div>
          <div className="space-y-1.5">
            {sortTasks(g.tasks).map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                onOpen={onOpen}
                onComplete={onComplete}
                showProject={false}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TodayView({
  onOpen,
  onComplete,
}: {
  onOpen: (id: string) => void;
  onComplete: (id: string) => void;
}) {
  const tasks = useStore((s) => s.tasks);
  const active = tasks.filter((t) => !t.completedAt);

  const today = active.filter((t) => isToday(t.dueDate));
  const tomorrow = active.filter((t) => isTomorrow(t.dueDate));
  const week = active.filter(
    (t) =>
      isThisWeek(t.dueDate) && !isToday(t.dueDate) && !isTomorrow(t.dueDate)
  );

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 font-display text-2xl text-stone2-100">
          Dziś{" "}
          <span className="text-sm font-sans text-stone2-400">
            ({today.length})
          </span>
        </h2>
        <div className="mb-3">
          <QuickAdd defaultDue={todayStr()} />
        </div>
        {today.length ? (
          <GroupedByProject
            tasks={today}
            onOpen={onOpen}
            onComplete={onComplete}
          />
        ) : (
          <p className="text-sm text-stone2-400">
            Brak zadań na dziś. Dodaj powyżej albo użyj „Ustalania dnia".
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-2xl text-stone2-100">
          Jutro{" "}
          <span className="text-sm font-sans text-stone2-400">
            ({tomorrow.length})
          </span>
        </h2>
        <div className="mb-3">
          <QuickAdd defaultDue={tomorrowStr()} />
        </div>
        {tomorrow.length ? (
          <GroupedByProject
            tasks={tomorrow}
            onOpen={onOpen}
            onComplete={onComplete}
          />
        ) : (
          <p className="text-sm text-stone2-400">Jutro na razie puste.</p>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-2xl text-stone2-100">
          W tym tygodniu{" "}
          <span className="text-sm font-sans text-stone2-400">
            ({week.length})
          </span>
        </h2>
        {week.length ? (
          <GroupedByProject
            tasks={week}
            onOpen={onOpen}
            onComplete={onComplete}
          />
        ) : (
          <p className="text-sm text-stone2-400">
            Reszta tygodnia pusta — zaplanuj ją przez „Ustalanie tygodnia".
          </p>
        )}
      </section>
    </div>
  );
}
