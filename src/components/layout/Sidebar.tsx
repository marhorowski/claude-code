"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: "📊", label: "Dashboard Główny", roles: ["ADMIN", "LIDER", "CLOSER", "SETTER"] },
  { href: "/dane", icon: "✏️", label: "Wprowadź dane", roles: ["ADMIN", "LIDER"] },
  { href: "/dzienny", icon: "📅", label: "Dzienny", roles: ["ADMIN", "LIDER", "CLOSER", "SETTER"] },
  { href: "/tygodniowy", icon: "📆", label: "Tygodniowy", roles: ["ADMIN", "LIDER", "CLOSER", "SETTER"] },
  { href: "/miesięczny", icon: "🗓️", label: "Miesięczny", roles: ["ADMIN", "LIDER", "CLOSER", "SETTER"] },
  { href: "/kwartalny", icon: "📈", label: "Kwartalny", roles: ["ADMIN", "LIDER", "CLOSER", "SETTER"] },
  { href: "/zespol-closing", icon: "👥", label: "Zespół — Closing", roles: ["ADMIN", "LIDER", "CLOSER"] },
  { href: "/zespol-setting", icon: "📞", label: "Zespół — Setting", roles: ["ADMIN", "LIDER", "SETTER"] },
  { href: "/bottlenecki", icon: "🚨", label: "Bottlenecki", roles: ["ADMIN", "LIDER"] },
  { href: "/ustawienia", icon: "⚙️", label: "Ustawienia", roles: ["ADMIN"] },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role || "";

  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 w-64 bg-[#1E293B] border-r border-[#334155] z-50 flex flex-col transition-transform duration-300",
          "lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="p-6 border-b border-[#334155]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-500/20 rounded-xl flex items-center justify-center">
              <span className="text-lg">📊</span>
            </div>
            <div>
              <div className="font-bold text-white text-sm">Sales KPI</div>
              <div className="text-slate-400 text-xs">Dashboard</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {visibleItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                      isActive
                        ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                        : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                    )}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-[#334155]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500/30 rounded-full flex items-center justify-center text-indigo-400 font-bold text-xs">
              {session?.user?.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-medium truncate">{session?.user?.name}</div>
              <div className="text-slate-500 text-xs truncate">{getRoleLabel(role)}</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function getRoleLabel(role: string): string {
  switch (role) {
    case "ADMIN": return "Administrator";
    case "LIDER": return "Lider Sprzedaży";
    case "CLOSER": return "Closer";
    case "SETTER": return "Setter";
    default: return role;
  }
}
