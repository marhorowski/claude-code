"use client";

import { Task } from "@/lib/types";
import { ArrowUpDown } from "lucide-react";

export type TaskSort = "added" | "due" | "alpha";

export function sortTasks(tasks: Task[], sort: TaskSort): Task[] {
  const list = [...tasks];
  switch (sort) {
    case "due":
      return list.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
    case "alpha":
      return list.sort((a, b) => a.title.localeCompare(b.title, "pl"));
    default:
      return list; // kolejność dodania
  }
}

export default function SortSelect({
  value,
  onChange,
}: {
  value: TaskSort;
  onChange: (v: TaskSort) => void;
}) {
  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-stone2-400">
      <ArrowUpDown className="h-3.5 w-3.5" />
      <select
        className="rounded-md bg-ink-900 border border-ink-600 px-2 py-1 text-xs text-stone2-300 focus:outline-none focus:border-bronze-500"
        value={value}
        onChange={(e) => onChange(e.target.value as TaskSort)}
        title="Sortowanie zadań"
      >
        <option value="added">Kolejność dodania</option>
        <option value="due">Termin</option>
        <option value="alpha">Alfabetycznie</option>
      </select>
    </label>
  );
}
