"use client";

import { useRef, useState } from "react";
import Modal from "./Modal";
import { useStore } from "@/lib/store";
import { todayStr, tomorrowStr, DAY, humanDate } from "@/lib/dates";
import { format, addDays } from "date-fns";
import {
  Mic,
  MicOff,
  Sparkles,
  Loader2,
  Trash2,
  Plus,
  Brain,
} from "lucide-react";

interface Extracted {
  title: string;
  dueDate: string | null;
  estimateMin: number | null;
  projectId: string;
}

function offsetToDate(offset: number | null): string | null {
  if (offset === null || offset === undefined) return null;
  if (offset <= 0) return todayStr();
  if (offset === 1) return tomorrowStr();
  return format(addDays(new Date(), offset), DAY);
}

type SR = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: unknown) => void) | null;
  onend: (() => void) | null;
};

export default function BrainDumpModal({ onClose }: { onClose: () => void }) {
  const projects = useStore((s) => s.projects);
  const addTasksBulk = useStore((s) => s.addTasksBulk);

  const [text, setText] = useState("");
  const [rows, setRows] = useState<Extracted[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SR | null>(null);
  const baseTextRef = useRef("");

  const speechAvailable =
    typeof window !== "undefined" &&
    !!(
      (window as unknown as { SpeechRecognition?: unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown })
        .webkitSpeechRecognition
    );

  const toggleDictation = () => {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const Ctor =
      (window as unknown as { SpeechRecognition?: new () => SR })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SR })
        .webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "pl-PL";
    rec.continuous = true;
    rec.interimResults = true;
    baseTextRef.current = text ? text + " " : "";
    rec.onresult = (e: unknown) => {
      const ev = e as {
        resultIndex: number;
        results: { 0: { transcript: string }; isFinal: boolean; length: number }[];
      };
      let str = "";
      for (let i = 0; i < ev.results.length; i++) {
        str += ev.results[i][0].transcript;
      }
      setText(baseTextRef.current + str);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const extract = async () => {
    if (!text.trim()) return;
    setBusy(true);
    if (listening) {
      recRef.current?.stop();
      setListening(false);
    }
    try {
      const res = await fetch("/api/ai-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      const extracted: Extracted[] = (data.tasks ?? []).map(
        (t: { title: string; dueOffset: number | null; estimateMin: number | null }) => ({
          title: t.title,
          dueDate: offsetToDate(t.dueOffset ?? null),
          estimateMin: t.estimateMin ?? null,
          projectId: "",
        })
      );
      setRows(extracted);
    } catch {
      setRows([]);
    } finally {
      setBusy(false);
    }
  };

  const addAll = () => {
    if (!rows) return;
    addTasksBulk(
      rows
        .filter((r) => r.title.trim())
        .map((r) => ({
          title: r.title,
          dueDate: r.dueDate,
          estimateMin: r.estimateMin,
          projectId: r.projectId || null,
        }))
    );
    onClose();
  };

  const setRow = (i: number, patch: Partial<Extracted>) =>
    setRows((rs) => rs!.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <Modal onClose={onClose} wide>
      <div className="flex items-center gap-2">
        <Brain className="h-6 w-6 text-bronze-300" />
        <div>
          <div className="font-display text-2xl text-stone2-100">
            Brain dump
          </div>
          <div className="text-xs text-stone2-400">
            Dyktuj albo wklej transkrypcję — wyłuskam z tego zadania z terminami
            i czasem.
          </div>
        </div>
      </div>

      {!rows ? (
        <div className="mt-4 space-y-3">
          <div className="relative">
            <textarea
              className="input min-h-[180px] resize-y pr-12"
              placeholder="Mów lub wklej tekst… np. „Jutro muszę zadzwonić do księgowej, to jakieś 15 minut. W tym tygodniu przygotować ofertę dla klienta X. Dziś odpisać na maile."
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoFocus
            />
            {speechAvailable && (
              <button
                className={`absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                  listening
                    ? "border-terra-500 bg-terra-600/20 text-terra-400 pulse-soft"
                    : "border-ink-600 text-stone2-300 hover:border-bronze-400 hover:text-bronze-300"
                }`}
                onClick={toggleDictation}
                title={listening ? "Zatrzymaj dyktowanie" : "Dyktuj głosem"}
                aria-label="Dyktowanie"
              >
                {listening ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
          {!speechAvailable && (
            <p className="text-xs text-stone2-400">
              Dyktowanie głosem nie jest wspierane w tej przeglądarce — wklej
              tekst ręcznie. (Działa w Chrome na Androidzie i desktopie.)
            </p>
          )}
          <div className="flex justify-end">
            <button
              className="btn-primary"
              onClick={extract}
              disabled={busy || !text.trim()}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Wyodrębnij zadania
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.length === 0 ? (
            <p className="text-sm text-stone2-400">
              Nie udało się wyodrębnić zadań. Wróć i doprecyzuj tekst.
            </p>
          ) : (
            <>
              <div className="text-xs text-stone2-400">
                Znaleziono {rows.length}{" "}
                {rows.length === 1 ? "zadanie" : "zadań"}. Popraw, co trzeba,
                i dodaj.
              </div>
              <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
                {rows.map((r, i) => (
                  <div
                    key={i}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-ink-700 bg-ink-850 p-2"
                  >
                    <input
                      className="min-w-[180px] flex-1 bg-transparent px-1 text-sm text-stone2-100 focus:outline-none"
                      value={r.title}
                      onChange={(e) => setRow(i, { title: e.target.value })}
                    />
                    <input
                      type="date"
                      className="rounded-md bg-ink-900 border border-ink-600 px-2 py-1 text-xs text-stone2-300"
                      value={r.dueDate ?? ""}
                      min={todayStr()}
                      onChange={(e) =>
                        setRow(i, { dueDate: e.target.value || null })
                      }
                      title={humanDate(r.dueDate)}
                    />
                    <input
                      type="number"
                      className="w-16 rounded-md bg-ink-900 border border-ink-600 px-2 py-1 text-xs text-stone2-300"
                      placeholder="min"
                      value={r.estimateMin ?? ""}
                      onChange={(e) =>
                        setRow(i, {
                          estimateMin: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                      title="Szacowany czas (min)"
                    />
                    <select
                      className="max-w-[130px] rounded-md bg-ink-900 border border-ink-600 px-2 py-1 text-xs text-stone2-300"
                      value={r.projectId}
                      onChange={(e) =>
                        setRow(i, { projectId: e.target.value })
                      }
                    >
                      <option value="">Skrzynka</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <button
                      className="text-stone2-400/60 hover:text-terra-400"
                      onClick={() =>
                        setRows((rs) => rs!.filter((_, idx) => idx !== i))
                      }
                      title="Usuń"
                      aria-label="Usuń pozycję"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
          <div className="flex justify-between gap-2">
            <button className="btn-ghost" onClick={() => setRows(null)}>
              ← Wróć do tekstu
            </button>
            {rows.length > 0 && (
              <button className="btn-primary" onClick={addAll}>
                <Plus className="h-4 w-4" />
                Dodaj {rows.filter((r) => r.title.trim()).length} zadań
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
