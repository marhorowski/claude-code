import Link from "next/link";
import { VIEWS } from "@/lib/views";

/** Te same zakładki co w nagłówku dashboardu, jako linki (dla stron poza dashboardem, np. realizacji celu). */
export function ResultsTabs({ active }: { active: string }) {
  const items = [...VIEWS.map((v) => ({ href: `/panel?view=${v.key}`, key: v.key, label: v.label })), { href: "/panel/realizacja", key: "realizacja", label: "Realizacja celu" }];
  return (
    <nav aria-label="Widok" className="flex w-full min-w-0 rounded-xl bg-soft p-1 sm:w-fit">
      {items.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          aria-current={it.key === active ? "page" : undefined}
          className={`min-w-0 flex-1 truncate rounded-lg px-3 py-1.5 text-center text-[13px] font-medium sm:flex-none ${
            it.key === active ? "bg-card text-ink shadow-card ring-1 ring-line" : "text-muted hover:text-ink"
          }`}
        >
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
