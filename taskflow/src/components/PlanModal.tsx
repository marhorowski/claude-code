"use client";

import { useState } from "react";
import Modal from "./Modal";
import { useStore } from "@/lib/store";
import { computeStats, goalSeconds } from "@/lib/stats";
import { fmtHM, tomorrowStr, todayStr, isToday } from "@/lib/dates";
import { format, addDays } from "date-fns";
import { Star } from "lucide-react";

interface Row {
  title: string;
  due: string;
  projectId: string;
  focus: boolean;
}

export default function PlanModal({
  mode,
  onClose,
}: {
  mode: "day" | "week";
  onClose: () => void;
}) {
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const goals = useStore((s) => s.goals);
  const settings = useStore((s) => s.settings);
  const workLog = useStore((s) => s.workLog);
  const addTask = useStore((s) => s.addTask);
  const updateSettings = useStore((s) => s.updateSettings);

  const st = computeStats(tasks, workLog);
  const isDay = mode === "day";
  const defaultDue = isDay
    ? tomorrowStr()
    : format(addDays(new Date(), 1), "yyyy-MM-dd");

  const emptyRow = (): Row => ({
    title: "",
    due: defaultDue,
    projectId: "",
    focus: false,
  });

  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [focusText, setFocusText] = useState(
    isDay ? settings.dayFocus : settings.weekFocus
  );

  const remainingToday = tasks.filter(
    (t) => !t.completedAt && isToday(t.dueDate)
  );

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const addRowIfNeeded = (i: number) => {
    if (i === rows.length - 1 && rows[i].title.trim()) {
      setRows((r) => [...r, emptyRow()]);
    }
  };

  const save = () => {
    for (const row of rows) {
      if (!row.title.trim()) continue;
      addTask({
        title: row.title,
        dueDate: row.due || null,
        projectId: row.projectId || null,
        focusDay: isDay && row.focus,
        focusWeek: !isDay && row.focus,
      });
    }
    updateSettings(
      isDay ? { dayFocus: focusText.trim() } : { weekFocus: focusText.trim() }
    );
    onClose();
  };

  return (
    <Modal onClose={onClose} wide>
      <div className="font-display text-3xl text-bronze-300">
        {isDay ? "Ustalanie dnia" : "Ustalanie tygodnia"}
      </div>
      <p className="mt-1 text-sm text-stone2-400">
        {isDay
          ? "Usiądź na chwilę, spójrz na cele i zaplanuj jutro."
          : "Spójrz z lotu ptaka i rozplanuj nadchodzący tydzień."}
      </p>

      {/* Kontekst: cele, projekty, przepracowany czas */}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="card p-4">
          <div className="label">Twoje cele</div>
          {goals.length ? (
            <ul className="space-y-2">
              {goals.map((g) => (
                <li key={g.id} className="text-sm">
                  <span className="inline-flex items-center gap-1 text-stone2-100">
                    {g.isMain && (
                      <Star className="h-3 w-3 fill-current text-bronze-400" />
                    )}
                    {g.title}
                  </span>
                  <span className="ml-2 text-xs text-bronze-300">
                    {fmtHM(goalSeconds(g, projects, tasks))}
                  </span>
                  {g.keyResults.length > 0 && (
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {g.keyResults.map((kr) => (
                        <span
                          key={kr.id}
                          className="chip border border-ink-600 text-stone2-400"
                        >
                          {kr.text}: {kr.current}/{kr.target}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-stone2-400">Brak celów.</p>
          )}
        </div>
        <div className="card p-4 space-y-2">
          <div className="label">Stan pracy</div>
          <div className="text-sm text-stone2-200">
            Dziś: <b className="text-bronze-300">{fmtHM(st.todaySec)}</b> ·
            zadania {st.todayDone}/{st.todayTotal}
          </div>
          <div className="text-sm text-stone2-200">
            Ten tydzień: <b className="text-bronze-300">{fmtHM(st.weekSec)}</b>{" "}
            · zadania {st.weekDone}/{st.weekTotal}
          </div>
          {remainingToday.length > 0 && (
            <div className="text-xs text-stone2-400">
              Niedokończone dziś:{" "}
              {remainingToday.map((t) => t.title).join(", ")}
            </div>
          )}
          <div className="text-xs text-stone2-400">
            Projekty: {projects.map((p) => p.name).join(", ") || "brak"}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <label className="label">
          {isDay ? "Fokus dnia (jutro)" : "Fokus tygodnia"}
        </label>
        <input
          className="input"
          placeholder={
            isDay
              ? "Jedna najważniejsza rzecz na jutro…"
              : "Jedna najważniejsza rzecz w tym tygodniu…"
          }
          value={focusText}
          onChange={(e) => setFocusText(e.target.value)}
        />
      </div>

      <div className="mt-4">
        <label className="label">
          Brain dump — zadania {isDay ? "na jutro" : "na tydzień"}
        </label>
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <input
                className="input flex-1 min-w-[180px]"
                placeholder={`Zadanie ${i + 1}…`}
                value={row.title}
                autoFocus={i === 0}
                onChange={(e) => setRow(i, { title: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addRowIfNeeded(i);
                }}
                onBlur={() => addRowIfNeeded(i)}
              />
              <input
                type="date"
                min={todayStr()}
                className="rounded-md bg-ink-900 border border-ink-600 px-2 py-2 text-xs text-stone2-300"
                value={row.due}
                onChange={(e) => setRow(i, { due: e.target.value })}
              />
              <select
                className="rounded-md bg-ink-900 border border-ink-600 px-2 py-2 text-xs text-stone2-300 max-w-[140px]"
                value={row.projectId}
                onChange={(e) => setRow(i, { projectId: e.target.value })}
              >
                <option value="">Skrzynka</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                className={`chip border px-2.5 py-1.5 ${
                  row.focus
                    ? isDay
                      ? "border-terra-500 bg-terra-600/20 text-terra-400"
                      : "border-bronze-400 bg-bronze-500/15 text-bronze-300"
                    : "border-ink-600 text-stone2-400"
                }`}
                onClick={() => setRow(i, { focus: !row.focus })}
                title={
                  isDay ? "Oznacz jako fokus dnia" : "Oznacz jako fokus tygodnia"
                }
                aria-label="Fokus"
              >
                <Star
                  className={`h-3.5 w-3.5 ${row.focus ? "fill-current" : ""}`}
                />
              </button>
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-stone2-400">
          Enter po wpisaniu tytułu dodaje kolejny wiersz. Gwiazdka oznacza
          zadanie jako{" "}
          {isDay ? "fokus dnia (czerwone podświetlenie)" : "fokus tygodnia"}.
        </p>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>
          Anuluj
        </button>
        <button className="btn-primary" onClick={save}>
          Zapisz plan ({rows.filter((r) => r.title.trim()).length} zadań)
        </button>
      </div>
    </Modal>
  );
}
