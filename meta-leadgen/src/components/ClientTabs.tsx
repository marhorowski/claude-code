"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const TABS = [
  { href: "", label: "Przegląd" },
  { href: "/ads", label: "Reklamy" },
  { href: "/audiences", label: "Grupy docelowe" },
  { href: "/reports", label: "Raporty" },
  { href: "/settings", label: "Ustawienia" },
];

export function ClientTabs({ clientId }: { clientId: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const d = params.get("d");
  const base = `/clients/${clientId}`;
  return (
    <nav className="no-print -mb-px flex gap-1 overflow-x-auto border-b border-slate-200">
      {TABS.map((t) => {
        const href = base + t.href;
        const active = t.href === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={t.href}
            href={d ? `${href}?d=${d}` : href}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${active ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
