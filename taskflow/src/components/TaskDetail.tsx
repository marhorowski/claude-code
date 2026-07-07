"use client";

import { useState } from "react";
import { useStore, uid } from "@/lib/store";
import { fmtHM } from "@/lib/dates";
import { Play, Pause, Plus, Trash2, X, CheckCircle2 } from "lucide-react";

export default function TaskDetail({
  taskId,
  onClose,
  onComplete,
}: {
  taskId: string;
  onClose: () => void;
  onComplete: (id: string) => void;
}) {
  const task = useStore((s) => s.tasks.find((t) => t.id === taskId));
  const projects = useStore((s) => s.projects);
  const updateTask = useStore((s) => s.updateTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const timer = useStore((s) => s.timer);
  const startTimer = useStore((s) => s.startTimer);
  const pauseTimer = useStore((s) => s.pauseTimer);
  const resumeTimer = useStore((s) => s.resumeTimer);
  const [newItem, setNewItem] = useState("");

  if (!task) return null;
  const isActive = timer.taskId === task.id;

  const addItem = () => {
    if (!newItem.trim()) return;
    updateTask(task.id, {
      checklist: [
        ...task.checklist,
        { id: uid(), text: newItem.trim(), done: false },
      ],
    });
    setNewItem("");
  };

  return (
    <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-md border-l border-ink-700 bg-ink-900 shadow-modal flex flex-col fade-in-up">
      <div className="meander-subtle" />
      <div className="flex items-center justify-between border-b border-ink-700 px-5 py-3">
        <span className="text-xs uppercase text-stone2-400">
          Szczegóły zadania
        </span>
        <div className="flex items-center gap-1">
          <button
            className="btn-danger text-xs"
            title="Usuń zadanie"
            onClick={() => {
              deleteTask(task.id);
              onClose();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Usuń
          </button>
          <button
            className="btn-ghost"
            onClick={onClose}
            title="Zamknij"
            aria-label="Zamknij panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <input
          className="w-full bg-transparent font-display text-2xl text-stone2-100 focus:outline-none"
          value={task.title}
          onChange={(e) => updateTask(task.id, { title: e.target.value })}
        />

        {/* Timer zadania */}
        <div className="card p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-stone2-400">Łączny czas pracy</div>
            <div className="font-display text-xl text-bronze-300">
              {fmtHM(task.timeSpentSec)}
            </div>
            {task.estimateMin ? (
              <div className="text-xs text-stone2-400">
                estymacja: {task.estimateMin} min
              </div>
            ) : null}
          </div>
          <button
            className={isActive && timer.running ? "btn-outline" : "btn-primary"}
            onClick={() => {
              if (isActive) {
                timer.running ? pauseTimer() : resumeTimer();
              } else {
                startTimer(task.id);
              }
            }}
          >
            {isActive && timer.running ? (
              <>
                <Pause className="h-4 w-4" /> Pauza
              </>
            ) : isActive ? (
              <>
                <Play className="h-4 w-4" /> Wznów
              </>
            ) : (
              <>
                <Play className="h-4 w-4" /> Start Pomodoro
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Data wykonania</label>
            <input
              type="date"
              className="input"
              value={task.dueDate ?? ""}
              onChange={(e) =>
                updateTask(task.id, { dueDate: e.target.value || null })
              }
            />
          </div>
          <div>
            <label className="label">Projekt</label>
            <select
              className="input"
              value={task.projectId ?? ""}
              onChange={(e) =>
                updateTask(task.id, { projectId: e.target.value || null })
              }
            >
              <option value="">Skrzynka</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Estymacja (min)</label>
            <input
              type="number"
              min={0}
              className="input"
              value={task.estimateMin ?? ""}
              onChange={(e) =>
                updateTask(task.id, {
                  estimateMin: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </div>
          <div>
            <label className="label">Fokus</label>
            <div className="flex gap-2 pt-1">
              <button
                className={`chip border ${
                  task.focusDay
                    ? "border-terra-500 bg-terra-600/20 text-terra-400"
                    : "border-ink-600 text-stone2-400 hover:border-terra-500"
                }`}
                onClick={() =>
                  updateTask(task.id, { focusDay: !task.focusDay })
                }
              >
                dnia
              </button>
              <button
                className={`chip border ${
                  task.focusWeek
                    ? "border-bronze-400 bg-bronze-500/15 text-bronze-300"
                    : "border-ink-600 text-stone2-400 hover:border-bronze-400"
                }`}
                onClick={() =>
                  updateTask(task.id, { focusWeek: !task.focusWeek })
                }
              >
                tygodnia
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="label">Opis</label>
          <textarea
            className="input min-h-[90px] resize-y"
            placeholder="Notatki, kontekst, linki…"
            value={task.description}
            onChange={(e) =>
              updateTask(task.id, { description: e.target.value })
            }
          />
        </div>

        <div>
          <label className="label">
            Checklista{" "}
            {task.checklist.length > 0 &&
              `(${task.checklist.filter((c) => c.done).length}/${
                task.checklist.length
              })`}
          </label>
          <div className="space-y-1.5">
            {task.checklist.map((item) => (
              <div key={item.id} className="flex items-center gap-2 group">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() =>
                    updateTask(task.id, {
                      checklist: task.checklist.map((c) =>
                        c.id === item.id ? { ...c, done: !c.done } : c
                      ),
                    })
                  }
                  className="h-4 w-4 accent-[#c49a4a]"
                />
                <span
                  className={`flex-1 text-sm ${
                    item.done
                      ? "line-through text-stone2-400/60"
                      : "text-stone2-200"
                  }`}
                >
                  {item.text}
                </span>
                <button
                  className="text-stone2-400/50 opacity-0 group-hover:opacity-100 hover:text-terra-400"
                  title="Usuń punkt"
                  aria-label="Usuń punkt checklisty"
                  onClick={() =>
                    updateTask(task.id, {
                      checklist: task.checklist.filter(
                        (c) => c.id !== item.id
                      ),
                    })
                  }
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                className="input"
                placeholder="Dodaj punkt checklisty…"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItem()}
              />
              <button
                className="btn-outline shrink-0"
                onClick={addItem}
                title="Dodaj punkt"
                aria-label="Dodaj punkt checklisty"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-ink-700 p-4">
        <button
          className="btn-primary w-full justify-center py-2.5"
          onClick={() => onComplete(task.id)}
        >
          <CheckCircle2 className="h-4 w-4" />
          Koniec zadania
        </button>
      </div>
    </aside>
  );
}
