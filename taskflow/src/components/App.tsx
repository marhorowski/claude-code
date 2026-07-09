"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import TimerWidget from "./TimerWidget";
import TaskDetail from "./TaskDetail";
import CompleteModal from "./CompleteModal";
import EndDayModal from "./EndDayModal";
import PlanModal from "./PlanModal";
import TodayView from "./views/TodayView";
import InboxView from "./views/InboxView";
import ProjectsView from "./views/ProjectsView";
import ProjectView from "./views/ProjectView";
import GoalsView from "./views/GoalsView";
import HabitsView from "./views/HabitsView";
import DayView from "./views/DayView";
import JournalView from "./views/JournalView";
import DashboardView from "./views/DashboardView";
import ArchiveView from "./views/ArchiveView";
import SettingsView from "./views/SettingsView";
import AuthGate, { useAuth } from "./AuthGate";
import PwaSetup from "./PwaSetup";
import { usePulse, PulseModal } from "./Pulse";
import {
  Sun,
  Inbox,
  FolderKanban,
  Target,
  Archive,
  Settings,
  Menu,
  CalendarRange,
  Sunset,
  Cloud,
  CloudOff,
  RefreshCw,
  Repeat,
  CalendarClock,
  LayoutDashboard,
  NotebookPen,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { useCloudSync, type SyncStatus } from "@/lib/sync";

function SyncIndicator({ status }: { status: SyncStatus }) {
  const cfg: Record<
    SyncStatus,
    { icon: LucideIcon; label: string; cls: string; spin?: boolean }
  > = {
    loading: {
      icon: RefreshCw,
      label: "Łączenie z bazą…",
      cls: "text-stone2-400",
      spin: true,
    },
    saving: {
      icon: RefreshCw,
      label: "Zapisywanie w bazie…",
      cls: "text-bronze-300",
      spin: true,
    },
    synced: {
      icon: Cloud,
      label: "Zapisano w bazie danych",
      cls: "text-jade-400",
    },
    offline: {
      icon: CloudOff,
      label: "Tryb offline — dane tylko w tej przeglądarce",
      cls: "text-stone2-400",
    },
  };
  const c = cfg[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs ${c.cls}`}
      title={c.label}
    >
      <c.icon className={`h-4 w-4 ${c.spin ? "animate-spin" : ""}`} />
      <span className="hidden md:inline">
        {status === "synced"
          ? "zapisano"
          : status === "saving"
          ? "zapisywanie…"
          : status === "loading"
          ? "łączenie…"
          : "offline"}
      </span>
    </span>
  );
}

type View =
  | { kind: "dashboard" }
  | { kind: "today" }
  | { kind: "inbox" }
  | { kind: "projects" }
  | { kind: "project"; id: string }
  | { kind: "goals" }
  | { kind: "habits" }
  | { kind: "day" }
  | { kind: "journal" }
  | { kind: "archive" }
  | { kind: "settings" };

const NAV: { key: View["kind"]; label: string; icon: LucideIcon }[] = [
  { key: "dashboard", label: "Pulpit", icon: LayoutDashboard },
  { key: "today", label: "Plan", icon: Sun },
  { key: "inbox", label: "Skrzynka", icon: Inbox },
  { key: "projects", label: "Projekty", icon: FolderKanban },
  { key: "goals", label: "Cele", icon: Target },
  { key: "habits", label: "Nawyki", icon: Repeat },
  { key: "day", label: "Oś dnia", icon: CalendarClock },
  { key: "journal", label: "Journal", icon: NotebookPen },
  { key: "archive", label: "Archiwum", icon: Archive },
  { key: "settings", label: "Ustawienia", icon: Settings },
];

export default function App() {
  return (
    <AuthGate>
      <AppInner />
    </AuthGate>
  );
}

function AppInner() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<View>({ kind: "dashboard" });
  const [detailId, setDetailId] = useState<string | null>(null);
  const [completeId, setCompleteId] = useState<string | null>(null);
  const [endDay, setEndDay] = useState(false);
  const [plan, setPlan] = useState<"day" | "week" | null>(null);
  const [navOpen, setNavOpen] = useState(false);

  const inboxCount = useStore(
    (s) => s.tasks.filter((t) => !t.completedAt && !t.projectId).length
  );
  const projects = useStore((s) => s.projects);
  const syncStatus = useCloudSync();
  const { open: pulseOpen, close: pulseClose } = usePulse();
  const { login, signOut } = useAuth();

  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="font-display text-4xl text-bronze-300">Ergon</div>
          <div className="mt-2 text-sm text-stone2-400 pulse-soft">
            ładowanie…
          </div>
        </div>
      </div>
    );
  }

  const openTask = (id: string) => setDetailId(id);
  const askComplete = (id: string) => setCompleteId(id);

  const navigate = (kind: View["kind"]) => {
    setView({ kind } as View);
    setNavOpen(false);
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-60 border-r border-ink-700 bg-ink-900 transition-transform lg:static lg:translate-x-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="px-5 pt-5 pb-3">
            <div className="font-display text-2xl text-bronze-300">
              ΕRGON
            </div>
            <div className="text-[11px] uppercase text-stone2-400">
              praca · dzieło · czyn
            </div>
          </div>
          <div className="meander-subtle mx-5" />
          <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
            {NAV.map((item) => (
              <button
                key={item.key}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  view.kind === item.key ||
                  (item.key === "projects" && view.kind === "project")
                    ? "bg-gradient-to-r from-bronze-500/25 to-bronze-500/5 text-bronze-300 font-medium"
                    : "text-stone2-300 hover:bg-ink-800"
                }`}
                onClick={() => navigate(item.key)}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.key === "inbox" && inboxCount > 0 && (
                  <span className="chip bg-bronze-500/15 text-bronze-300">
                    {inboxCount}
                  </span>
                )}
              </button>
            ))}

            {projects.length > 0 && (
              <div className="pt-3">
                <div className="px-3 pb-1 text-[11px] uppercase text-stone2-400">
                  Projekty
                </div>
                {projects.map((p) => (
                  <button
                    key={p.id}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                      view.kind === "project" && view.id === p.id
                        ? "bg-ink-700 text-stone2-100"
                        : "text-stone2-300 hover:bg-ink-800"
                    }`}
                    onClick={() => {
                      setView({ kind: "project", id: p.id });
                      setNavOpen(false);
                    }}
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ background: p.color }}
                    />
                    <span className="truncate text-left">{p.name}</span>
                  </button>
                ))}
              </div>
            )}
          </nav>
          <div className="border-t border-ink-700 p-3">
            {login && (
              <div className="mb-2 flex items-center justify-between gap-2 px-1">
                <span className="truncate text-xs text-stone2-400">
                  {login}
                </span>
                <button
                  className="btn-ghost px-2 py-1 text-xs"
                  onClick={signOut}
                  title="Wyloguj się"
                  aria-label="Wyloguj się"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <div className="text-center text-[11px] text-stone2-400/60">
              „Początek jest połową całości" — Arystoteles
            </div>
          </div>
        </div>
      </aside>
      {navOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}

      {/* Main */}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 border-b border-ink-700 bg-ink-950/90 backdrop-blur">
          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 lg:px-8">
            <button
              className="btn-ghost lg:hidden"
              onClick={() => setNavOpen(true)}
              title="Menu"
              aria-label="Otwórz menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <SyncIndicator status={syncStatus} />
            <div className="flex-1" />
            <button
              className="btn-outline"
              onClick={() => setPlan("day")}
              title="Zaplanuj jutrzejszy dzień"
            >
              <Sun className="h-4 w-4" />
              Ustalanie dnia
            </button>
            <button
              className="btn-outline"
              onClick={() => setPlan("week")}
              title="Zaplanuj cały tydzień"
            >
              <CalendarRange className="h-4 w-4" />
              Ustalanie tygodnia
            </button>
            <button
              className="btn-primary"
              onClick={() => setEndDay(true)}
              title="Podsumuj dzień pracy"
            >
              <Sunset className="h-4 w-4" />
              Zakończ dzień pracy
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-4 py-6 lg:px-8 pb-28 space-y-6">
          {view.kind === "dashboard" && (
            <DashboardView
              onOpen={openTask}
              onComplete={askComplete}
              onNavigate={(kind) => navigate(kind)}
            />
          )}
          {view.kind === "today" && (
            <TodayView onOpen={openTask} onComplete={askComplete} />
          )}
          {view.kind === "inbox" && (
            <InboxView onOpen={openTask} onComplete={askComplete} />
          )}
          {view.kind === "projects" && (
            <ProjectsView
              onOpenProject={(id) => setView({ kind: "project", id })}
            />
          )}
          {view.kind === "project" && (
            <ProjectView
              projectId={view.id}
              onOpen={openTask}
              onComplete={askComplete}
              onBack={() => setView({ kind: "projects" })}
            />
          )}
          {view.kind === "goals" && <GoalsView />}
          {view.kind === "habits" && <HabitsView />}
          {view.kind === "day" && <DayView />}
          {view.kind === "journal" && <JournalView />}
          {view.kind === "archive" && <ArchiveView />}
          {view.kind === "settings" && <SettingsView />}
        </main>
      </div>

      {/* Overlays */}
      <PwaSetup />
      {pulseOpen && <PulseModal onClose={pulseClose} />}
      <TimerWidget onOpenTask={openTask} />
      {detailId && (
        <TaskDetail
          taskId={detailId}
          onClose={() => setDetailId(null)}
          onComplete={(id) => {
            setDetailId(null);
            setCompleteId(id);
          }}
        />
      )}
      {completeId && (
        <CompleteModal
          taskId={completeId}
          onClose={() => setCompleteId(null)}
        />
      )}
      {endDay && <EndDayModal onClose={() => setEndDay(false)} />}
      {plan && <PlanModal mode={plan} onClose={() => setPlan(null)} />}
    </div>
  );
}
