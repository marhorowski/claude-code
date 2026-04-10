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

export function Header({
  onMenuToggle,
  clientName,
  clients,
  selectedClientId,
  onClientChange,
}: HeaderProps) {
  const { data: session } = useSession();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const role = session?.user?.role;
  const canSwitchClient = role === "ADMIN" || role === "LIDER";

  return (
    <header className="h-16 bg-[#1E293B] border-b border-[#334155] flex items-center px-4 gap-4 sticky top-0 z-30">
      {/* Hamburger */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Client selector */}
      <div className="flex items-center gap-2">
        {canSwitchClient && clients.length > 1 ? (
          <select
            value={selectedClientId}
            onChange={(e) => onClientChange(e.target.value)}
            className="bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-1.5 text-sm text-white focus:border-indigo-500 transition-colors"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="flex items-center gap-2 bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-1.5">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-white font-medium">{clientName}</span>
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-700/50 transition-colors"
        >
          <div className="w-8 h-8 bg-indigo-500/30 rounded-full flex items-center justify-center text-indigo-400 font-bold text-sm">
            {session?.user?.name?.[0]?.toUpperCase() || "?"}
          </div>
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showUserMenu && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-[#1E293B] border border-[#334155] rounded-xl shadow-xl overflow-hidden z-50">
            <div className="px-4 py-3 border-b border-[#334155]">
              <div className="text-sm text-white font-medium">{session?.user?.name}</div>
              <div className="text-xs text-slate-400">{session?.user?.email}</div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Wyloguj się
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
