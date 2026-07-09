"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Habit } from "@/lib/types";
import { todayStr, weekDates, DAY } from "@/lib/dates";
import { format, addDays, subDays, startOfWeek, subWeeks } from "date-fns";
import { pl } from "date-fns/locale";
import {
  Plus,
  Minus,
  Flame,
  Target,
  Trash2,
  Check,
  ShieldCheck,
} from "lucide-react";

/** Suma wykonań nawyku w tygodniu zaczynającym się w poniedziałek `weekStart`. */
function weekSum(habit: Habit, weekStart: Date): number {
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    sum += habit.log[format(addDays(weekStart, i), DAY)] ?? 0;
  }
  return sum;
}

/** Seria: kolejne dni (dzienny) lub tygodnie (tygodniowy) ze zrealizowanym celem. */
function streak(habit: Habit): number {
  if (habit.cadence === "daily") {
    let s = 0;
    let d = new Date();
    // dzisiejszy dzień liczy się, jeśli już zrealizowany; inaczej zaczynamy od wczoraj
    if ((habit.log[format(d, DAY)] ?? 0) < habit.targetCount) {
      d = subDays(d, 1);
    }
    while ((habit.log[format(d, DAY)] ?? 0) >= habit.targetCount) {
      s++;
      d = subDays(d, 1);
    }
    return s;
  }
  let s = 0;
  let w = startOfWeek(new Date(), { weekStartsOn: 1 });
  if (weekSum(habit, w) < habit.targetCount) {
    w = subWeeks(w, 1);
  }
  while (weekSum(habit, w) >= habit.targetCount) {
    s++;
    w = subWeeks(w, 1);
  }
  return s;
}

