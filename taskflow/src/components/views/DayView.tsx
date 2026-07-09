"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { todayStr, fmtHM, DAY } from "@/lib/dates";
import { format, parseISO, addDays } from "date-fns";
import { pl } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  CircleSlash,
  Timer,
  CheckCircle2,
} from "lucide-react";

const HOUR_PX = 64;

export default function DayView() {
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const sessions = useStore((s) => s.workSessions);
  const pulseLog = useStore((s) => s.pulseLog);
  const workLog = useStore((s) => s.workLog);
  const [date, setDate] = useState(todayStr());

  const daySessions = sessions.filter((s) => s.start.slice(0, 10) === date);
  const dayPulses = pulseLog.filter((p) => p.ts.slice(0, 10) === date);
  const completed = tasks.filter(
    (t) => t.completedAt && t.completedAt.slice(0, 10) === date
  );

  const realize = dayPulses.filter((p) => p.answer === "realize").length;
  const waste = dayPulses.filter((p) => p.answer === "waste").length;
  const pct =
    realize + waste > 0 ? Math.round((realize / (realize + waste)) * 100) : null;

  // zakres godzin osi: obejmij wszystkie zdarzenia, domyślnie 7–19
  let fromH = 7;
  let toH = 19;
  for (const s of daySessions) {
    fromH = Math.min(fromH, parseISO(s.start).getHours());
    toH = Math.max(toH, parseISO(s.end).getHours() + 1);
  }
  for (const p of dayPulses) {
    fromH = Math.min(fromH, parseISO(p.ts).getHours());
    toH = Math.max(toH, parseISO(p.ts).getHours() + 1);
  }
  toH = Math.min(24, Math.max(toH, fromH + 6));
  const totalMin = (toH - fromH) * 60;

  const yFor = (iso: string) => {
    const d = parseISO(iso);
    const min = (d.getHours() - fromH) * 60 + d.getMinutes() + d.getSeconds() / 60;
    return Math.max(0, (min / totalMin) * (toH - fromH) * HOUR_PX);
  };

  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const projectById = new Map(projects.map((p) => [p.id, p]));

  const shift = (days: number) =>
    setDate(format(addDays(parseISO(date), days), DAY));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-3xl text-stone2-100">Dziennik</h2>
          <p className="mt-1 text-sm text-stone2-400">
            Oś dnia — nad czym pracowałeś i co pokazywał puls potencjału.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="btn-ghost px-2"
            onClick={() => shift(-1)}
            title="Poprzedni dzień"
            aria-label="Poprzedni dzień"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <input
            type="date"
            className="rounded-md bg-ink-900 border border-ink-600 px-2 py-1.5 text-sm text-stone2-200"
            value={date}
            max={todayStr()}
            onChange={(e) => setDate(e.target.value || todayStr())}
          />
          <button
            className="btn-ghost px-2"
            onClick={() => shift(1)}
            disabled={date >= todayStr()}
            title="Następny dzień"
            aria-label="Następny dzień"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card px-4 py-3">
          <div className="text-[11px] uppercase text-stone2-400">
            Czas pracy
          </div>
          <div className="font-display text-2xl text-stone2-100">
            {fmtHM(workLog[date] ?? 0)}
          </div>
        </div>
        <div className="card px-4 py-3">
          <div className="text-[11px] uppercase text-stone2-400">
            Ukończone zadania
          </div>
          <div className="font-display text-2xl text-stone2-100">
            {completed.length}
          </div>
        </div>
        <div className="card px-4 py-3">
          <div className="text-[11px] uppercase text-stone2-400">
            Puls — realizuję
          </div>
          <div className="font-display text-2xl text-olive-400">{realize}</div>
        </div>
        <div className="card px-4 py-3">
          <div className="text-[11px] uppercase text-stone2-400">
            Puls — marnuję
          </div>
          <div className="font-display text-2xl text-terra-400">{waste}</div>
        </div>
      </div>

      {pct !== null && (
        <div className="card px-4 py-3">
          <div className="flex justify-between text-xs text-stone2-400">
            <span>Realizacja potencjału ({format(parseISO(date + "T00:00:00"), "d MMMM", { locale: pl })})</span>
            <span className={pct >= 50 ? "text-olive-400" : "text-terra-400"}>
              {pct}%
            </span>
          </div>
          <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-ink-700">
            <div
              className="bg-olive-400"
              style={{ width: `${pct}%` }}
            />
            <div className="bg-terra-500" style={{ width: `${100 - pct}%` }} />
          </div>
        </div>
      )}

      {/* Oś dnia */}
      <div className="card p-4">
        <div className="relative" style={{ height: (toH - fromH) * HOUR_PX }}>
          {/* linie godzin */}
          {Array.from({ length: toH - fromH + 1 }, (_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 border-t border-ink-700"
              style={{ top: i * HOUR_PX }}
            >
              <span className="absolute -top-2.5 left-0 w-12 text-xs tabular-nums text-stone2-400">
                {String(fromH + i).padStart(2, "0")}:00
              </span>
            </div>
          ))}

          {/* bloki sesji pracy */}
          <div className="absolute left-14 right-14 top-0 bottom-0">
            {daySessions.map((s) => {
              const task = taskById.get(s.taskId);
              const project = task?.projectId
                ? projectById.get(task.projectId)
                : null;
              const top = yFor(s.start);
              const height = Math.max(16, yFor(s.end) - top);
              const durMin = Math.round(
                (Date.parse(s.end) - Date.parse(s.start)) / 60000
              );
              return (
                <div
                  key={s.id}
                  className="absolute left-0 right-0 overflow-hidden rounded-md border border-ink-600 bg-ink-800 px-2 py-0.5"
                  style={{
                    top,
                    height,
                    borderLeft: `3px solid ${project?.color ?? "#c49a4a"}`,
                  }}
                  title={`${task?.title ?? "Zadanie"} · ${
                    durMin < 1 ? "<1" : durMin
                  } min (${format(parseISO(s.start), "HH:mm")}–${format(
                    parseISO(s.end),
                    "HH:mm"
                  )})`}
                >
                  <div className="truncate text-xs text-stone2-100">
                    {task?.title ?? "Usunięte zadanie"}
                  </div>
                  {height > 34 && (
                    <div className="flex items-center gap-1 text-[10px] text-stone2-400">
                      <Timer className="h-2.5 w-2.5" />
                      {durMin < 1 ? "<1" : durMin} min
                      {project ? ` · ${project.name}` : ""}
                    </div>
                  )}
                </div>
              );
            })}
            {!daySessions.length && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-stone2-400">
                Brak sesji pracy tego dnia — uruchom Pomodoro na zadaniu.
              </div>
            )}
          </div>

          {/* znaczniki pulsu */}
          <div className="absolute right-0 top-0 bottom-0 w-12">
            {dayPulses.map((p, i) => (
              <div
                key={i}
                className="absolute right-0 flex items-center gap-1"
                style={{ top: yFor(p.ts) - 8 }}
                title={`${format(parseISO(p.ts), "HH:mm")} — ${
                  p.answer === "realize" ? "Realizuję" : "Marnuję"
                }`}
              >
                {p.answer === "realize" ? (
                  <Flame className="h-4 w-4 text-olive-400" />
                ) : (
                  <CircleSlash className="h-4 w-4 text-terra-400" />
                )}
              </div>
            ))}
          </div>

          {/* zakończone zadania na osi */}
          <div className="absolute left-0 top-0 bottom-0 w-12">
            {completed.map((t) => (
              <div
                key={t.id}
                className="absolute left-8"
                style={{ top: yFor(t.completedAt!) - 8 }}
                title={`${format(parseISO(t.completedAt!), "HH:mm")} — ukończono: ${
                  t.title
                }`}
              >
                <CheckCircle2 className="h-4 w-4 text-bronze-300" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
