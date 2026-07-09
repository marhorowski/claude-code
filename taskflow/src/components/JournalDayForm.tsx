"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import {
  DAY_QUESTIONS,
  buildStatsForDates,
  coachVerdict,
} from "@/lib/journal";
import { Sparkles, Loader2 } from "lucide-react";

/**
 * Kompaktowy formularz podsumowania dnia (pytania Journala) —
 * używany w oknie „Zakończ dzień pracy”.
 */
export default function JournalDayForm({ date }: { date: string }) {
  const store = useStore();
  const existing = store.journal.find(
    (j) => j.type === "day" && j.date === date
  );
  const [answers, setAnswers] = useState<Record<string, string>>(
    existing?.answers ?? {}
  );
  const [busy, setBusy] = useState(false);
  const [verdict, setVerdict] = useState<string>(existing?.aiText ?? "");

  const save = async () => {
    setBusy(true);
    const stats = buildStatsForDates([date], store);
    const entry = store.upsertJournal({
      type: "day",
      date,
      answers,
      aiText: "",
    });
    const text = await coachVerdict("day", date, answers, stats);
    store.setJournalAi(entry.id, text);
    setVerdict(text);
    setBusy(false);
  };

  let lastSection = "";

  return (
    <div className="space-y-3">
      {DAY_QUESTIONS.map((q) => {
        const showSection = q.section !== lastSection;
        lastSection = q.section;
        return (
          <div key={q.id}>
            {showSection && (
              <div className="mb-1.5 mt-2 border-l-2 border-bronze-400 pl-2 text-[11px] font-semibold uppercase text-bronze-300">
                {q.section}
              </div>
            )}
            <label className="mb-1 block text-sm text-stone2-200">
              {q.text}
            </label>
            {q.hint && (
              <div className="mb-1 text-xs text-stone2-400">{q.hint}</div>
            )}
            <textarea
              className="input min-h-[44px] resize-y"
              value={answers[q.id] ?? ""}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
              }
            />
          </div>
        );
      })}

      <div className="flex justify-end">
        <button className="btn-primary" onClick={save} disabled={busy}>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Zapisz w Journalu i oceń
        </button>
      </div>

      {verdict && (
        <div className="rounded-lg border border-bronze-500/40 bg-bronze-500/5 p-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase text-bronze-300">
            <Sparkles className="h-3.5 w-3.5" />
            Ocena trenera
          </div>
          <p className="whitespace-pre-line text-sm text-stone2-200">
            {verdict}
          </p>
        </div>
      )}
    </div>
  );
}
