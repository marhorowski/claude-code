"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export interface NavItem {
  href: string;
  label: string;
  external?: boolean;
}

const isActive = (path: string, href: string) => (href === "/panel" ? path === "/panel" : path.startsWith(href));

/** Linki w nagłówku; na telefonie przycisk „Menu” z siatką wszystkich stron. */
export function HeaderNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const link = (it: NavItem, cls: string) =>
    it.external ? (
      <a key={it.href} href={it.href} target="_blank" className={cls}>{it.label} ↗</a>
    ) : (
      <Link key={it.href} href={it.href} className={cls} aria-current={isActive(path, it.href) ? "page" : undefined}>{it.label}</Link>
    );

  return (
    <>
      <nav className="hidden items-center gap-1 text-[13.5px] md:flex">
        {items.map((it) =>
          link(it, `rounded-lg px-3 py-1.5 ${!it.external && isActive(path, it.href) ? "bg-soft font-medium text-ink" : "text-ink-2 hover:text-ink"}`),
        )}
      </nav>
      <div ref={box} className="relative md:hidden">
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="rounded-lg border border-line bg-card px-3 py-1.5 text-[13.5px] font-medium">
          Menu
        </button>
        {open && (
          <div className="fixed inset-x-3 top-14 z-30 grid grid-cols-3 gap-2 rounded-2xl bg-card p-3 shadow-pop">
            {items.map((it) =>
              link(it, `grid h-16 place-items-center rounded-xl text-center text-[13px] ${!it.external && isActive(path, it.href) ? "bg-accent/[.06] font-medium text-ink ring-1 ring-inset ring-accent/20" : "bg-soft/60 text-ink-2"}`),
            )}
          </div>
        )}
      </div>
    </>
  );
}
