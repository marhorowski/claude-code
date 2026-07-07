"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import GoalBanner from "./GoalBanner";
import StatsBar from "./StatsBar";
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
import ArchiveView from "./views/ArchiveView";
import SettingsView from "./views/SettingsView";
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
  type LucideIcon,
} from "lucide-react";

type View =
  | { kind: "today" }
  | { kind: "inbox" }
  | { kind: "projects" }
  | { kind: "project"; id: string }
  | { kind: "goals" }
  | { kind: "archive" }
  | { kind: "settings" };

const NAV: { key: View["kind"]; label: string; icon: LucideIcon }[] = [
  { key: "today", label: "Plan", icon: Sun },
  { key: "inbox", label: "Skrzynka", icon: Inbox },
  { key: "projects", label: "Projekty", icon: FolderKanban },
  { key: "goals", label: "Cele", icon: Target },
  { key: "archive", label: "Archiwum", icon: Archive },
  { key: "settings", label: "Ustawienia", icon: Settings },
];

export default function App() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<View>({ kind: "today" });
  const [detailId, setDetailId] = useState<string | null>(null);
  const [completeId, setCompleteId] = useState<string | null>(null);
  const [endDay, setEndDay] = useState(false);
  const [plan, setPlan] = useState<"day" | "week" | null>(null);
  const [navOpen, setNavOpen] = useState(false);

  const inboxCount = useStore(
    (s) => s.tasks.filter((t) => !t.completedAt && !t.projectId).length
  );
  const projects = useStore((s) => s.projects);

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
                    ? "bg-ink-700 text-bronze-300"
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
          <div className="p-4 text-center text-[11px] text-stone2-400/60">
            „Początek jest połową całości" — Arystoteles
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
          {view.kind === "today" && (
            <>
              <GoalBanner onGoals={() => navigate("goals")} />
              <StatsBar />
              <TodayView onOpen={openTask} onComplete={askComplete} />
            </>
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
          {view.kind === "archive" && <ArchiveView />}
          {view.kind === "settings" && <SettingsView />}
        </main>
      </div>

      {/* Overlays */}
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
