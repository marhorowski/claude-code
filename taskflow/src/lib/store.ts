"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  Task,
  Project,
  Goal,
  KeyResult,
  Settings,
  TimerState,
  DaySummary,
  Habit,
  PulseEntry,
  PulseAnswer,
  WorkSession,
  ID,
  PROJECT_COLORS,
  PROCESS_PROJECT_NAME,
  DEFAULT_MOTTO,
  OnTime,
} from "./types";
import { todayStr, tomorrowStr } from "./dates";
import { JournalEntry } from "./journal";
import {
  sndTaskAdded,
  sndPomodoroStart,
  sndTaskCompleted,
  sndPhaseEnd,
  sndFiveMinWarning,
  sndTick,
  startBreakMusic,
  stopBreakMusic,
} from "./sounds";

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const defaultSettings: Settings = {
  workMin: 25,
  breakMin: 5,
  longBreakMin: 15,
  sessionsBeforeLongBreak: 4,
  dayFocus: "",
  weekFocus: "",
  targetHoursPerDay: 6,
  soundsEnabled: true,
  syncKey: "default",
  pulseEnabled: true,
  pulseIntervalMin: 15,
  pulseFromHour: 8,
  pulseToHour: 21,
  motto: DEFAULT_MOTTO,
  pointGoalBase: 3,
};

const defaultTimer: TimerState = {
  taskId: null,
  phase: "work",
  running: false,
  remainingSec: 25 * 60,
  sessionsDone: 0,
};

export interface NewTaskInput {
  title: string;
  dueDate?: string | null;
  projectId?: ID | null;
  focusDay?: boolean;
  focusWeek?: boolean;
  estimateMin?: number | null;
  description?: string;
}

export interface NewHabitInput {
  name: string;
  why?: string;
  cadence?: "daily" | "weekly";
  targetCount?: number;
  kind?: "do" | "avoid";
  goalId?: ID | null;
}

interface AppState {
  tasks: Task[];
  projects: Project[];
  goals: Goal[];
  habits: Habit[];
  pulseLog: PulseEntry[];
  workSessions: WorkSession[];
  journal: JournalEntry[];
  settings: Settings;
  timer: TimerState;
  daySummaries: DaySummary[];
  workLog: Record<string, number>; // data -> sekundy pracy
  pomodoroLog: Record<string, number>; // data -> ukończone pomodoro

  // zadania
  addTask: (input: NewTaskInput) => Task;
  addTasksBulk: (inputs: NewTaskInput[]) => void;
  updateTask: (id: ID, patch: Partial<Task>) => void;
  deleteTask: (id: ID) => void;
  completeTask: (
    id: ID,
    note: string,
    onTime: OnTime | null,
    makeProcess: boolean
  ) => void;
  restoreTask: (id: ID) => void;

  // projekty
  addProject: (name: string, goalId?: ID | null) => Project;
  updateProject: (id: ID, patch: Partial<Project>) => void;
  deleteProject: (id: ID) => void;

  // cele
  addGoal: (title: string, why: string, isMain: boolean) => Goal;
  updateGoal: (id: ID, patch: Partial<Goal>) => void;
  deleteGoal: (id: ID) => void;
  addKeyResult: (goalId: ID, kr: Omit<KeyResult, "id">) => void;
  updateKeyResult: (goalId: ID, krId: ID, patch: Partial<KeyResult>) => void;
  deleteKeyResult: (goalId: ID, krId: ID) => void;

  // nawyki
  addHabit: (input: NewHabitInput) => Habit;
  updateHabit: (id: ID, patch: Partial<Habit>) => void;
  deleteHabit: (id: ID) => void;
  logHabit: (id: ID, date: string, delta: number) => void;

  // puls potencjału
  addPulse: (answer: PulseAnswer) => void;

  // journal
  upsertJournal: (
    entry: Omit<JournalEntry, "id" | "createdAt" | "updatedAt">
  ) => JournalEntry;
  setJournalAi: (id: ID, text: string) => void;
  deleteJournal: (id: ID) => void;

  // ustawienia
  updateSettings: (patch: Partial<Settings>) => void;

  // timer
  startTimer: (taskId: ID) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  skipPhase: () => void;
  tick: () => void;

