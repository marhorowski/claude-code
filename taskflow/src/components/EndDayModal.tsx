"use client";

import { useEffect, useState } from "react";
import Modal from "./Modal";
import { useStore } from "@/lib/store";
import { todayStr, fmtHM, isToday } from "@/lib/dates";
import { generateSummary } from "@/lib/summary";
import { Sunset, Check, Moon, NotebookPen } from "lucide-react";
import JournalDayForm from "./JournalDayForm";

export default function EndDayModal({ onClose }: { onClose: () => void }) {
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const settings = useStore((s) => s.settings);
  const workLog = useStore((s) => s.workLog);
  const addDaySummary = useStore((s) => s.addDaySummary);
  const updateSettings = useStore((s) => s.updateSettings);

  const today = todayStr();
  const totalSec = workLog[today] ?? 0;
  const completed = tasks.filter(
    (t) => t.completedAt && t.completedAt.slice(0, 10) === today
  );
  const remainingToday = tasks.filter(
    (t) => !t.completedAt && isToday(t.dueDate)
  );

  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    generateSummary({
      date: today,
      totalSec,
      completed,
      remainingToday,
      projects,
      settings,
    }).then((t) => {
      if (!alive) return;
      setText(t);
      setLoading(false);
      addDaySummary({
        date: today,
        totalSec,
        completedTitles: completed.map((c) => c.title),
        aiText: t,
        createdAt: new Date().toISOString(),
      });
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byProject = projects
    .map((p) => ({
      name: p.name,
      color: p.color,
      count: completed.filter((t) => t.projectId === p.id).length,
    }))
    .filter((g) => g.count > 0);
  const inboxCount = completed.filter((t) => !t.projectId).length;

  return (
    <Modal onClose={onClose} wide>
      <div className="text-center">
        <Sunset className="mx-auto mb-1 h-10 w-10 text-bronze-400" strokeWidth={1.5} />
        <div className="font-display text-3xl text-bronze-300">
          Koniec dnia pracy
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="card p-4 text-center">
          <div className="text-[11px] uppercase text-stone2-400">
            Przepracowane godziny
          </div>
          <div className="font-display text-3xl text-stone2-100">
            {fmtHM(totalSec)}
          </div>
          <div className="text-xs text-stone2-400">
            cel: {settings.targetHoursPerDay} h
          </div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-[11px] uppercase text-stone2-400">
            Ukończone zadania
          </div>
          <div className="font-display text-3xl text-stone2-100">
            {completed.length}
          </div>
          <div className="text-xs text-stone2-400">
            zostało na dziś: {remainingToday.length}
          </div>
        </div>
      </div>

      {completed.length > 0 && (
        <div className="mt-4">
          <div className="label">Co dziś zrobiłeś</div>
          <ul className="space-y-1 text-sm text-stone2-200">
            {completed.map((t) => (
              <li key={t.id} className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 shrink-0 text-bronze-400" />{" "}
                {t.title}
                {t.timeSpentSec > 0 && (
                  <span className="text-xs text-stone2-400">
                    ({fmtHM(t.timeSpentSec)})
                  </span>
                )}
              </li>
            ))}
          </ul>
          {(byProject.length > 0 || inboxCount > 0) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {byProject.map((g) => (
                <span
                  key={g.name}
                  className="chip border border-ink-600 bg-ink-900 text-stone2-300"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: g.color }}
                  />
                  {g.name}: {g.count}
                </span>
              ))}
              {inboxCount > 0 && (
                <span className="chip border border-ink-600 bg-ink-900 text-stone2-300">
                  Skrzynka: {inboxCount}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        <div className="label">Podsumowanie i wytyczne</div>
        <div className="rounded-lg border border-bronze-600/30 bg-ink-900 p-4 text-sm text-stone2-200 whitespace-pre-line min-h-[80px]">
          {loading ? (
            <span className="pulse-soft text-stone2-400">
              Analizuję Twój dzień…
            </span>
          ) : (
            text
          )}
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-bronze-300">
          <NotebookPen className="h-4 w-4" />
          Refleksja dnia — Journal
        </div>
        <JournalDayForm date={today} />
      </div>

      <div className="mt-5 flex items-center justify-between gap-2">
        <span className="text-xs text-stone2-400">
          Podsumowanie zapisane w Archiwum.
        </span>
        <div className="flex gap-2">
          <button
            className="btn-outline"
            onClick={() => {
              updateSettings({ dayFocus: "" });
              onClose();
            }}
            title="Czyści fokus dnia"
          >
            Zamknij i wyczyść fokus dnia
          </button>
          <button className="btn-primary" onClick={onClose}>
            <Moon className="h-4 w-4" />
            Dobranoc
          </button>
        </div>
      </div>
    </Modal>
  );
}
