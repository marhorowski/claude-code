"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { todayStr, tomorrowStr, DAY } from "@/lib/dates";
import { ID } from "@/lib/types";
import { format, addDays, startOfWeek, addWeeks, endOfWeek } from "date-fns";
import { Plus, Sun, Sunrise, CalendarDays, CalendarRange } from "lucide-react";

function thisWeekStr(): string {
  // koniec tygodnia roboczego: piątek; gdy piątek minął — niedziela
  const now = new Date();
  const friday = addDays(startOfWeek(now, { weekStartsOn: 1 }), 4);
  const target = friday >= now ? friday : endOfWeek(now, { weekStartsOn: 1 });
  return format(target, DAY);
}

function nextWeekStr(): string {
  return format(
    startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 }),
    DAY
  );
}

export default function QuickAdd({
  defaultProjectId = null,
  defaultDue = null,
  showProject = true,
  placeholder = "Dodaj zadanie… (Enter)",
  autoFocus = false,
}: {
  defaultProjectId?: ID | null;
  defaultDue?: string | null;
  showProject?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const addTask = useStore((s) => s.addTask);
  const projects = useStore((s) => s.projects);
  const [title, setTitle] = useState("");
  // w projekcie domyślnie „jutro"
  const initialDue = defaultDue ?? (defaultProjectId ? tomorrowStr() : "");
  const [due, setDue] = useState<string>(initialDue);
  const [projectId, setProjectId] = useState<string>(defaultProjectId ?? "");

  const submit = () => {
    if (!title.trim()) return;
    addTask({
      title,
      dueDate: due || null,
      projectId: (showProject ? projectId : defaultProjectId) || null,
    });
    setTitle("");
  };

  const quick: {
    label: string;
    icon: typeof Sun;
    value: string;
  }[] = [
    { label: "Dziś", icon: Sun, value: todayStr() },
    { label: "Jutro", icon: Sunrise, value: tomorrowStr() },
    { label: "Ten tydzień", icon: CalendarDays, value: thisWeekStr() },
    { label: "Następny tydzień", icon: CalendarRange, value: nextWeekStr() },
  ];

  return (
    <div className="card flex flex-wrap items-center gap-2 p-2">
      <Plus className="ml-2 h-4 w-4 shrink-0 text-bronze-400" />
      <input
        className="min-w-[160px] flex-1 bg-transparent px-1 py-1.5 text-sm text-stone2-100 placeholder:text-stone2-400/50 focus:outline-none"
        placeholder={placeholder}
        value={title}
        autoFocus={autoFocus}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
      />
      <div className="flex items-center gap-0.5" role="group" aria-label="Szybka data">
        {quick.map((q) => (
          <button
            key={q.label}
            title={q.label}
            aria-label={`Termin: ${q.label}`}
            onClick={() => setDue(due === q.value ? "" : q.value)}
            className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
              due === q.value
                ? "border-bronze-500 bg-bronze-500/15 text-bronze-300"
                : "border-transparent text-stone2-400 hover:border-ink-600 hover:text-stone2-200"
            }`}
          >
            <q.icon className="h-4 w-4" />
          </button>
        ))}
      </div>
      <input
        type="date"
        className="rounded-md bg-ink-900 border border-ink-600 px-2 py-1 text-xs text-stone2-300 focus:outline-none focus:border-bronze-500"
        value={due}
        min={todayStr()}
        onChange={(e) => setDue(e.target.value)}
        title="Dowolna data wykonania"
      />
      {showProject && (
        <select
          className="rounded-md bg-ink-900 border border-ink-600 px-2 py-1 text-xs text-stone2-300 focus:outline-none focus:border-bronze-500 max-w-[160px]"
          value={projectId}
          onChange={(e) => {
            setProjectId(e.target.value);
            // wybór projektu bez daty => domyślnie jutro
            if (e.target.value && !due) setDue(tomorrowStr());
          }}
          title="Projekt"
        >
          <option value="">Skrzynka</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}
      <button className="btn-primary" onClick={submit} disabled={!title.trim()}>
        Dodaj
      </button>
    </div>
  );
}
