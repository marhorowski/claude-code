"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export interface NavLink {
  href: string;
  label: string;
  external?: boolean;
}

export interface NavGroup {
  label: string;
  children: NavLink[];
}

/** Pozycje menu; „divider” oddziela część z wynikami i danymi od części administracyjnej. */
export type NavItem = NavLink | NavGroup | "divider";

const isGroup = (it: NavItem): it is NavGroup => typeof it === "object" && "children" in it;

/** Link aktywny: ścieżka, a dla dashboardu także widok z ?view= (bez niego = pierwszy, „ogolny”). */
function useIsActive() {
  const path = usePathname();
  const params = useSearchParams();
  return (href: string) => {
    const [hrefPath, query] = href.split("?");
    if (query) {
      const view = new URLSearchParams(query).get("view");
      return path === hrefPath && (params.get("view") ?? "ogolny") === view;
    }
    return hrefPath === "/panel" ? path === "/panel" : path.startsWith(hrefPath);
  };
}

/** Zamyka popover po kliknięciu obok albo Escape. */
function useDismiss(open: boolean, close: () => void) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("pointerdown", handler);
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("pointerdown", handler);
      document.removeEventListener("keydown", handler);
    };
  }, [open, close]);
  return box;
}

const Chevron = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 12 12" className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <path d="m3 4.5 3 3 3-3" />
  </svg>
);

function Dropdown({ group, isActive }: { group: NavGroup; isActive: (href: string) => boolean }) {
  const [open, setOpen] = useState(false);
  const box = useDismiss(open, () => setOpen(false));
  const path = usePathname();
  const params = useSearchParams();
  useEffect(() => setOpen(false), [path, params]);
  const active = group.children.some((c) => !c.external && isActive(c.href));

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 ${active ? "bg-soft font-medium text-ink" : "text-ink-2 hover:text-ink"}`}
      >
        {group.label}
        <Chevron open={open} />
      </button>
      {open && (
        <div role="menu" className="absolute left-0 top-10 z-30 min-w-[200px] rounded-2xl bg-card p-1.5 shadow-pop">
          {group.children.map((c) => {
            const on = !c.external && isActive(c.href);
            const cls = `flex items-center justify-between gap-3 rounded-xl px-3 py-2 ${on ? "bg-accent/[.10] font-medium text-ink" : "text-ink-2 hover:bg-soft hover:text-ink"}`;
            return c.external ? (
              <a key={c.href} role="menuitem" href={c.href} target="_blank" className={cls}>{c.label} <span aria-hidden>↗</span></a>
            ) : (
              <Link key={c.href} role="menuitem" href={c.href} className={cls} aria-current={on ? "page" : undefined}>
                {c.label}
                {on && <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Menu w nagłówku: grupy rozwijane, separator przed częścią administracyjną; na telefonie jedna lista. */
export function HeaderNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  const params = useSearchParams();
  const isActive = useIsActive();
  const [open, setOpen] = useState(false);
  const box = useDismiss(open, () => setOpen(false));
  useEffect(() => setOpen(false), [path, params]);

  const plain = (it: NavLink, cls: (on: boolean) => string) =>
    it.external ? (
      <a key={it.href} href={it.href} target="_blank" className={cls(false)}>{it.label} ↗</a>
    ) : (
      <Link key={it.href} href={it.href} className={cls(isActive(it.href))} aria-current={isActive(it.href) ? "page" : undefined}>{it.label}</Link>
    );

  return (
    <>
      <nav className="hidden items-center gap-1 text-[13.5px] md:flex">
        {items.map((it, i) =>
          it === "divider" ? (
            <span key={`d${i}`} className="mx-2 h-5 w-px bg-line-strong" aria-hidden />
          ) : isGroup(it) ? (
            <Dropdown key={it.label} group={it} isActive={isActive} />
          ) : (
            plain(it, (on) => `rounded-lg px-3 py-1.5 ${on ? "bg-soft font-medium text-ink" : "text-ink-2 hover:text-ink"}`)
          ),
        )}
      </nav>
      <div ref={box} className="relative md:hidden">
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="rounded-lg border border-line bg-card px-3 py-1.5 text-[13.5px] font-medium">
          Menu
        </button>
        {open && (
          <div className="fixed inset-x-3 top-14 z-30 max-h-[calc(100dvh-5rem)] space-y-3 overflow-y-auto rounded-2xl bg-card p-3 shadow-pop">
            {items.map((it, i) => {
              const tile = (on: boolean) =>
                `grid min-h-14 place-items-center rounded-xl px-2 text-center text-[13px] ${on ? "bg-accent/[.08] font-medium text-ink ring-1 ring-inset ring-accent/25" : "bg-soft/60 text-ink-2"}`;
              if (it === "divider") return <hr key={`d${i}`} className="border-line" />;
              if (isGroup(it))
                return (
                  <div key={it.label}>
                    <p className="eyebrow mb-1.5 px-1">{it.label}</p>
                    <div className="grid grid-cols-2 gap-2">{it.children.map((c) => plain(c, tile))}</div>
                  </div>
                );
              // Kolejne zwykłe linki w jednej siatce: rysuje je pierwszy z nich.
              if (i > 0 && items[i - 1] !== "divider" && !isGroup(items[i - 1])) return null;
              const run: NavLink[] = [];
              for (let j = i; j < items.length && items[j] !== "divider" && !isGroup(items[j]); j++) run.push(items[j] as NavLink);
              return <div key={it.href} className="grid grid-cols-2 gap-2">{run.map((c) => plain(c, tile))}</div>;
            })}
          </div>
        )}
      </div>
    </>
  );
}
