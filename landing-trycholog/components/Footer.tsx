import { site, nav } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="site">
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <a className="foot-brand" href="#top">
              <span className="foot-badge">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/img/logo-mark.png" alt={`Logo ${site.brand}`} />
              </span>
              <span>
                <b>{site.brand}</b>
                <small>{site.city}</small>
              </span>
            </a>
            <p className="foot-about">
              Gabinet trychologiczny przy aptece w Pruszczu Gdańskim. Diagnostyka
              włosów i skóry głowy oparta na badaniu mikrokamerą i wiedzy
              farmaceutycznej — dla pacjentów z Pruszcza Gdańskiego, Tczewa i
              Trójmiasta.
            </p>
          </div>
          <div className="foot-col">
            <h4>Nawigacja</h4>
            {nav.map((n) => (
              <a key={n.href} href={n.href}>
                {n.label}
              </a>
            ))}
          </div>
          <div className="foot-col">
            <h4>Kontakt</h4>
            <a href={site.phoneHref}>{site.phoneDisplay}</a>
            <a href={`mailto:${site.email}`}>{site.email}</a>
            <p>
              {site.address.line1}
              <br />
              {site.address.line2}
            </p>
            <a href={site.instagramUrl} target="_blank" rel="noopener">
              Instagram: {site.instagramHandle}
            </a>
            <a href={site.googleUrl} target="_blank" rel="noopener">
              Wizytówka i opinie Google
            </a>
          </div>
        </div>
        <div className="foot-bottom">
          <span>
            © {new Date().getFullYear()} Gabinet trychologiczny {site.person}. Wszelkie
            prawa zastrzeżone.
          </span>
          <span>
            <a href="#" aria-label="Regulamin (do uzupełnienia)">
              Regulamin
            </a>{" "}
            ·{" "}
            <a href="#" aria-label="Polityka prywatności (do uzupełnienia)">
              Polityka prywatności
            </a>{" "}
            · <span className="ph-note">dane firmy i NIP — do uzupełnienia</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
