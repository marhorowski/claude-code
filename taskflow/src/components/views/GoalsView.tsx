"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { goalSeconds } from "@/lib/stats";
import { fmtHM } from "@/lib/dates";
import { Goal } from "@/lib/types";
import { Star, Trash2, X, Plus } from "lucide-react";

function GoalCard({ goal }: { goal: Goal }) {
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  const updateGoal = useStore((s) => s.updateGoal);
  const deleteGoal = useStore((s) => s.deleteGoal);
  const addKeyResult = useStore((s) => s.addKeyResult);
  const updateKeyResult = useStore((s) => s.updateKeyResult);
  const deleteKeyResult = useStore((s) => s.deleteKeyResult);
  const [krText, setKrText] = useState("");
  const [krTarget, setKrTarget] = useState("");
  const [krUnit, setKrUnit] = useState("");

  const linked = projects.filter((p) => p.goalId === goal.id);
  const sec = goalSeconds(goal, projects, tasks);

  const addKr = () => {
    if (!krText.trim() || !krTarget) return;
    addKeyResult(goal.id, {
      text: krText.trim(),
      target: Number(krTarget),
      current: 0,
      unit: krUnit.trim(),
    });
    setKrText("");
    setKrTarget("");
    setKrUnit("");
  };

  return (
    <div className="card overflow-hidden">
      {goal.isMain && <div className="meander" />}
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <input
              className="w-full bg-transparent font-display text-2xl text-stone2-100 focus:outline-none"
              value={goal.title}
              onChange={(e) => updateGoal(goal.id, { title: e.target.value })}
            />
            <input
              className="mt-1 w-full bg-transparent text-sm text-stone2-400 focus:outline-none"
              placeholder="Dlaczego ten cel jest ważny? (pokazywane w banerze)"
              value={goal.why}
              onChange={(e) => updateGoal(goal.id, { why: e.target.value })}
            />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              className={`chip border ${
                goal.isMain
                  ? "border-bronze-400 bg-bronze-500/15 text-bronze-300"
                  : "border-ink-600 text-stone2-400 hover:border-bronze-400"
              }`}
              onClick={() => updateGoal(goal.id, { isMain: !goal.isMain })}
              title="Cel główny jest pokazywany w banerze na górze"
            >
              <Star
                className={`h-3 w-3 ${goal.isMain ? "fill-current" : ""}`}
              />
              {goal.isMain ? "główny" : "ustaw jako główny"}
            </button>
            <button
              className="btn-danger text-xs"
              title="Usuń cel"
              aria-label="Usuń cel"
              onClick={() => {
                if (confirm("Usunąć cel?")) deleteGoal(goal.id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <div className="text-[11px] uppercase text-stone2-400">
              Czas na realizację
            </div>
            <div className="font-display text-xl text-bronze-300">
              {fmtHM(sec)}
            </div>
          </div>
          <div className="min-w-[200px]">
            <div className="text-[11px] uppercase text-stone2-400">
              Powiązane projekty
            </div>
            {linked.length ? (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {linked.map((p) => (
                  <span
                    key={p.id}
                    className="chip border border-ink-600 bg-ink-900 text-stone2-300"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: p.color }}
                    />
                    {p.name}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-xs text-stone2-400">
                Powiąż projekt z celem w widoku projektu.
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="label">Mierniki (żeby osiągnąć cel, potrzebuję…)</div>
          <div className="space-y-2">
            {goal.keyResults.map((kr) => {
              const pct = kr.target
                ? Math.min(100, Math.round((kr.current / kr.target) * 100))
                : 0;
              return (
                <div key={kr.id} className="group">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="flex-1 text-stone2-200">{kr.text}</span>
                    <input
                      type="number"
                      className="w-20 rounded-md bg-ink-900 border border-ink-600 px-2 py-0.5 text-right text-xs"
                      value={kr.current}
                      onChange={(e) =>
                        updateKeyResult(goal.id, kr.id, {
                          current: Number(e.target.value),
                        })
                      }
                    />
                    <span className="text-xs text-stone2-400 w-20">
                      / {kr.target} {kr.unit}
                    </span>
                    <button
                      className="text-stone2-400/50 opacity-0 group-hover:opacity-100 hover:text-terra-400"
                      title="Usuń miernik"
                      aria-label="Usuń miernik"
                      onClick={() => deleteKeyResult(goal.id, kr.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-ink-700">
                    <div
                      className="h-1.5 rounded-full bg-bronze-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="flex flex-wrap gap-2">
              <input
                className="input flex-1 min-w-[160px]"
                placeholder="np. Rozmowy sprzedażowe"
                value={krText}
                onChange={(e) => setKrText(e.target.value)}
              />
              <input
                className="input w-24"
                type="number"
                placeholder="cel"
                value={krTarget}
                onChange={(e) => setKrTarget(e.target.value)}
              />
              <input
                className="input w-24"
                placeholder="jedn."
                value={krUnit}
                onChange={(e) => setKrUnit(e.target.value)}
              />
              <button
                className="btn-outline"
                onClick={addKr}
                title="Dodaj miernik"
                aria-label="Dodaj miernik"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GoalsView() {
  const goals = useStore((s) => s.goals);
  const addGoal = useStore((s) => s.addGoal);
  const [title, setTitle] = useState("");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-3xl text-stone2-100">Cele</h2>
        <p className="mt-1 text-sm text-stone2-400">
          Zdefiniuj cel, rozbij go na mierzalne kroki, powiąż z projektami — a
          aplikacja pokaże Ci, ile czasu realnie wkładasz w jego realizację.
        </p>
      </div>
      <div className="card flex items-center gap-2 p-2">
        <Plus className="ml-2 h-4 w-4 shrink-0 text-bronze-400" />
        <input
          className="flex-1 bg-transparent px-1 py-1.5 text-sm text-stone2-100 placeholder:text-stone2-400/50 focus:outline-none"
          placeholder="np. Zarabiać 50 000 zł miesięcznie z agencji…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && title.trim()) {
              addGoal(title, "", goals.length === 0);
              setTitle("");
            }
          }}
        />
        <button
          className="btn-primary"
          disabled={!title.trim()}
          onClick={() => {
            addGoal(title, "", goals.length === 0);
            setTitle("");
          }}
        >
          Dodaj cel
        </button>
      </div>
      <div className="space-y-4">
        {goals.map((g) => (
          <GoalCard key={g.id} goal={g} />
        ))}
      </div>
    </div>
  );
}