function HabitCard({ habit }: { habit: Habit }) {
  const goals = useStore((s) => s.goals);
  const updateHabit = useStore((s) => s.updateHabit);
  const deleteHabit = useStore((s) => s.deleteHabit);
  const logHabit = useStore((s) => s.logHabit);

  const today = todayStr();
  const week = weekDates();
  const todayCount = habit.log[today] ?? 0;
  const weekCount = week.reduce((a, d) => a + (habit.log[d] ?? 0), 0);
  const goal = goals.find((g) => g.id === habit.goalId);
  const s = streak(habit);

  const dailyDone = todayCount >= habit.targetCount;
  const weeklyDone = weekCount >= habit.targetCount;
  const done = habit.cadence === "daily" ? dailyDone : weeklyDone;

  return (
    <div
      className={`card p-4 border-l-4 ${
        done ? "border-l-olive-400" : "border-l-transparent"
      }`}
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ background: habit.color }}
            />
            <input
              className="min-w-0 flex-1 bg-transparent font-display text-xl text-stone2-100 focus:outline-none"
              value={habit.name}
              onChange={(e) => updateHabit(habit.id, { name: e.target.value })}
            />
            {habit.kind === "avoid" && (
              <span className="chip border border-ink-600 text-stone2-300">
                <ShieldCheck className="h-3 w-3" />
                unikam
              </span>
            )}
            <span className="chip border border-ink-600 text-stone2-400">
              {habit.cadence === "daily"
                ? `${habit.targetCount}× dziennie`
                : `${habit.targetCount}× w tygodniu`}
            </span>
            {s > 0 && (
              <span className="chip border border-bronze-500/50 bg-bronze-500/10 text-bronze-300">
                <Flame className="h-3 w-3" />
                {s} {habit.cadence === "daily" ? "dni" : "tyg."}
              </span>
            )}
          </div>
          <input
            className="mt-1 w-full bg-transparent text-sm text-stone2-400 focus:outline-none"
            placeholder="Po co to robię? Do czego ma doprowadzić?"
            value={habit.why}
            onChange={(e) => updateHabit(habit.id, { why: e.target.value })}
          />
          {goal && (
            <span className="mt-1.5 chip border border-ink-600 bg-ink-900 text-stone2-300">
              <Target className="h-3 w-3 text-bronze-400" />
              {goal.title}
            </span>
          )}
        </div>
        <button
          className="btn-danger text-xs shrink-0"
          title="Usuń nawyk"
          aria-label="Usuń nawyk"
          onClick={() => {
            if (confirm(`Usunąć nawyk „${habit.name}"?`)) deleteHabit(habit.id);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
        {/* Dziś: licznik +/− */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone2-400 w-8">dziś</span>
          <button
            className="h-7 w-7 rounded-full border border-ink-600 text-stone2-300 hover:border-bronze-500 flex items-center justify-center disabled:opacity-30"
            onClick={() => logHabit(habit.id, today, -1)}
            disabled={todayCount === 0}
            title="Cofnij wykonanie"
            aria-label="Odejmij"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span
            className={`min-w-[3.5rem] text-center font-display text-xl tabular-nums ${
              dailyDone && habit.cadence === "daily"
                ? "text-olive-400"
                : "text-stone2-100"
            }`}
          >
            {todayCount}
            {habit.cadence === "daily" ? `/${habit.targetCount}` : ""}
          </span>
          <button
            className="h-7 w-7 rounded-full border border-bronze-500 bg-bronze-500/15 text-bronze-300 hover:bg-bronze-500/30 flex items-center justify-center"
            onClick={() => logHabit(habit.id, today, 1)}
            title={habit.kind === "avoid" ? "Utrzymane dziś" : "Wykonane"}
            aria-label="Dodaj wykonanie"
          >
            {habit.kind === "avoid" ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {/* Siatka tygodnia */}
        <div className="flex items-end gap-1.5">
          {week.map((d) => {
            const c = habit.log[d] ?? 0;
            const met =
              habit.cadence === "daily"
                ? c >= habit.targetCount
                : c > 0;
            const partial = habit.cadence === "daily" && c > 0 && !met;
            const isToday = d === today;
            const future = d > today;
            return (
              <button
                key={d}
                title={`${format(new Date(d + "T00:00:00"), "EEEE d MMM", {
                  locale: pl,
                })}: ${c}×`}
                disabled={future}
                onClick={() => {
                  // klik w dzień: dopełnij do celu, a jeśli osiągnięty — wyzeruj
                  const target =
                    habit.cadence === "daily" ? habit.targetCount : 1;
                  logHabit(habit.id, d, c >= target ? -c : 1);
                }}
                className={`flex h-9 w-7 flex-col items-center justify-end gap-1 rounded-md border pb-1 transition-colors ${
                  isToday ? "border-bronze-500/60" : "border-transparent"
                } ${future ? "opacity-30" : "hover:border-ink-500"}`}
              >
                <span
                  className={`h-3.5 w-3.5 rounded-full ${
                    met
                      ? "bg-olive-400"
                      : partial
                      ? "bg-bronze-500/50"
                      : "bg-ink-600"
                  }`}
                />
                <span className="text-[10px] leading-none text-stone2-400">
                  {format(new Date(d + "T00:00:00"), "EEEEE", { locale: pl })}
                </span>
              </button>
            );
          })}
        </div>

        {/* Postęp tygodnia (dla tygodniowych) */}
        {habit.cadence === "weekly" && (
          <div className="min-w-[140px] flex-1">
            <div className="flex justify-between text-xs text-stone2-400">
              <span>ten tydzień</span>
              <span className={weeklyDone ? "text-olive-400" : ""}>
                {weekCount}/{habit.targetCount}
              </span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-ink-700">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  weeklyDone ? "bg-olive-400" : "bg-bronze-500"
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    (weekCount / habit.targetCount) * 100
                  )}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HabitsView() {
  const habits = useStore((s) => s.habits);
  const goals = useStore((s) => s.goals);
  const addHabit = useStore((s) => s.addHabit);

  const [name, setName] = useState("");
  const [why, setWhy] = useState("");
  const [cadence, setCadence] = useState<"daily" | "weekly">("daily");
  const [kind, setKind] = useState<"do" | "avoid">("do");
  const [target, setTarget] = useState(1);
  const [goalId, setGoalId] = useState("");

  const create = () => {
    if (!name.trim()) return;
    addHabit({
      name,
      why,
      cadence,
      kind,
      targetCount: target,
      goalId: goalId || null,
    });
    setName("");
    setWhy("");
    setTarget(1);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-3xl text-stone2-100">Nawyki</h2>
        <p className="mt-1 text-sm text-stone2-400">
          Zadania proxy — działania, które wykonane odpowiednio często muszą
          doprowadzić do celu.
        </p>
      </div>

      {/* Motto strony */}
      <div className="card overflow-hidden">
        <div className="meander" />
        <div className="px-5 py-4 text-center">
          <div className="font-display text-2xl md:text-3xl text-bronze-300 leading-snug">
            „Kontroluję działania, nie wyniki.
            <br className="hidden md:block" /> Dziś robię swoją część."
          </div>
        </div>
      </div>

      {/* Dodawanie nawyku */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <input
            className="input flex-1 min-w-[200px]"
            placeholder="Nazwa nawyku, np. 5 rozmów sprzedażowych…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
          />
          <div
            className="flex rounded-lg border border-ink-600 overflow-hidden"
            role="group"
            aria-label="Cykl nawyku"
          >
            {(
              [
                ["daily", "Dzienny"],
                ["weekly", "Tygodniowy"],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                className={`px-3 py-2 text-xs ${
                  cadence === val
                    ? "bg-bronze-500 text-ink-950 font-medium"
                    : "text-stone2-300 hover:bg-ink-700"
                }`}
                onClick={() => setCadence(val)}
              >
                {label}
              </button>
            ))}
          </div>
          <div
            className="flex rounded-lg border border-ink-600 overflow-hidden"
            role="group"
            aria-label="Rodzaj nawyku"
          >
            {(
              [
                ["do", "Wykonuję"],
                ["avoid", "Unikam"],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                className={`px-3 py-2 text-xs ${
                  kind === val
                    ? "bg-bronze-500 text-ink-950 font-medium"
                    : "text-stone2-300 hover:bg-ink-700"
                }`}
                onClick={() => setKind(val)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={1}
              className="input w-16 text-center"
              value={target}
              onChange={(e) =>
                setTarget(Math.max(1, Number(e.target.value) || 1))
              }
              title="Ile razy w okresie"
            />
            <span className="text-xs text-stone2-400">
              ×/{cadence === "daily" ? "dzień" : "tydzień"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            className="input flex-1 min-w-[240px]"
            placeholder="Po co? Do czego ma doprowadzić? (opis nawyku)"
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
          />
          <select
            className="input max-w-[220px]"
            value={goalId}
            onChange={(e) => setGoalId(e.target.value)}
            title="Powiąż z celem"
          >
            <option value="">— bez celu —</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
          <button
            className="btn-primary"
            onClick={create}
            disabled={!name.trim()}
          >
            <Plus className="h-4 w-4" />
            Dodaj nawyk
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {habits.map((h) => (
          <HabitCard key={h.id} habit={h} />
        ))}
        {!habits.length && (
          <p className="pt-4 text-center text-sm text-stone2-400">
            Brak nawyków. Dodaj pierwszy — np. „50 rozmów sprzedażowych"
            jako 10× w tygodniu.
          </p>
        )}
      </div>
    </div>
  );
}
