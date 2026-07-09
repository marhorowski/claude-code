"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  DAY_QUESTIONS,
  WEEK_QUESTIONS,
  localCoach,
  type JournalType,
  type JournalStats,
  type JournalQuestion,
} from "@/lib/journal";
import { todayStr, weekDates, DAY, fmtHM } from "@/lib/dates";
import { format, parseISO, startOfWeek } from "date-fns";
import { pl } from "date-fns/locale";
import {
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronRight,
  Trash2,
  NotebookPen,
} from "lucide-react";

function groupQuestions(qs: JournalQuestion[]) {
  const groups: { section: string; items: JournalQuestion[] }[] = [];
  for (const q of qs) {
    const last = groups[groups.length - 1];
    if (last && last.section === q.section) last.items.push(q);
    else groups.push({ section: q.section, items: [q] });
  }
  return groups;
}

export default function JournalView() {
  const store = useStore();
  const {
    journal,
    tasks,
    habits,
    pulseLog,
    workLog,
    settings,
    upsertJournal,
    setJournalAi,
    deleteJournal,
  } = store;

  const [type, setType] = useState<JournalType>("day");
  const today = todayStr();
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), DAY);
  const entryDate = type === "day" ? today : weekStart;

  const existing = journal.find(
    (j) => j.type === type && j.date === entryDate
  );
  const [answers, setAnswers] = useState<Record<string, string>>(
    existing?.answers ?? {}
  );
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const questions = type === "day" ? DAY_QUESTIONS : WEEK_QUESTIONS;
  const groups = useMemo(() => groupQuestions(questions), [questions]);

  const switchType = (t: JournalType) => {
    setType(t);
    const d = t === "day" ? today : weekStart;
    const e = journal.find((j) => j.type === t && j.date === d);
    setAnswers(e?.answers ?? {});
  };

  const buildStats = (): JournalStats => {
    const dates = type === "day" ? [today] : weekDates();
    const totalSec = dates.reduce((a, d) => a + (workLog[d] ?? 0), 0);
    const completed = tasks
      .filter((t) => t.completedAt && dates.includes(t.completedAt.slice(0, 10)))
      .map((t) => t.title);
    const pulses = pulseLog.filter((p) => dates.includes(p.ts.slice(0, 10)));
    const habitsDone = habits.filter((h) => {
      const sum = dates.reduce((a, d) => a + (h.log[d] ?? 0), 0);
      return sum >= h.targetCount;
    }).length;
    return {
      totalSec,
      tasksCompleted: completed,
      pulseRealize: pulses.filter((p) => p.answer === "realize").length,
      pulseWaste: pulses.filter((p) => p.answer === "waste").length,
      habitsDone,
      habitsTotal: habits.length,
      targetHoursPerDay: settings.targetHoursPerDay || 6,
    };
  };

  const save = async () => {
    setBusy(true);
    const stats = buildStats();
    const entry = upsertJournal({ type, date: entryDate, answers, aiText: "" });
    let aiText = "";
    try {
      const labeled: Record<string, string> = {};
      for (const q of questions) {
        if ((answers[q.id] ?? "").trim()) {
          labeled[`[${q.section}] ${q.text}`] = answers[q.id].trim();
        }
      }
      const res = await fetch("/api/ai-journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, date: entryDate, answers: labeled, stats }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.text) aiText = d.text as string;
      }
    } catch {
      // fallback niżej
    }
    if (!aiText) aiText = localCoach(type, answers, stats);
    setJournalAi(entry.id, aiText);
    setBusy(false);
    setExpanded(entry.id);
  };

  const history = [...journal].sort((a, b) =>
    b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt)
  );

  const entryLabel = (j: (typeof journal)[number]) =>
    j.type === "day"
      ? format(parseISO(j.date), "EEEE, d MMMM yyyy", { locale: pl })
      : `Tydzień od ${format(parseISO(j.date), "d MMMM yyyy", { locale: pl })}`;

  const questionText = (id: string) =>
    [...DAY_QUESTIONS, ...WEEK_QUESTIONS].find((q) => q.id === id)?.text ?? id;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl text-stone2-100">Journal</h2>
          <p className="mt-1 text-sm text-stone2-400">
            Szczere odpowiedzi + twarde dane = ocena bez znieczulenia.
          </p>
        </div>
        <div
          className="flex rounded-lg border border-ink-600 overflow-hidden"
          role="group"
          aria-label="Rodzaj podsumowania"
        >
          {(
            [
              ["day", "Podsumowanie dnia"],
              ["week", "Podsumowanie tygodnia"],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              className={`px-3 py-2 text-xs ${
                type === val
                  ? "bg-bronze-400 text-ink-950 font-semibold"
                  : "text-stone2-300 hover:bg-ink-700"
              }`}
              onClick={() => switchType(val)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Formularz */}
      <div className="card p-5 space-y-5">
        <div className="text-sm text-stone2-400">
          {type === "day"
            ? format(parseISO(today), "EEEE, d MMMM yyyy", { locale: pl })
            : `Tydzień od ${format(parseISO(weekStart), "d MMMM", {
                locale: pl,
              })}`}
          {existing && (
            <span className="ml-2 chip border border-ink-600 text-stone2-400">
              edytujesz istniejący wpis
            </span>
          )}
        </div>

        {groups.map((g) => (
          <section key={g.section}>
            <div className="mb-2 border-l-2 border-bronze-400 pl-2 text-xs font-semibold uppercase text-bronze-300">
              {g.section}
            </div>
            <div className="space-y-3">
              {g.items.map((q) => (
                <div key={q.id}>
                  <label className="mb-1 block text-sm text-stone2-200">
                    {q.text}
                  </label>
                  {q.hint && (
                    <div className="mb-1 text-xs text-stone2-400">{q.hint}</div>
                  )}
                  <textarea
                    className="input min-h-[52px] resize-y"
                    value={answers[q.id] ?? ""}
                    onChange={(e) =>
                      setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
          </section>
        ))}

        <div className="flex items-center justify-end gap-3">
          <span className="text-xs text-stone2-400">
            Po zapisaniu dostaniesz szczerą ocenę na tle danych z aplikacji.
          </span>
          <button className="btn-primary" onClick={save} disabled={busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Zapisz i oceń
          </button>
        </div>
      </div>

      {/* Historia */}
      {history.length > 0 && (
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 font-display text-2xl text-stone2-100">
            <NotebookPen className="h-5 w-5 text-bronze-300" />
            Wpisy
          </h3>
          {history.map((j) => {
            const isOpen = expanded === j.id;
            return (
              <div key={j.id} className="card overflow-hidden">
                <button
                  className="flex w-full items-center gap-2 px-4 py-3 text-left"
                  onClick={() => setExpanded(isOpen ? null : j.id)}
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-stone2-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-stone2-400" />
                  )}
                  <span className="flex-1 text-sm text-stone2-100">
                    {entryLabel(j)}
                  </span>
                  <span
                    className={`chip border ${
                      j.type === "day"
                        ? "border-bronze-500/50 text-bronze-300"
                        : "border-aegean-500/50 text-aegean-400"
                    }`}
                  >
                    {j.type === "day" ? "dzień" : "tydzień"}
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-ink-700 px-4 py-4 space-y-4">
                    {Object.entries(j.answers)
                      .filter(([, v]) => v.trim())
                      .map(([qid, v]) => (
                        <div key={qid}>
                          <div className="text-xs text-stone2-400">
                            {questionText(qid)}
                          </div>
                          <div className="mt-0.5 whitespace-pre-line text-sm text-stone2-200">
                            {v}
                          </div>
                        </div>
                      ))}
                    {j.aiText && (
                      <div className="rounded-lg border border-bronze-500/40 bg-bronze-500/5 p-4">
                        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase text-bronze-300">
                          <Sparkles className="h-3.5 w-3.5" />
                          Ocena trenera
                        </div>
                        <p className="whitespace-pre-line text-sm text-stone2-200">
                          {j.aiText}
                        </p>
                      </div>
                    )}
                    <div className="flex justify-end">
                      <button
                        className="btn-danger text-xs"
                        onClick={() => {
                          if (confirm("Usunąć ten wpis?")) deleteJournal(j.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Usuń wpis
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
