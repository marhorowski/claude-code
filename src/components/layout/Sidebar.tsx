"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: "◈", label: "Dashboard", roles: ["ADMIN", "LIDER", "CLOSER", "SETTER"] },
  { href: "/dane", icon: "✚", label: "Wprowadź dane", roles: ["ADMIN", "LIDER"] },
  { href: "/dane-zbiorcze", icon: "▦", label: "Dane zbiorcze", roles: ["ADMIN", "LIDER"] },
  { href: "/dane-historyczne", icon: "◷", label: "Dane historyczne", roles: ["ADMIN", "LIDER"] },
{ href: "/tygodniowy", icon: "◫", label: "Tygodniowy", roles: ["ADMIN", "LIDER", "CLOSER", "SETTER"] },
  { href: "/miesięczny", icon: "◰", label: "Miesięczny", roles: ["ADMIN", "LIDER", "CLOSER", "SETTER"] },
  { href: "/kwartalny", icon: "◱", label: "Kwartalny", roles: ["ADMIN", "LIDER", "CLOSER", "SETTER"] },
  { href: "/zespol-closing", icon: "◉", label: "Closing", roles: ["ADMIN", "LIDER", "CLOSER"] },
  { href: "/zespol-setting", icon: "◎", label: "Setting", roles: ["ADMIN", "LIDER", "SETTER"] },
  { href: "/bottlenecki", icon: "⚠", label: "Bottlenecki", roles: ["ADMIN", "LIDER"] },
  { href: "/cele", icon: "⊙", label: "Cele", roles: ["ADMIN", "LIDER"] },
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
        style={{ background: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)" }}
      >
        {/* Logo */}
        <div className="px-5 py-5" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
              style={{ background: "var(--neon-dim)", border: "1px solid var(--neon-border)", color: "var(--neon)" }}
            >
              M
            </div>
            <div>
              <div className="font-black text-sm tracking-tight" style={{ color: "var(--neon)" }}>
                McKwacz<span style={{ color: "var(--text-muted)" }}>.ai</span>
              </div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>Sales Intelligence</div>
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
                    : ""
                )}
                style={{ color: isActive ? "var(--neon)" : "var(--text-muted)" }}
              >
                <span className="w-5 text-center text-base">{item.icon}</span>
                <span style={{ color: isActive ? "var(--neon)" : "var(--text-secondary)" }}>{item.label}</span>
                {isActive && (
                  <span className="ml-auto w-1 h-4 rounded-full flex-shrink-0"
                    style={{ background: "var(--neon)", boxShadow: "0 0 6px var(--neon)" }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className="px-4 py-4" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: "var(--neon-dim)", color: "var(--neon)", border: "1px solid var(--neon-border)" }}
            >
              {session?.user?.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{session?.user?.name}</div>
              <div className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{getRoleLabel(role)}</div>
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
