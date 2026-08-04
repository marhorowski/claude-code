"use client";

import { useState } from "react";
import Modal from "./Modal";
import { useStore } from "@/lib/store";
import { todayStr, tomorrowStr, fmtHM, isToday } from "@/lib/dates";
import { generateSummary } from "@/lib/summary";
import { Sunset, Check, Moon, NotebookPen, Trophy, ArrowRight } from "lucide-react";
import JournalDayForm from "./JournalDayForm";
import {
  computeDayPoints,
  computeGoalProgress,
  rankFor,
  pointsInputFromState,
} from "@/lib/points";

/** Polska odmiana rzeczownika „zadanie". */
function plZadania(n: number): string {
  if (n === 1) return "zadanie";
  const last = n % 10;
  const last2 = n % 100;
  if (last >= 2 && last <= 4 && !(last2 >= 12 && last2 <= 14)) return "zadania";
  return "zadań";
}

export default function EndDayModal({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const settings = useStore((s) => s.settings);
  const workLog = useStore((s) => s.workLog);
  const addDaySummary = useStore((s) => s.addDaySummary);
  const updateSettings = useStore((s) => s.updateSettings);
  const updateTask = useStore((s) => s.updateTask);

  const today = todayStr();
  const totalSec = workLog[today] ?? 0;
  const completed = tasks.filter(
    (t) => t.completedAt && t.completedAt.slice(0, 10) === today
  );
  const remainingToday = tasks.filter(
    (t) => !t.completedAt && isToday(t.dueDate)
  );

  const [finalized, setFinalized] = useState(false);
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [movedCount, setMovedCount] = useState(0);

  const pInput = pointsInputFromState(store);
  const dayPts = computeDayPoints(today, pInput);
  const progress = computeGoalProgress(pInput);
  const rank = rankFor(dayPts.total, progress.goal);

  const byProject = projects
    .map((p) => ({
      name: p.name,
      color: p.color,
      count: completed.filter((t) => t.projectId === p.id).length,
    }))
    .filter((g) => g.count > 0);
  const inboxCount = completed.filter((t) => !t.projectId).length;

  /** Ostateczne zamknięcie dnia: przenieś zaległości, wygeneruj i zapisz raport. */
  const finalize = async () => {
    if (finalized) return;
    // migawka niezrobionych „na dziś" zadań przed przeniesieniem
    const toMove = remainingToday;
    setFinalized(true);
    setLoading(true);

    // niezrobione dzisiejsze zadania trafiają od razu na jutro
    const tmr = tomorrowStr();
    toMove.forEach((t) => updateTask(t.id, { dueDate: tmr }));
    setMovedCount(toMove.length);

    // zamknięcie dnia czyści fokus dnia
    updateSettings({ dayFocus: "" });

    const t = await generateSummary({
      date: today,
      totalSec,
      completed,
      remainingToday: toMove,
      projects,
      settings,
    });
    setText(t);
    setLoading(false);
    addDaySummary({
      date: today,
      totalSec,
      completedTitles: completed.map((c) => c.title),
      aiText: t,
      createdAt: new Date().toISOString(),
    });
  };

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
            {finalized
              ? `przeniesiono na jutro: ${movedCount}`
              : `zostało na dziś: ${remainingToday.length}`}
          </div>
        </div>
      </div>

      {/* Punkty zwycięstwa */}
      <div className="mt-3 card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-bronze-300" />
            <div>
              <div className="text-[11px] uppercase text-stone2-400">
                Punkty zwycięstwa
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  className={`font-display text-3xl ${
                    dayPts.total < 0 ? "text-terra-400" : "text-stone2-100"
                  }`}
                >
                  {dayPts.total}
                </span>
                <span className="text-sm text-stone2-400">
                  / {progress.goal} pkt
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase text-stone2-400">Ranga</div>
            <div className={`font-display text-xl ${rank.color}`}>
              {rank.name}
            </div>
          </div>
        </div>
        <div className="mt-2 h-2 rounded-full bg-ink-700">
          <div
            className={`h-2 rounded-full ${rank.bar}`}
            style={{
              width: `${Math.max(
                0,
                Math.min(100, (dayPts.total / progress.goal) * 100)
              )}%`,
            }}
          />
        </div>
        <div className="mt-1 text-xs text-stone2-400">
          {dayPts.total >= progress.goal
            ? "Cel dnia zdobyty. Νίκη!"
            : `Do celu brakuje ${progress.goal - dayPts.total} pkt.`}
          {!finalized && " · Uzupełnij poniższy raport = +4 pkt."}
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

      {!finalized ? (
        <>
          {/* Refleksja dnia — wypełniana przed zamknięciem dnia */}
          <div className="mt-5">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-bronze-300">
              <NotebookPen className="h-4 w-4" />
              Refleksja dnia — Journal
            </div>
            <JournalDayForm date={today} />
          </div>

          {/* Jedyna akcja: zapisz i podsumuj = ostateczne zamknięcie dnia */}
          <div className="mt-6">
            <button
              className="btn-primary w-full justify-center py-3 text-base"
              onClick={finalize}
            >
              <Sunset className="h-5 w-5" />
              Zapisz i podsumuj — zamknij dzień
            </button>
            <p className="mt-2 text-center text-xs text-stone2-400">
              Niezrobione dzisiejsze zadania przeniosę na jutro, a dzień
              trafi do Archiwum. Tej operacji nie cofniesz.
            </p>
          </div>
        </>
      ) : (
        <>
          {movedCount > 0 && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-stone2-300">
              <ArrowRight className="h-4 w-4 shrink-0 text-bronze-300" />
              Przeniesiono na jutro {movedCount} {plZadania(movedCount)}.
            </div>
          )}

          <div className="mt-4">
            <div className="label">Podsumowanie i rekomendacje</div>
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

          <div className="mt-5 flex items-center justify-between gap-2">
            <span className="text-xs text-stone2-400">
              Dzień zamknięty — zapisano w Archiwum.
            </span>
            <button
              className="btn-primary"
              onClick={onClose}
              disabled={loading}
            >
              <Moon className="h-4 w-4" />
              Dobranoc
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
