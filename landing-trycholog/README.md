# Gabinet Maszynowska — landing page

Jednostronicowa witryna (landing page) gabinetu trychologicznego **Zofii Maszynowskiej**
w Pruszczu Gdańskim. Cała strona prowadzi do jednego działania: **umówienia konsultacji
trychologicznej** (190 zł) przez widżet **Booksy** lub telefonicznie.

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

## Struktura

```
app/
  layout.tsx      # metadane SEO, fonty (Fraunces + Mulish), JSON-LD LocalBusiness
  page.tsx        # kompozycja sekcji
  globals.css     # system designu (tokeny kolorów, motyw jasny/ciemny), style komponentów
components/
  Header.tsx      # logo, nawigacja, menu mobilne, przełącznik motywu (client)
  Sections.tsx    # Hero, Stats, Problem, Podejście, Z czym pomagam, Konsultacja,
                  # Diagnostyka, Proces, Zabiegi, Mity, Efekty/Przypadki, O mnie, Cennik
  Faq.tsx         # sekcja FAQ (natywne <details>)
  Booking.tsx     # rezerwacja / finalne CTA + miejsce na widżet Booksy
  Footer.tsx      # kontakt, dane, linki prawne
  icons.tsx       # zestaw ikon SVG (bez zależności zewnętrznych)
lib/
  site.ts         # dane kontaktowe i linki (jedno miejsce do edycji)
```

## Paleta (boho / kolory ziemi)

Ziemista, ciepła kolorystyka zgodna z briefem: piaskowe tło, glina/terakota jako
akcent, ochra i głęboka oliwka. Motyw jasny i ciemny sterowany tokenami CSS
(`prefers-color-scheme` + przełącznik `data-theme`). Fonty: **Fraunces** (nagłówki)
i **Mulish** (tekst).

## Do uzupełnienia (placeholdery z briefu)

- **Zdjęcia:** portret Zofii, wnętrze gabinetu, mikrokamera, galeria „przed/po”
  (tylko za pisemną zgodą pacjenta — RODO). Miejsca oznaczone jako placeholder w Hero,
  sekcji „O mnie” i „Efekty”.
- **Widżet Booksy:** w `components/Booking.tsx` przygotowano miejsce na oficjalny
  skrypt/iframe widżetu Booksy. Do czasu osadzenia przycisk prowadzi na profil Booksy.
- **Dane formalne:** pełna nazwa firmy, NIP, adres rejestrowy, regulamin i polityka
  prywatności (stopka) — uzupełnić w `lib/site.ts` i podlinkować dokumenty.
- **Opinie:** gdy pojawią się opinie Google/Booksy, warto dodać sekcję z ocenami.

## Dane kontaktowe (z briefu)

- Telefon: **666 161 191**
- E-mail: trycholog.maszynowska@gmail.com
- Adres: ul. Kasprowicza 52/3, 83-000 Pruszcz Gdański (lokal apteki)
- Booksy: profil gabinetu (link w `lib/site.ts`)
- Instagram: [@maszyna.w.trychologii](https://www.instagram.com/maszyna.w.trychologii/)
