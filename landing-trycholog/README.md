# Trycholog Maszynowska — landing page

Jednostronicowa witryna (landing page) gabinetu trychologicznego **Zofii Maszynowskiej**
w Pruszczu Gdańskim. Cała strona prowadzi do jednego działania: **umówienia konsultacji
trychologicznej** (190 zł, w gabinecie) przez **Booksy** lub telefonicznie.

Zbudowana zgodnie ze skillem *landing-page-guide* (framework 11 niezbędnych elementów):
Next.js 14 (App Router) + TypeScript + Tailwind, komponenty sekcyjne, metadane SEO,
dane strukturalne JSON-LD, dostępność (WCAG) i responsywność mobile-first.

## Uruchomienie

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # produkcyjny build
npm start
```

## Identyfikacja wizualna

- **Paleta (kolory ziemi / boho-elegancja):** ecru `#F3F2E8`, ciemna zieleń `#2D4835`,
  grafit `#2C322E`, złoto/miedź `#B88E68`. Zgodna z logo gabinetu.
- **Fonty:** Playfair Display (nagłówki) + Lora (tekst).
- **Motyw:** wyłącznie jasny (bez przełącznika ciemny/jasny).
- Tokeny designu i style komponentów: `app/globals.css`.

## Struktura

```
app/
  layout.tsx      # metadane SEO, fonty (Playfair + Lora), JSON-LD LocalBusiness
  page.tsx        # kolejność sekcji (Podejście → Znasz to? → …)
  globals.css     # design system (paleta, style komponentów)
components/
  Header.tsx      # logo + nawigacja + menu mobilne
  Sections.tsx    # Hero, Stats, Moje podejście, Znasz to?, Z czym pomagam,
                  # Konsultacja, Diagnostyka, Proces, Zabiegi, Mity, Efekty, O mnie, Cennik
  Faq.tsx         # FAQ (natywne <details>)
  Booking.tsx     # rezerwacja / finalne CTA + miejsce na widżet Booksy
  Footer.tsx      # kontakt, dane, linki prawne
  icons.tsx       # ikony SVG (w tym kolorowe „G" Google) — bez zależności zewnętrznych
lib/
  site.ts         # dane kontaktowe i linki (jedno miejsce do edycji)
public/img/       # logo-mark.png, zofia.jpg, gabinet.jpg
```

## Materiały (dostarczone przez klientkę)

- **Logo** — wyodrębniony znak graficzny (roślinny „mieszek + lupa") na przezroczystym
  tle: `public/img/logo-mark.png`.
- **Portret Zofii** (`public/img/zofia.jpg`) — sekcja Hero.
- **Zdjęcie gabinetu** (`public/img/gabinet.jpg`) — sekcja „O mnie".

## Do uzupełnienia

- **Widżet Booksy:** w `components/Booking.tsx` przygotowano miejsce na oficjalny
  skrypt/iframe widżetu Booksy (Ustawienia → Widżet w panelu Booksy). Do czasu
  osadzenia przyciski prowadzą wprost na profil Booksy gabinetu.
- **Opinie Google (auto-aktualizacja):** w Hero jest link „Opinie w Google" z realnymi
  gwiazdkami, prowadzący do wizytówki. Żeby oceny i liczba opinii aktualizowały się
  automatycznie na stronie, trzeba osadzić widżet zewnętrznej usługi (np. Trustindex
  lub Elfsight — darmowe plany) albo podpiąć Google Places API z kluczem. Sam Google
  nie udostępnia „czystego" embeda liczników.
- **Dane formalne:** pełna nazwa firmy, NIP, adres rejestrowy, regulamin i polityka
  prywatności — uzupełnić w `lib/site.ts` i podlinkować dokumenty w stopce.

## Dane kontaktowe

- Telefon: **666 161 191**
- E-mail: trycholog.maszynowska@gmail.com
- Adres: ul. Kasprowicza 52/3, 83-000 Pruszcz Gdański (lokal apteki)
- Booksy: profil gabinetu (link w `lib/site.ts`)
- Instagram: [@maszyna.w.trychologii](https://www.instagram.com/maszyna.w.trychologii/)
- Wizytówka Google: link „udostępnij" w `lib/site.ts`
