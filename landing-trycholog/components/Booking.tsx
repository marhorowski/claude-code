import { site } from "@/lib/site";
import { Phone, CalendarDots } from "./icons";

export default function Booking() {
  return (
    <section className="booking" id="rezerwacja">
      <div className="wrap">
        <div className="book-card">
          <span className="eyebrow">Rezerwacja online</span>
          <h2>Umów konsultację trychologiczną</h2>
          <p className="lede">
            Wybierz dogodny termin w kalendarzu Booksy albo zadzwoń. Konsultacja
            odbywa się w gabinecie w Pruszczu Gdańskim.
          </p>
          <div className="book-cta">
            <a className="btn btn-gold" href={site.booksyUrl} target="_blank" rel="noopener">
              <CalendarDots /> Rezerwuj przez Booksy
            </a>
            <a className="btn btn-primary" href={site.phoneHref}>
              <Phone /> Zadzwoń: {site.phoneDisplay}
            </a>
          </div>

          {/*
            Widżet rezerwacji Booksy — miejsce na osadzenie.
            Booksy udostępnia gotowy widżet „Umów przez Booksy". Aby go osadzić,
            wklej oficjalny skrypt/iframe z panelu Booksy (Ustawienia → Widżet)
            w to miejsce. Do czasu osadzenia działa przycisk powyżej, który
            prowadzi wprost do profilu Booksy gabinetu.
          */}
          <p className="widget-note">
            Miejsce na osadzony widżet rezerwacji Booksy (kalendarz z terminami) —
            placeholder. W wersji produkcyjnej wyświetla się tu interaktywny kalendarz
            Booksy z dostępnymi godzinami.
          </p>

          <div className="book-meta">
            <div className="m">
              <span className="lab">Gabinet</span>
              <a href={site.mapsUrl} target="_blank" rel="noopener">
                {site.address.line1}
                <br />
                {site.address.line2}
              </a>
              <span style={{ marginTop: 6 }}>{site.address.note}</span>
            </div>
            <div className="m">
              <span className="lab">Telefon i e-mail</span>
              <a href={site.phoneHref}>{site.phoneDisplay}</a>
              <a href={`mailto:${site.email}`} style={{ marginTop: 6 }}>
                {site.email}
              </a>
            </div>
            <div className="m">
              <span className="lab">Godziny przyjęć</span>
              {site.hours.map((h) => (
                <span key={h}>{h}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
