"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { fmtHM } from "@/lib/dates";
import TaskItem from "../TaskItem";
import QuickAdd from "../QuickAdd";
import {
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Trash2,
  Target,
  Flag,
  Plus,
  Check,
  Clock,
} from "lucide-react";
import SortSelect, { sortTasks, type TaskSort } from "../SortSelect";

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
  const addMilestone = useStore((s) => s.addMilestone);
  const toggleMilestone = useStore((s) => s.toggleMilestone);
  const deleteMilestone = useStore((s) => s.deleteMilestone);
  const allTasks = useStore((s) => s.tasks);
  const [showDone, setShowDone] = useState(false);
  const [sort, setSort] = useState<TaskSort>("added");
  const [newMilestone, setNewMilestone] = useState("");

  if (!project) return null;

  const tasks = allTasks.filter((t) => t.projectId === projectId);
  const active = sortTasks(
    tasks.filter((t) => !t.completedAt),
    sort
  );
  const done = tasks.filter((t) => t.completedAt);
  const totalSec = tasks.reduce((a, t) => a + t.timeSpentSec, 0);

  const milestones = project.milestones ?? [];
  const msDone = milestones.filter((m) => m.done).length;
  const msPct = milestones.length
    ? Math.round((msDone / milestones.length) * 100)
    : 0;

  const submitMilestone = () => {
    if (!newMilestone.trim()) return;
    addMilestone(project.id, newMilestone);
    setNewMilestone("");
  };

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
      {/* Cel projektu */}
      <div className="card p-4">
        <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase text-bronze-300">
          <Target className="h-4 w-4" />
          Cel projektu
        </div>
        <textarea
          className="input min-h-[52px] resize-none"
          placeholder="Do czego ten projekt ma doprowadzić? Konkretny, mierzalny efekt…"
          value={project.objective ?? ""}
          onChange={(e) =>
            updateProject(project.id, { objective: e.target.value })
          }
        />
      </div>

      {/* Kamienie milowe */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-bronze-300">
            <Flag className="h-4 w-4" />
            Kamienie milowe
          </div>
          {milestones.length > 0 && (
            <span className="text-xs text-stone2-400">
              {msDone}/{milestones.length}
            </span>
          )}
        </div>

        {milestones.length > 0 && (
          <div className="mt-2 h-2 rounded-full bg-ink-700">
            <div
              className="h-2 rounded-full bg-bronze-400 transition-all"
              style={{ width: `${msPct}%` }}
            />
          </div>
        )}

        <div className="mt-3 space-y-1">
          {milestones.map((m) => (
            <div
              key={m.id}
              className="group flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-ink-800"
            >
              <button
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                  m.done
                    ? "border-bronze-400 bg-bronze-500/20 text-bronze-300"
                    : "border-ink-500 text-transparent hover:border-bronze-500"
                }`}
                onClick={() => toggleMilestone(project.id, m.id)}
                aria-label={m.done ? "Odznacz" : "Odklep kamień milowy"}
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <span
                className={`flex-1 text-sm ${
                  m.done
                    ? "text-stone2-400 line-through"
                    : "text-stone2-100"
                }`}
              >
                {m.text}
              </span>
              <button
                className="shrink-0 text-stone2-400/0 transition-colors hover:text-terra-400 group-hover:text-stone2-400"
                onClick={() => deleteMilestone(project.id, m.id)}
                aria-label="Usuń kamień milowy"
                title="Usuń"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {!milestones.length && (
            <p className="text-xs text-stone2-400">
              Rozbij cel na etapy do odklepania — np. „Zebrać wymagania",
              „Zrobić prototyp", „Wdrożyć u pierwszego klienta".
            </p>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Plus className="h-4 w-4 shrink-0 text-bronze-400" />
          <input
            className="flex-1 bg-transparent text-sm text-stone2-100 placeholder:text-stone2-400/50 focus:outline-none"
            placeholder="Dodaj kamień milowy… (Enter)"
            value={newMilestone}
            onChange={(e) => setNewMilestone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitMilestone()}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone2-400">
          <span className="inline-flex items-center gap-1 text-bronze-300">
            <Clock className="h-3.5 w-3.5" />
            skumulowany czas: {fmtHM(totalSec)}
          </span>
          <span>· {active.length} aktywnych</span>
          <span>· {done.length} ukończonych</span>
        </div>
        <SortSelect value={sort} onChange={setSort} />
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
