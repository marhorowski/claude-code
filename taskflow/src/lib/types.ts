export type ID = string;

export interface ChecklistItem {
  id: ID;
  text: string;
  done: boolean;
}

export type OnTime = "faster" | "onTime" | "slower";

export interface Task {
  id: ID;
  title: string;
  description: string;
  projectId: ID | null; // null = skrzynka odbiorcza (inbox)
  dueDate: string | null; // "yyyy-MM-dd"
  checklist: ChecklistItem[];
  timeSpentSec: number;
  estimateMin: number | null;
  focusDay: boolean;
  focusWeek: boolean;
  createdAt: string; // ISO
  completedAt: string | null; // ISO — ustawione = zadanie w archiwum
  completionNote: string;
  onTime: OnTime | null;
}

export interface Project {
  id: ID;
  name: string;
  color: string;
  goalId: ID | null;
  createdAt: string;
}

export interface KeyResult {
  id: ID;
  text: string;
  target: number;
  current: number;
  unit: string;
}

export interface Goal {
  id: ID;
  title: string;
  why: string; // "dlaczego" — motywacja pokazywana w banerze
  keyResults: KeyResult[];
  isMain: boolean;
  createdAt: string;
}

export type HabitCadence = "daily" | "weekly";
export type HabitKind = "do" | "avoid";

export interface Habit {
  id: ID;
  name: string;
  why: string; // po co go robię, do czego ma doprowadzić
  cadence: HabitCadence; // cel dzienny / tygodniowy
  targetCount: number; // ile razy w okresie
  kind: HabitKind; // wykonywanie / unikanie
  goalId: ID | null;
  color: string;
  createdAt: string;
  log: Record<string, number>; // "yyyy-MM-dd" -> liczba wykonań (avoid: 1 = utrzymane)
}

export interface Settings {
  workMin: number;
  breakMin: number;
  longBreakMin: number;
  sessionsBeforeLongBreak: number;
  dayFocus: string;
  weekFocus: string;
  targetHoursPerDay: number;
  soundsEnabled: boolean;
  syncKey: string;
}

export type TimerPhase = "work" | "break" | "longBreak";

export interface TimerState {
  taskId: ID | null;
  phase: TimerPhase;
  running: boolean;
  remainingSec: number;
  sessionsDone: number;
}

export interface DaySummary {
  date: string; // "yyyy-MM-dd"
  totalSec: number;
  completedTitles: string[];
  aiText: string;
  createdAt: string;
}

export const PROJECT_COLORS = [
  "#c49a4a", // bronze
  "#9aa06a", // olive
  "#d97757", // terracotta
  "#8d9ec4", // aegean blue-grey
  "#a89f8d", // stone
  "#b0748c", // wine
  "#6fa8a0", // verdigris
  "#c4b06a", // ochre
];

export const PROCESS_PROJECT_NAME = "Procesy do stworzenia";
