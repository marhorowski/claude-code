"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { fmtClock } from "@/lib/dates";
import { Play, Pause, SkipForward, Square } from "lucide-react";

/** Silnik + pasek aktywnego timera Pomodoro (widoczny globalnie). */
export default function TimerWidget({
  onOpenTask,
}: {
  onOpenTask: (id: string) => void;
}) {
  const timer = useStore((s) => s.timer);
  const task = useStore((s) => s.tasks.find((t) => t.id === s.timer.taskId));
  const tick = useStore((s) => s.tick);
  const pauseTimer = useStore((s) => s.pauseTimer);
  const resumeTimer = useStore((s) => s.resumeTimer);
  const stopTimer = useStore((s) => s.stopTimer);
  const skipPhase = useStore((s) => s.skipPhase);

  useEffect(() => {
    const id = setInterval(() => tick(), 1000);
    return () => clearInterval(id);
  }, [tick]);

  useEffect(() => {
    if (
      timer.running &&
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission();
    }
  }, [timer.running]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (timer.taskId && task) {
      document.title = `${fmtClock(timer.remainingSec)} ${
        timer.phase === "work" ? "▶" : "☕"
      } ${task.title} — Ergon`;
    } else {
      document.title = "Ergon — zarządzanie zadaniami";
    }
  }, [timer.remainingSec, timer.taskId, timer.phase, task]);

  if (!timer.taskId || !task) return null;

  const phaseLabel =
    timer.phase === "work"
      ? "Praca"
      : timer.phase === "break"
      ? "Przerwa"
      : "Długa przerwa";

  return (
    <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 w-[calc(100%-2rem)] max-w-xl">
      <div className="card flex items-center gap-3 px-4 py-2.5">
        <span
          className={`h-2.5 w-2.5 rounded-full shrink-0 ${
            timer.phase === "work" ? "bg-terra-500" : "bg-jade-400"
          } ${timer.running ? "pulse-soft" : ""}`}
        />
        <button
          className="min-w-0 flex-1 text-left"
          onClick={() => onOpenTask(task.id)}
        >
          <div className="truncate text-sm text-stone2-100">{task.title}</div>
          <div className="text-xs text-stone2-400">
            {phaseLabel} · sesja {timer.sessionsDone + (timer.phase === "work" ? 1 : 0)}
          </div>
        </button>
        <span className="font-display text-2xl tabular-nums text-bronze-300">
          {fmtClock(timer.remainingSec)}
        </span>
        <button
          className="btn-outline px-2.5"
          onClick={() => (timer.running ? pauseTimer() : resumeTimer())}
          title={timer.running ? "Pauza" : "Wznów"}
          aria-label={timer.running ? "Pauza" : "Wznów"}
        >
          {timer.running ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </button>
        <button
          className="btn-ghost px-2"
          onClick={skipPhase}
          title="Pomiń fazę"
          aria-label="Pomiń fazę"
        >
          <SkipForward className="h-4 w-4" />
        </button>
        <button
          className="btn-ghost px-2"
          onClick={stopTimer}
          title="Zatrzymaj timer"
          aria-label="Zatrzymaj timer"
        >
          <Square className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
