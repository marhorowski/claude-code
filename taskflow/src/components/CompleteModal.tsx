"use client";

import { useState } from "react";
import Modal from "./Modal";
import { useStore } from "@/lib/store";
import { OnTime } from "@/lib/types";
import { fmtHM } from "@/lib/dates";

const PRAISE = [
  "Νίκη! Kolejne zadanie za Tobą.",
  "Świetna robota — kamień na szczyt wtoczony.",
  "Brawo! Jeszcze jeden krok bliżej celu.",
  "Zadanie domknięte. Tak buduje się imperium.",
];

export default function CompleteModal({
  taskId,
  onClose,
}: {
  taskId: string;
  onClose: () => void;
}) {
  const task = useStore((s) => s.tasks.find((t) => t.id === taskId));
  const completeTask = useStore((s) => s.completeTask);
  const [note, setNote] = useState("");
  const [onTime, setOnTime] = useState<OnTime | null>(null);
  const [recur, setRecur] = useState<boolean | null>(null);
  const [praise] = useState(
    () => PRAISE[Math.floor(Math.random() * PRAISE.length)]
  );

  if (!task) return null;

  const estimateSec = task.estimateMin ? task.estimateMin * 60 : null;
  const autoOnTime: OnTime | null = estimateSec
    ? task.timeSpentSec <= estimateSec * 0.85
      ? "faster"
      : task.timeSpentSec <= estimateSec * 1.15
      ? "onTime"
      : "slower"
    : null;

  const finish = () => {
    completeTask(taskId, note.trim(), onTime ?? autoOnTime, recur === true);
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <div className="text-center">
        <div className="mx-auto mb-2 text-5xl">🏆</div>
        <div className="font-display text-3xl text-bronze-300">
          Gratulacje!
        </div>
        <p className="mt-1 text-sm text-stone2-400">{praise}</p>
        <div className="mt-3 rounded-lg bg-ink-900 border border-ink-700 px-4 py-3 text-left">
          <div className="text-sm text-stone2-100">{task.title}</div>
          <div className="mt-0.5 text-xs text-stone2-400">
            czas pracy: {fmtHM(task.timeSpentSec)}
            {task.estimateMin ? ` · estymacja: ${task.estimateMin} min` : ""}
            {autoOnTime === "faster" && " · ⚡ szybciej niż plan!"}
            {autoOnTime === "slower" && " · dłużej niż plan"}
            {autoOnTime === "onTime" && " · ✓ w punkt"}
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-4 text-left">
        <div>
          <label className="label">Wnioski z wykonania (opcjonalne)</label>
          <textarea
            className="input min-h-[70px]"
            placeholder="Co poszło dobrze? Co następnym razem zrobić inaczej?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <label className="label">Czy poszło w zakładanym czasie?</label>
          <div className="flex gap-2">
            {(
              [
                ["faster", "⚡ Szybciej"],
                ["onTime", "✓ Zgodnie z planem"],
                ["slower", "🐌 Dłużej"],
              ] as [OnTime, string][]
            ).map(([val, label]) => (
              <button
                key={val}
                className={`chip border px-3 py-1.5 ${
                  (onTime ?? autoOnTime) === val
                    ? "border-bronze-400 bg-bronze-500/15 text-bronze-300"
                    : "border-ink-600 text-stone2-400 hover:border-bronze-500"
                }`}
                onClick={() => setOnTime(val)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">
            Czy to zadanie będziesz wykonywać częściej?
          </label>
          <div className="flex gap-2">
            <button
              className={`chip border px-3 py-1.5 ${
                recur === true
                  ? "border-olive-400 bg-olive-500/15 text-olive-400"
                  : "border-ink-600 text-stone2-400 hover:border-olive-400"
              }`}
              onClick={() => setRecur(true)}
            >
              Tak — stwórz z tego proces
            </button>
            <button
              className={`chip border px-3 py-1.5 ${
                recur === false
                  ? "border-ink-500 bg-ink-700 text-stone2-200"
                  : "border-ink-600 text-stone2-400 hover:border-ink-500"
              }`}
              onClick={() => setRecur(false)}
            >
              Nie
            </button>
          </div>
          {recur === true && (
            <p className="mt-1.5 text-xs text-olive-400">
              Jutro w projekcie „Procesy do stworzenia" pojawi się zadanie
              „Stwórz proces: {task.title}".
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button className="btn-ghost" onClick={onClose}>
            Anuluj
          </button>
          <button className="btn-primary" onClick={finish}>
            🌿 Do archiwum
          </button>
        </div>
      </div>
    </Modal>
  );
}
