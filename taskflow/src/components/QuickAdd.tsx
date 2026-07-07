"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { todayStr } from "@/lib/dates";
import { ID } from "@/lib/types";
import { Plus } from "lucide-react";

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
  const [due, setDue] = useState<string>(defaultDue ?? "");
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

  return (
    <div className="card flex flex-wrap items-center gap-2 p-2">
      <Plus className="ml-2 h-4 w-4 shrink-0 text-bronze-400" />
      <input
        className="min-w-[180px] flex-1 bg-transparent px-1 py-1.5 text-sm text-stone2-100 placeholder:text-stone2-400/50 focus:outline-none"
        placeholder={placeholder}
        value={title}
        autoFocus={autoFocus}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
      />
      <input
        type="date"
        className="rounded-md bg-ink-900 border border-ink-600 px-2 py-1 text-xs text-stone2-300 focus:outline-none focus:border-bronze-500"
        value={due}
        min={todayStr()}
        onChange={(e) => setDue(e.target.value)}
        title="Data wykonania"
      />
      {showProject && (
        <select
          className="rounded-md bg-ink-900 border border-ink-600 px-2 py-1 text-xs text-stone2-300 focus:outline-none focus:border-bronze-500 max-w-[160px]"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
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
