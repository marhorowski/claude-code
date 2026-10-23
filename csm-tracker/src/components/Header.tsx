"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "@/lib/theme-context";
import { useApp } from "./AppContext";

export function Header({ onMenuToggle }: { onMenuToggle: () => void }) {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const { isLeader, users, scope, setScope, scopeName } = useApp();
  const [menu, setMenu] = useState(false);
  const active = users.filter((u) => u.active);

  return (
    <header
      className="h-14 flex items-center px-4 gap-3 sticky top-0 z-30"
      style={{ background: "var(--header-bg)", borderBottom: "1px solid var(--border-card)", backdropFilter: "blur(12px)" }}
    >
      <button onClick={onMenuToggle} className="lg:hidden p-2 rounded-lg" style={{ color: "var(--text-muted)" }} aria-label="Menu">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {isLeader ? (
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="text-sm font-medium px-3 py-1.5 rounded-lg max-w-[60vw]"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-bright)", color: "var(--neon)" }}
          title="Zakres danych na dashboardzie i w raportach"
        >
          <option value="team">Cały zespół</option>
          {active.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      ) : (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "var(--bg-card)", border: "1px solid var(--border-bright)" }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--neon)", boxShadow: "0 0 4px var(--neon)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--neon)" }}>Mój portfel · {scopeName}</span>
        </div>
      )}

      <div className="flex-1" />

      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg"
        style={{ color: "var(--text-muted)", border: "1px solid var(--border-card)" }}
        title={theme === "dark" ? "Włącz jasny motyw" : "Włącz ciemny motyw"}
      >
        {theme === "dark" ? "☀" : "☾"}
      </button>

      <div className="relative">
        <button onClick={() => setMenu(!menu)} className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
            style={{ background: "var(--neon-dim)", color: "var(--neon)", border: "1px solid var(--neon-border)" }}
          >
            {session?.user?.name?.[0]?.toUpperCase() || "?"}
          </div>
          <span className="text-sm hidden sm:block" style={{ color: "var(--text-secondary)" }}>{session?.user?.name}</span>
        </button>
        {menu && (
          <div className="absolute right-0 top-full mt-2 w-52 rounded-xl shadow-2xl overflow-hidden z-50" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-bright)" }}>
            <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border-card)" }}>
              <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{session?.user?.name}</div>
              <div className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{session?.user?.email}</div>
            </div>
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="w-full text-left px-4 py-3 text-sm" style={{ color: "var(--red)" }}>
              Wyloguj się
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
