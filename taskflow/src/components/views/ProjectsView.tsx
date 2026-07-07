"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { fmtHM } from "@/lib/dates";
import { Plus, Target } from "lucide-react";

export default function ProjectsView({
  onOpenProject,
}: {
  onOpenProject: (id: string) => void;
}) {
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  const goals = useStore((s) => s.goals);
  const addProject = useStore((s) => s.addProject);
  const [name, setName] = useState("");

  const create = () => {
    if (!name.trim()) return;
    addProject(name);
    setName("");
  };

  return (
    <div className="space-y-4">
      <h2 className="font-display text-3xl text-stone2-100">Projekty</h2>
      <div className="card flex items-center gap-2 p-2">
        <Plus className="ml-2 h-4 w-4 shrink-0 text-bronze-400" />
        <input
          className="flex-1 bg-transparent px-1 py-1.5 text-sm text-stone2-100 placeholder:text-stone2-400/50 focus:outline-none"
          placeholder="Nazwa nowego projektu… (Enter)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
        />
        <button className="btn-primary" onClick={create} disabled={!name.trim()}>
          Utwórz
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {projects.map((p) => {
          const pt = tasks.filter((t) => t.projectId === p.id);
          const activeCount = pt.filter((t) => !t.completedAt).length;
          const sec = pt.reduce((a, t) => a + t.timeSpentSec, 0);
          const goal = goals.find((g) => g.id === p.goalId);
          return (
            <button
              key={p.id}
              className="card p-4 text-left hover:border-bronze-600/50 transition-colors"
              onClick={() => onOpenProject(p.id)}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ background: p.color }}
                />
                <span className="font-display text-lg text-stone2-100">
                  {p.name}
                </span>
              </div>
              <div className="mt-1 text-xs text-stone2-400">
                {activeCount} aktywnych zadań · {fmtHM(sec)}
              </div>
              {goal && (
                <div className="mt-2 chip border border-ink-600 bg-ink-900 text-stone2-300">
                  <Target className="h-3 w-3 text-bronze-400" />
                  {goal.title}
                </div>
              )}
            </button>
          );
        })}
        {!projects.length && (
          <p className="text-sm text-stone2-400 sm:col-span-2">
            Nie masz jeszcze projektów. Utwórz pierwszy powyżej — np. „Agencja"
            albo „Marketing".
          </p>
        )}
      </div>
    </div>
  );
}
