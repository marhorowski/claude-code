"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";
import { useApp } from "./AppContext";

const navItems = [
  { href: "/", icon: "◈", label: "Dashboard", leaderOnly: false },
  { href: "/tydzien", icon: "◫", label: "Tydzień", leaderOnly: false },
  { href: "/miesiac", icon: "✚", label: "Formularz miesięczny", leaderOnly: false },
  { href: "/raport", icon: "▦", label: "Raport KPI", leaderOnly: false },
  { href: "/zespol", icon: "◉", label: "Zespół", leaderOnly: true },
  { href: "/ankiety", icon: "★", label: "Ankiety NPS / CSAT", leaderOnly: true },
  { href: "/ustawienia", icon: "◌", label: "Ustawienia", leaderOnly: false },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { me, isLeader } = useApp();
  const items = navItems.filter((i) => !i.leaderOnly || isLeader);

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/70 z-40 lg:hidden" onClick={onClose} />}

      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 w-56 z-50 flex flex-col transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ background: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)" }}
      >
        <div className="px-5 py-5" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
              style={{ background: "var(--neon-dim)", border: "1px solid var(--neon-border)", color: "var(--neon)" }}
            >
              CS
            </div>
            <div>
              <div className="font-black text-sm tracking-tight" style={{ color: "var(--neon)" }}>
                CSM<span style={{ color: "var(--text-muted)" }}> Tracker</span>
              </div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>Customer Success KPI</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
          {items.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150", active && "nav-active")}
              >
                <span className="w-5 text-center text-base" style={{ color: active ? "var(--neon)" : "var(--text-muted)" }}>{item.icon}</span>
                <span style={{ color: active ? "var(--neon)" : "var(--text-secondary)" }}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: "var(--neon-dim)", color: "var(--neon)", border: "1px solid var(--neon-border)" }}
            >
              {me?.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{me?.name}</div>
              <div className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{isLeader ? "Lider CSM" : "Customer Success Manager"}</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
