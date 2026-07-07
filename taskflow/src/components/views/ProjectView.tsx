"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { fmtHM } from "@/lib/dates";
import TaskItem from "../TaskItem";
import QuickAdd from "../QuickAdd";
import { ChevronLeft, ChevronDown, ChevronRight, Trash2 } from "lucide-react";

export default function ProjectView({
  projectId,
  onOpen,
  onComplete,
  onBack,
}: {
  projectId: string;
  onOpen: (id: string) => void;
  onComplete: (id: string) => void;
  onBack: () => void;
}) {
  const project = useStore((s) => s.projects.find((p) => p.id === projectId));
  const goals = useStore((s) => s.goals);
  const updateProject = useStore((s) => s.updateProject);
  const deleteProject = useStore((s) => s.deleteProject);
  const allTasks = useStore((s) => s.tasks);
  const [showDone, setShowDone] = useState(false);

  if (!project) return null;

  const tasks = allTasks.filter((t) => t.projectId === projectId);
  const active = tasks.filter((t) => !t.completedAt);
  const done = tasks.filter((t) => t.completedAt);
  const totalSec = tasks.reduce((a, t) => a + t.timeSpentSec, 0);

  return (
    <div className="space-y-4">
      <button className="btn-ghost -ml-2 text-xs" onClick={onBack}>
        <ChevronLeft className="h-4 w-4" />
        Wszystkie projekty
      </button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="h-4 w-4 rounded-full"
            style={{ background: project.color }}
          />
          <input
            className="bg-transparent font-display text-3xl text-stone2-100 focus:outline-none"
            value={project.name}
            onChange={(e) => updateProject(project.id, { name: e.target.value })}
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            className="rounded-md bg-ink-900 border border-ink-600 px-2 py-1.5 text-xs text-stone2-300"
            value={project.goalId ?? ""}
            onChange={(e) =>
              updateProject(project.id, { goalId: e.target.value || null })
            }
            title="Powiąż z celem"
          >
            <option value="">— bez celu —</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
          <button
            className="btn-danger text-xs"
            title="Usuń projekt (zadania wrócą do skrzynki)"
            onClick={() => {
              if (confirm("Usunąć projekt? Zadania wrócą do skrzynki.")) {
                deleteProject(project.id);
                onBack();
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Usuń
          </button>
        </div>
      </div>
      <div className="text-xs text-stone2-400">
        {active.length} aktywnych · {done.length} ukończonych · łącznie{" "}
        {fmtHM(totalSec)} pracy
      </div>

      <QuickAdd defaultProjectId={projectId} showProject={false} />

      <div className="space-y-1.5">
        {active.map((t) => (
          <TaskItem
            key={t.id}
            task={t}
            onOpen={onOpen}
            onComplete={onComplete}
            showProject={false}
          />
        ))}
        {!active.length && (
          <p className="pt-4 text-center text-sm text-stone2-400">
            Brak aktywnych zadań w projekcie.
          </p>
        )}
      </div>

      {done.length > 0 && (
        <div>
          <button
            className="btn-ghost text-xs"
            onClick={() => setShowDone(!showDone)}
          >
            {showDone ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            Ukończone ({done.length})
          </button>
          {showDone && (
            <div className="mt-2 space-y-1.5 opacity-60">
              {done.map((t) => (
                <div
                  key={t.id}
                  className="rounded-lg border border-ink-700 bg-ink-850 px-3 py-2 text-sm line-through text-stone2-400"
                >
                  {t.title}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
