"use client";

import { useStore } from "@/lib/store";
import { Task } from "@/lib/types";
import { humanDate, fmtHM, isOverdue } from "@/lib/dates";

export default function TaskItem({
  task,
  onOpen,
  onComplete,
  showProject = true,
}: {
  task: Task;
  onOpen: (id: string) => void;
  onComplete: (id: string) => void;
  showProject?: boolean;
}) {
  const projects = useStore((s) => s.projects);
  const timer = useStore((s) => s.timer);
  const startTimer = useStore((s) => s.startTimer);
  const pauseTimer = useStore((s) => s.pauseTimer);
  const resumeTimer = useStore((s) => s.resumeTimer);

  const project = projects.find((p) => p.id === task.projectId);
  const isActive = timer.taskId === task.id;
  const checklistDone = task.checklist.filter((c) => c.done).length;

  const highlight = task.focusDay
    ? "border-l-terra-500 bg-terra-600/10"
    : task.focusWeek
    ? "border-l-bronze-400 bg-bronze-500/10"
    : "border-l-transparent";

  return (
    <div
      className={`group flex items-center gap-3 rounded-lg border border-ink-700 border-l-4 ${highlight} bg-ink-850 px-3 py-2.5 hover:border-ink-600 transition-colors cursor-pointer`}
      onClick={() => onOpen(task.id)}
    >
      <button
        aria-label="Zakończ zadanie"
        onClick={(e) => {
          e.stopPropagation();
          onComplete(task.id);
        }}
        className="h-5 w-5 shrink-0 rounded-full border-2 border-stone2-400/60 hover:border-bronze-400 hover:bg-bronze-500/20 transition-colors"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm text-stone2-100">{task.title}</span>
          {task.focusDay && (
            <span className="chip bg-terra-600/20 text-terra-400 shrink-0">
              fokus dnia
            </span>
          )}
          {!task.focusDay && task.focusWeek && (
            <span className="chip bg-bronze-500/15 text-bronze-300 shrink-0">
              fokus tygodnia
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-stone2-400">
          <span className={isOverdue(task.dueDate) ? "text-terra-400" : ""}>
            {humanDate(task.dueDate)}
          </span>
          {showProject && project && (
            <span className="inline-flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: project.color }}
              />
              {project.name}
            </span>
          )}
          {task.checklist.length > 0 && (
            <span>
              ☑ {checklistDone}/{task.checklist.length}
            </span>
          )}
          {task.timeSpentSec > 0 && <span>⏱ {fmtHM(task.timeSpentSec)}</span>}
        </div>
      </div>
      <button
        aria-label={isActive && timer.running ? "Pauza" : "Start"}
        onClick={(e) => {
          e.stopPropagation();
          if (isActive) {
            timer.running ? pauseTimer() : resumeTimer();
          } else {
            startTimer(task.id);
          }
        }}
        className={`shrink-0 h-8 w-8 rounded-full border flex items-center justify-center text-xs transition-colors ${
          isActive
            ? "border-bronze-400 text-bronze-300 bg-bronze-500/15" +
              (timer.running ? " pulse-soft" : "")
            : "border-ink-600 text-stone2-400 opacity-0 group-hover:opacity-100 hover:border-bronze-500 hover:text-bronze-300"
        }`}
      >
        {isActive && timer.running ? "❚❚" : "▶"}
      </button>
    </div>
  );
}