  // dzień
  addDaySummary: (s: DaySummary) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      tasks: [],
      projects: [],
      goals: [],
      habits: [],
      pulseLog: [],
      workSessions: [],
      journal: [],
      settings: defaultSettings,
      timer: defaultTimer,
      daySummaries: [],
      workLog: {},
      pomodoroLog: {},

      addTask: (input) => {
        const task: Task = {
          id: uid(),
          title: input.title.trim(),
          description: input.description ?? "",
          projectId: input.projectId ?? null,
          dueDate: input.dueDate ?? null,
          checklist: [],
          timeSpentSec: 0,
          estimateMin: input.estimateMin ?? null,
          focusDay: input.focusDay ?? false,
          focusWeek: input.focusWeek ?? false,
          createdAt: new Date().toISOString(),
          completedAt: null,
          completionNote: "",
          onTime: null,
        };
        set((s) => ({ tasks: [...s.tasks, task] }));
        if (get().settings.soundsEnabled !== false) sndTaskAdded();
        return task;
      },

      addTasksBulk: (inputs) => {
        const now = Date.now();
        const tasks: Task[] = inputs
          .filter((i) => i.title.trim())
          .map((input, idx) => ({
            id: uid() + idx,
            title: input.title.trim(),
            description: input.description ?? "",
            projectId: input.projectId ?? null,
            dueDate: input.dueDate ?? null,
            checklist: [],
            timeSpentSec: 0,
            estimateMin: input.estimateMin ?? null,
            focusDay: input.focusDay ?? false,
            focusWeek: input.focusWeek ?? false,
            createdAt: new Date(now + idx).toISOString(),
            completedAt: null,
            completionNote: "",
            onTime: null,
          }));
        if (!tasks.length) return;
        set((s) => ({ tasks: [...s.tasks, ...tasks] }));
        if (get().settings.soundsEnabled !== false) sndTaskAdded();
      },

