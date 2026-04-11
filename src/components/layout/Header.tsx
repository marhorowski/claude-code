"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "@/lib/theme-context";

interface HeaderProps {
  onMenuToggle: () => void;
  clientName: string;
  clients: Array<{ id: string; name: string }>;
  selectedClientId: string;
  onClientChange: (id: string) => void;
}

export function Header({ onMenuToggle, clientName, clients, selectedClientId, onClientChange }: HeaderProps) {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const role = session?.user?.role;
  const canSwitchClient = role === "ADMIN" || role === "LIDER";

  return (
    <header
      className="h-14 flex items-center px-4 gap-4 sticky top-0 z-30"
      style={{ background: "var(--header-bg)", borderBottom: "1px solid var(--border-card)", backdropFilter: "blur(12px)" }}
    >
      {/* Hamburger */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 rounded-lg transition-colors"
        style={{ color: "var(--text-muted)" }}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Client selector */}
      {canSwitchClient && clients.length > 1 ? (
        <select
          value={selectedClientId}
          onChange={(e) => onClientChange(e.target.value)}
          className="text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-bright)",
            color: "var(--neon)",
          }}
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      ) : (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "var(--bg-card)", border: "1px solid var(--border-bright)" }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--neon)", boxShadow: "0 0 4px var(--neon)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--neon)" }}>{clientName}</span>
        </div>
      )}

      <div className="flex-1" />

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg transition-colors"
        style={{ color: "var(--text-muted)", border: "1px solid var(--border-card)" }}
        title={theme === "dark" ? "Włącz jasny motyw" : "Włącz ciemny motyw"}
      >
        {theme === "dark" ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="5" strokeWidth="2" />
            <path strokeLinecap="round" strokeWidth="2" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
          </svg>
        )}
      </button>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors"
          style={{ color: "var(--text-secondary)" }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
            style={{ background: "var(--neon-dim)", color: "var(--neon)", border: "1px solid var(--neon-border)" }}
          >
            {session?.user?.name?.[0]?.toUpperCase() || "?"}
          </div>
          <span className="text-sm hidden sm:block" style={{ color: "var(--text-secondary)" }}>{session?.user?.name}</span>
          <svg className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showUserMenu && (
          <div
            className="absolute right-0 top-full mt-2 w-48 rounded-xl shadow-2xl overflow-hidden z-50"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-bright)" }}
          >
            <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border-card)" }}>
              <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{session?.user?.name}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{session?.user?.email}</div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full text-left px-4 py-3 text-sm transition-colors"
              style={{ color: "var(--red)" }}
            >
              Wyloguj się
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
