"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: "◈", label: "Dashboard", roles: ["ADMIN", "LIDER", "CLOSER", "SETTER"] },
  { href: "/dane", icon: "✚", label: "Wprowadź dane", roles: ["ADMIN", "LIDER"] },
  { href: "/dzienny", icon: "◷", label: "Dzienny", roles: ["ADMIN", "LIDER", "CLOSER", "SETTER"] },
  { href: "/tygodniowy", icon: "◫", label: "Tygodniowy", roles: ["ADMIN", "LIDER", "CLOSER", "SETTER"] },
  { href: "/miesięczny", icon: "◰", label: "Miesięczny", roles: ["ADMIN", "LIDER", "CLOSER", "SETTER"] },
  { href: "/kwartalny", icon: "◱", label: "Kwartalny", roles: ["ADMIN", "LIDER", "CLOSER", "SETTER"] },
  { href: "/zespol-closing", icon: "◉", label: "Closing", roles: ["ADMIN", "LIDER", "CLOSER"] },
  { href: "/zespol-setting", icon: "◎", label: "Setting", roles: ["ADMIN", "LIDER", "SETTER"] },
  { href: "/bottlenecki", icon: "⚠", label: "Bottlenecki", roles: ["ADMIN", "LIDER"] },
  { href: "/ustawienia", icon: "◌", label: "Ustawienia", roles: ["ADMIN"] },
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
      {open && (
        <div className="fixed inset-0 bg-black/70 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 w-56 z-50 flex flex-col transition-transform duration-300",
          "lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ background: "#080808", borderRight: "1px solid #1a1a1a" }}
      >
        {/* Logo */}
        <div className="px-5 py-5" style={{ borderBottom: "1px solid #1a1a1a" }}>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black"
              style={{ background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.3)", color: "#00ff88" }}
            >
              KPI
            </div>
            <div>
              <div className="font-bold text-white text-sm tracking-tight">Sales KPI</div>
              <div className="text-xs" style={{ color: "#444" }}>Dashboard</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
          {visibleItems.map((item) => {
            const isActive = item.href === "/"
              ? pathname === "/" || pathname === "/dashboard"
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                  isActive
                    ? "nav-active"
                    : "hover:bg-[#111]"
                )}
                style={{ color: isActive ? "#00ff88" : "#555" }}
              >
                <span className="w-5 text-center text-base">{item.icon}</span>
                <span style={{ color: isActive ? "#00ff88" : "#888" }}>{item.label}</span>
                {isActive && (
                  <span className="ml-auto w-1 h-4 rounded-full flex-shrink-0"
                    style={{ background: "#00ff88", boxShadow: "0 0 6px #00ff88" }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className="px-4 py-4" style={{ borderTop: "1px solid #1a1a1a" }}>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: "rgba(0,255,136,0.08)", color: "#00ff88", border: "1px solid rgba(0,255,136,0.2)" }}
            >
              {session?.user?.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-semibold truncate">{session?.user?.name}</div>
              <div className="text-xs truncate" style={{ color: "#444" }}>{getRoleLabel(role)}</div>
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