      updateTask: (id, patch) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),

      deleteTask: (id) => {
        const { timer } = get();
        if (timer.taskId === id) get().stopTimer();
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
      },

      completeTask: (id, note, onTime, makeProcess) => {
        const state = get();
        if (state.timer.taskId === id) state.stopTimer();
        const task = state.tasks.find((t) => t.id === id);
        if (!task) return;
        if (state.settings.soundsEnabled !== false) sndTaskCompleted();

        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  completedAt: new Date().toISOString(),
                  completionNote: note,
                  onTime,
                }
              : t
          ),
        }));

        if (makeProcess) {
          let proc = get().projects.find(
            (p) => p.name === PROCESS_PROJECT_NAME
          );
          if (!proc) proc = get().addProject(PROCESS_PROJECT_NAME);
          get().addTask({
            title: `Stwórz proces: ${task.title}`,
            projectId: proc.id,
            dueDate: tomorrowStr(),
            description: `Zadanie „${task.title}" będzie wykonywane częściej — opisz krok po kroku proces jego realizacji, żeby dało się je delegować lub zautomatyzować.`,
          });
        }
      },

      restoreTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, completedAt: null, onTime: null } : t
          ),
        })),

      addProject: (name, goalId = null) => {
        const project: Project = {
          id: uid(),
          name: name.trim(),
          color: PROJECT_COLORS[get().projects.length % PROJECT_COLORS.length],
          goalId,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ projects: [...s.projects, project] }));
        return project;
      },

      updateProject: (id, patch) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, ...patch } : p
          ),
        })),

      deleteProject: (id) =>
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          tasks: s.tasks.map((t) =>
            t.projectId === id ? { ...t, projectId: null } : t
          ),
        })),

      addGoal: (title, why, isMain) => {
        const goal: Goal = {
          id: uid(),
          title: title.trim(),
          why: why.trim(),
          keyResults: [],
          isMain,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          goals: [
            ...(isMain
              ? s.goals.map((g) => ({ ...g, isMain: false }))
              : s.goals),
            goal,
          ],
        }));
        return goal;
      },

      updateGoal: (id, patch) =>
        set((s) => ({
          goals: s.goals.map((g) => {
            if (g.id !== id) return g;
            return { ...g, ...patch };
          }).map((g) =>
            patch.isMain && g.id !== id ? { ...g, isMain: false } : g
          ),
        })),

      deleteGoal: (id) =>
        set((s) => ({
          goals: s.goals.filter((g) => g.id !== id),
          projects: s.projects.map((p) =>
            p.goalId === id ? { ...p, goalId: null } : p
          ),
        })),

      addKeyResult: (goalId, kr) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === goalId
              ? { ...g, keyResults: [...g.keyResults, { ...kr, id: uid() }] }
              : g
          ),
        })),

      updateKeyResult: (goalId, krId, patch) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === goalId
              ? {
                  ...g,
                  keyResults: g.keyResults.map((k) =>
                    k.id === krId ? { ...k, ...patch } : k
                  ),
                }
              : g
          ),
        })),

      deleteKeyResult: (goalId, krId) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === goalId
              ? {
                  ...g,
                  keyResults: g.keyResults.filter((k) => k.id !== krId),
                }
              : g
          ),
        })),

      addHabit: (input) => {
        const habit: Habit = {
          id: uid(),
          name: input.name.trim(),
          why: (input.why ?? "").trim(),
          cadence: input.cadence ?? "daily",
          targetCount: Math.max(1, input.targetCount ?? 1),
          kind: input.kind ?? "do",
          goalId: input.goalId ?? null,
          color:
            PROJECT_COLORS[get().habits.length % PROJECT_COLORS.length],
          createdAt: new Date().toISOString(),
          log: {},
        };
        set((s) => ({ habits: [...s.habits, habit] }));
        if (get().settings.soundsEnabled !== false) sndTaskAdded();
        return habit;
      },

      updateHabit: (id, patch) =>
        set((s) => ({
          habits: s.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)),
        })),

      deleteHabit: (id) =>
        set((s) => ({ habits: s.habits.filter((h) => h.id !== id) })),

      logHabit: (id, date, delta) => {
        const habit = get().habits.find((h) => h.id === id);
        if (!habit) return;
        const prev = habit.log[date] ?? 0;
        const next = Math.max(0, prev + delta);
        set((s) => ({
          habits: s.habits.map((h) => {
            if (h.id !== id) return h;
            const log = { ...h.log };
            if (next === 0) delete log[date];
            else log[date] = next;
            return { ...h, log };
          }),
        }));
        if (delta > 0 && get().settings.soundsEnabled !== false) {
          // po osiągnięciu dziennego celu — dźwięk sukcesu, wcześniej blip
          if (habit.cadence === "daily" && next >= habit.targetCount) {
            sndTaskCompleted();
          } else {
            sndTaskAdded();
          }
        }
      },

      addPulse: (answer) => {
        set((s) => ({
          pulseLog: [
            { ts: new Date().toISOString(), answer },
            ...s.pulseLog,
          ].slice(0, 5000),
        }));
        if (get().settings.soundsEnabled !== false) {
          answer === "realize" ? sndTaskCompleted() : sndTaskAdded();
        }
      },

      upsertJournal: (input) => {
        const existing = get().journal.find(
          (j) => j.type === input.type && j.date === input.date
        );
        const now = new Date().toISOString();
        if (existing) {
          const updated: JournalEntry = {
            ...existing,
            answers: input.answers,
            aiText: input.aiText || existing.aiText,
            updatedAt: now,
          };
          set((s) => ({
            journal: s.journal.map((j) => (j.id === existing.id ? updated : j)),
          }));
          return updated;
        }
        const entry: JournalEntry = {
          ...input,
          id: uid(),
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ journal: [entry, ...s.journal] }));
        return entry;
      },

      setJournalAi: (id, text) =>
        set((s) => ({
          journal: s.journal.map((j) =>
            j.id === id ? { ...j, aiText: text } : j
          ),
        })),

      deleteJournal: (id) =>
        set((s) => ({ journal: s.journal.filter((j) => j.id !== id) })),

      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      startTimer: (taskId) => {
        const { settings } = get();
        stopBreakMusic();
        if (settings.soundsEnabled !== false) sndPomodoroStart();
        set({
          timer: {
            taskId,
            phase: "work",
            running: true,
            remainingSec: settings.workMin * 60,
            sessionsDone: 0,
          },
        });
      },

      pauseTimer: () => {
        stopBreakMusic();
        set((s) => ({ timer: { ...s.timer, running: false } }));
      },

      resumeTimer: () => {
        set((s) => ({
          timer: s.timer.taskId ? { ...s.timer, running: true } : s.timer,
        }));
        const t = get().timer;
        if (t.running && t.phase !== "work") {
          startBreakMusic(() => get().settings.soundsEnabled !== false);
        }
      },

      stopTimer: () => {
        stopBreakMusic();
        set((s) => ({
          timer: { ...defaultTimer, remainingSec: s.settings.workMin * 60 },
        }));
      },

      skipPhase: () => {
        const { timer, settings } = get();
        if (!timer.taskId) return;
        if (timer.phase === "work") {
          const sessionsDone = timer.sessionsDone + 1;
          const long = sessionsDone % settings.sessionsBeforeLongBreak === 0;
          set({
            timer: {
              ...timer,
              phase: long ? "longBreak" : "break",
              remainingSec: (long ? settings.longBreakMin : settings.breakMin) * 60,
              sessionsDone,
            },
          });
        } else {
          set({
            timer: {
              ...timer,
              phase: "work",
              remainingSec: settings.workMin * 60,
            },
          });
        }
        // muzyka liry gra tylko w przerwie
        const after = get().timer;
        if (after.running && after.phase !== "work") {
          startBreakMusic(() => get().settings.soundsEnabled !== false);
        } else {
          stopBreakMusic();
        }
      },

      tick: () => {
        const { timer } = get();
        if (!timer.running || !timer.taskId) return;

        // w fazie pracy: doliczamy sekundę do zadania, dziennego logu i sesji
        if (timer.phase === "work") {
          const day = todayStr();
          const nowIso = new Date().toISOString();
          set((s) => {
            const sessions = [...s.workSessions];
            const last = sessions[sessions.length - 1];
            if (
              last &&
              last.taskId === timer.taskId &&
              Date.now() - Date.parse(last.end) <= 5000
            ) {
              sessions[sessions.length - 1] = { ...last, end: nowIso };
            } else {
              sessions.push({
                id: uid(),
                taskId: timer.taskId as ID,
                start: nowIso,
                end: nowIso,
              });
            }
            return {
              tasks: s.tasks.map((t) =>
                t.id === timer.taskId
                  ? { ...t, timeSpentSec: t.timeSpentSec + 1 }
                  : t
              ),
              workLog: { ...s.workLog, [day]: (s.workLog[day] ?? 0) + 1 },
              workSessions: sessions.slice(-2000),
            };
          });
        }

        // sygnał ostrzegawczy: 5 minut do końca odliczanej fazy
        if (
          timer.remainingSec === 301 &&
          get().settings.soundsEnabled !== false
        ) {
          sndFiveMinWarning();
        }

        // ostatnie 5 sekund fazy: stuknięcie co sekundę
        if (
          timer.remainingSec <= 6 &&
          timer.remainingSec >= 2 &&
          get().settings.soundsEnabled !== false
        ) {
          sndTick();
        }

        if (timer.remainingSec <= 1) {
          // ukończone pomodoro: naturalne domknięcie fazy pracy
          if (timer.phase === "work") {
            const day = todayStr();
            set((s) => ({
              pomodoroLog: {
                ...s.pomodoroLog,
                [day]: (s.pomodoroLog[day] ?? 0) + 1,
              },
            }));
          }
          get().skipPhase();
          if (get().settings.soundsEnabled !== false) sndPhaseEnd();
          if (typeof window !== "undefined" && "Notification" in window) {
            if (Notification.permission === "granted") {
              const next = get().timer.phase;
              new Notification(
                next === "work"
                  ? "Przerwa skończona — wracamy do pracy!"
                  : "Sesja skończona — czas na przerwę 🌿"
              );
            }
          }
        } else {
          set((s) => ({
            timer: { ...s.timer, remainingSec: s.timer.remainingSec - 1 },
          }));
        }
      },

      addDaySummary: (summary) =>
        set((s) => ({
          daySummaries: [
            summary,
            ...s.daySummaries.filter((d) => d.date !== summary.date),
          ],
        })),
    }),
    {
      name: "taskflow-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        tasks: s.tasks,
        projects: s.projects,
        goals: s.goals,
        habits: s.habits,
        pulseLog: s.pulseLog,
        workSessions: s.workSessions,
        journal: s.journal,
        settings: s.settings,
        daySummaries: s.daySummaries,
        workLog: s.workLog,
        pomodoroLog: s.pomodoroLog,
        // timer celowo nie jest utrwalany w stanie "running"
        timer: { ...s.timer, running: false },
      }),
    }
  )
);
