"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import TaskItem from "../TaskItem";
import QuickAdd from "../QuickAdd";
import SortSelect, { sortTasks, type TaskSort } from "../SortSelect";

export default function InboxView({
  onOpen,
  onComplete,
}: {
  onOpen: (id: string) => void;
  onComplete: (id: string) => void;
}) {
  const allTasks = useStore((s) =>
    s.tasks.filter((t) => !t.completedAt && !t.projectId)
  );
  const [sort, setSort] = useState<TaskSort>("added");
  const tasks = sortTasks(allTasks, sort);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-3xl text-stone2-100">
            Skrzynka odbiorcza
          </h2>
          <p className="mt-1 text-sm text-stone2-400">
            Zrzuć tu wszystko, co masz w głowie — posegregujesz później. Enter
            dodaje kolejne zadanie.
          </p>
        </div>
        <SortSelect value={sort} onChange={setSort} />
      </div>
      <QuickAdd autoFocus placeholder="Wpisz zadanie i naciśnij Enter…" />
      <div className="space-y-1.5">
        {tasks.map((t) => (
          <TaskItem key={t.id} task={t} onOpen={onOpen} onComplete={onComplete} />
        ))}
        {!tasks.length && (
          <p className="pt-6 text-center text-sm text-stone2-400">
            Skrzynka pusta — umysł czysty.
          </p>
        )}
      </div>
    </div>
  );
}
