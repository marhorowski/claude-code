"use client";

import { useState } from "react";
import { site, nav } from "@/lib/site";
import { Phone, Menu } from "./icons";

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="site">
      <div className="wrap nav">
        <a className="brand" href="#top" aria-label={`${site.brand} — strona główna`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="mark" src="/img/logo-mark.png" alt={`Logo — ${site.brand}`} />
          <span>
            <b>{site.brand}</b>
            <small>{site.city}</small>
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
