"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";

interface HeaderProps {
  onMenuToggle: () => void;
  clientName: string;
  clients: Array<{ id: string; name: string }>;
  selectedClientId: string;
  onClientChange: (id: string) => void;
}

export function Header({ onMenuToggle, clientName, clients, selectedClientId, onClientChange }: HeaderProps) {
  const { data: session } = useSession();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const role = session?.user?.role;
  const canSwitchClient = role === "ADMIN" || role === "LIDER";

  return (
    <header
      className="h-14 flex items-center px-4 gap-4 sticky top-0 z-30"
      style={{ background: "#080808", borderBottom: "1px solid #1a1a1a" }}
    >
      {/* Hamburger */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 rounded-lg transition-colors"
        style={{ color: "#555" }}
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
            background: "#0f0f0f",
            border: "1px solid #1f1f1f",
            color: "#00ff88",
          }}
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      ) : (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "#0f0f0f", border: "1px solid #1f1f1f" }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#00ff88", boxShadow: "0 0 4px #00ff88" }} />
          <span className="text-sm font-medium" style={{ color: "#00ff88" }}>{clientName}</span>
        </div>
      )}

      <div className="flex-1" />

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors hover:bg-[#111]"
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
            style={{ background: "rgba(0,255,136,0.08)", color: "#00ff88", border: "1px solid rgba(0,255,136,0.2)" }}
          >
            {session?.user?.name?.[0]?.toUpperCase() || "?"}
          </div>
          <span className="text-sm hidden sm:block" style={{ color: "#888" }}>{session?.user?.name}</span>
          <svg className="w-3.5 h-3.5" style={{ color: "#444" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showUserMenu && (
          <div
            className="absolute right-0 top-full mt-2 w-48 rounded-xl shadow-2xl overflow-hidden z-50"
            style={{ background: "#0f0f0f", border: "1px solid #1f1f1f" }}
          >
            <div className="px-4 py-3" style={{ borderBottom: "1px solid #1a1a1a" }}>
              <div className="text-sm font-semibold text-white">{session?.user?.name}</div>
              <div className="text-xs mt-0.5" style={{ color: "#444" }}>{session?.user?.email}</div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full text-left px-4 py-3 text-sm transition-colors hover:bg-[#1a1a1a]"
              style={{ color: "#ff4444" }}
            >
              Wyloguj się
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
