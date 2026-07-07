"use client";

import { useStore } from "@/lib/store";
import { fmtHM } from "@/lib/dates";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";

const ON_TIME_LABEL: Record<string, string> = {
  faster: "⚡ szybciej niż plan",
  onTime: "✓ zgodnie z planem",
  slower: "🐌 dłużej niż plan",
};

export default function ArchiveView() {
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const restoreTask = useStore((s) => s.restoreTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const summaries = useStore((s) => s.daySummaries);

  const done = tasks
    .filter((t) => t.completedAt)
    .sort((a, b) => (b.completedAt! < a.completedAt! ? -1 : 1));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-3xl text-stone2-100">Archiwum</h2>
        <p className="mt-1 text-sm text-stone2-400">
          Ukończone zadania i podsumowania dni pracy.
        </p>
      </div>

      <section className="space-y-1.5">
        {done.map((t) => {
          const p = projects.find((x) => x.id === t.projectId);
          return (
            <div
              key={t.id}
              className="group card px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-bronze-400">✓</span>
                <span className="flex-1 text-sm text-stone2-200">
                  {t.title}
                </span>
                <button
                  className="btn-ghost text-xs opacity-0 group-hover:opacity-100"
                  onClick={() => restoreTask(t.id)}
                >
                  Przywróć
                </button>
                <button
                  className="btn-danger text-xs opacity-0 group-hover:opacity-100"
                  onClick={() => deleteTask(t.id)}
                >
                  Usuń
                </button>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-stone2-400">
                <span>
                  {format(parseISO(t.completedAt!), "d MMM yyyy, HH:mm", {
                    locale: pl,
                  })}
                </span>
                {p && <span>{p.name}</span>}
                {t.timeSpentSec > 0 && <span>⏱ {fmtHM(t.timeSpentSec)}</span>}
                {t.onTime && <span>{ON_TIME_LABEL[t.onTime]}</span>}
              </div>
              {t.completionNote && (
                <div className="mt-1.5 rounded-md bg-ink-900 px-3 py-2 text-xs text-stone2-300 italic">
                  „{t.completionNote}"
                </div>
              )}
            </div>
          );
        })}
        {!done.length && (
          <p className="text-sm text-stone2-400">
            Archiwum jest jeszcze puste.
          </p>
        )}
      </section>

      {summaries.length > 0 && (
        <section>
          <h3 className="mb-3 font-display text-2xl text-stone2-100">
            Podsumowania dni
          </h3>
          <div className="space-y-3">
            {summaries.map((s) => (
              <div key={s.date} className="card p-4">
                <div className="flex items-center justify-between">
                  <span className="font-display text-lg text-bronze-300">
                    {format(parseISO(s.date), "EEEE, d MMMM yyyy", {
                      locale: pl,
                    })}
                  </span>
                  <span className="text-xs text-stone2-400">
                    {fmtHM(s.totalSec)} · {s.completedTitles.length} zadań
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-stone2-300">
                  {s.aiText}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
