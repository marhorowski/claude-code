"use client";

import { useEffect, useState } from "react";
import { site, nav } from "@/lib/site";
import { Phone, Menu, Moon, Sun } from "./icons";

const THEME_KEY = "zm-theme";

export default function Header() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved) document.documentElement.setAttribute("data-theme", saved);
    } catch {
      /* storage unavailable — fall back to system theme */
    }
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    const cur = root.getAttribute("data-theme");
    let next: string;
    if (!cur) {
      next =
        window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "light"
          : "dark";
    } else {
      next = cur === "dark" ? "light" : "dark";
    }
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignore */
    }
  };

  return (
    <header className="site">
      <div className="wrap nav">
        <a className="brand" href="#top" aria-label={`${site.name} — strona główna`}>
          <span className="monogram" aria-hidden="true">
            {site.monogram}
          </span>
          <span>
            <b>{site.name}</b>
            <small>{site.role}</small>
          </span>
        </a>

        <nav className="nav-links" aria-label="Nawigacja główna">
          {nav.map((n) => (
            <a key={n.href} href={n.href}>
              {n.label}
            </a>
          ))}
        </nav>

        <a className="nav-tel" href={site.phoneHref} aria-label={`Zadzwoń: ${site.phoneDisplay}`}>
          <Phone width={18} height={18} />
          <span>{site.phoneDisplay}</span>
        </a>

        <a className="btn btn-primary nav-cta" href="#rezerwacja">
          Umów konsultację
        </a>

        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label="Przełącz motyw jasny/ciemny"
          type="button"
        >
          <Moon />
          <Sun />
        </button>

        <button
          className="burger"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          aria-expanded={open}
          type="button"
        >
          <Menu width={22} height={22} />
        </button>
      </div>

      <nav className={`mobile-menu${open ? " open" : ""}`} aria-label="Menu mobilne">
        {nav.map((n) => (
          <a key={n.href} href={n.href} onClick={() => setOpen(false)}>
            {n.label}
          </a>
        ))}
        <a className="btn btn-primary" href="#rezerwacja" onClick={() => setOpen(false)}>
          Umów konsultację
        </a>
      </nav>
    </header>
  );
}
