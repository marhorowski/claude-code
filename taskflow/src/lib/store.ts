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
  ID,
  PROJECT_COLORS,
  PROCESS_PROJECT_NAME,
  OnTime,
} from "./types";
import { todayStr, tomorrowStr } from "./dates";

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

interface AppState {
  tasks: Task[];
  projects: Project[];
  goals: Goal[];
  settings: Settings;
  timer: TimerState;
  daySummaries: DaySummary[];
  workLog: Record<string, number>; // data -> sekundy pracy

  // zadania
  addTask: (input: NewTaskInput) => Task;
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
      settings: defaultSettings,
      timer: defaultTimer,
      daySummaries: [],
      workLog: {},

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
        set((s) => ({ tasks: [task, ...s.tasks] }));
        return task;
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

      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      startTimer: (taskId) => {
        const { settings } = get();
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

      pauseTimer: () =>
        set((s) => ({ timer: { ...s.timer, running: false } })),

      resumeTimer: () =>
        set((s) => ({
          timer: s.timer.taskId ? { ...s.timer, running: true } : s.timer,
        })),

      stopTimer: () =>
        set((s) => ({
          timer: { ...defaultTimer, remainingSec: s.settings.workMin * 60 },
        })),

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
      },

      tick: () => {
        const { timer } = get();
        if (!timer.running || !timer.taskId) return;

        // w fazie pracy: doliczamy sekundę do zadania i dziennego logu
        if (timer.phase === "work") {
          const day = todayStr();
          set((s) => ({
            tasks: s.tasks.map((t) =>
              t.id === timer.taskId
                ? { ...t, timeSpentSec: t.timeSpentSec + 1 }
                : t
            ),
            workLog: { ...s.workLog, [day]: (s.workLog[day] ?? 0) + 1 },
          }));
        }

        if (timer.remainingSec <= 1) {
          get().skipPhase();
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
        settings: s.settings,
        daySummaries: s.daySummaries,
        workLog: s.workLog,
        // timer celowo nie jest utrwalany w stanie "running"
        timer: { ...s.timer, running: false },
      }),
    }
  )
);
