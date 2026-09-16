# TrifectaOS — Design System

> Kompletne wytyczne wizualne marki **TrifectaOS / Trifecta Agency**.
> Dokument źródłowy do projektowania w Claude Design i innych narzędziach.
> Marka: agencja pozyskiwania klientów (leady, umawianie spotkań, sprzedaż) — B2B/lokalnie.

---

## 1. Charakter marki (design principles)

**Klimat w jednym zdaniu:** industrialna hybryda B2B — jasne, ciepłe tła w materiałach webowych; ciemne, ciepłe tła z bursztynową poświatą w social; mocna geometryczna typografia; kolor używany **punktowo**.

Zasady nadrzędne:
1. **Kolor punktowo.** Bursztyn to akcent (CTA, jedna liczba, highlight). Nigdy jako duże tło — wyjątki: pieczęć, badge, banner „przychodu".
2. **Liczby = sygnatura.** Wyniki i metryki eksponuj DUŻE (Manrope 800). To główny nośnik zaufania.
3. **Kontrast rytmu.** Naprzemiennie jasne (`#FAF9F7`) i ciemne (`#161513`) sekcje.
4. **Ciepłe cienie**, nie czarne — zawsze na bazie grafitu `rgba(22,21,19, …)`.
5. **Dużo powietrza.** Treść wyśrodkowana, hojny padding, max-width ~1080px w webie.
6. **Konkret, nie ozdobniki.** Minimalizm; jeden mocny przekaz na widok.

---

## 2. Kolory (tokeny)

### Rdzeń
| Token | HEX | Rola |
|---|---|---|
| `--amber` | `#F5A01B` | akcent główny: CTA, liczby, highlighty, pill, kropki |
| `--amber-dark` | `#D9860A` | hover, drugi kolor gradientu akcentu |
| `--brown` | `#8A5A12` | głębia: duże liczby, obramowania premium, cień 3D w logo |
| `--ink` | `#161513` | tekst, nagłówki, jasne-motywowe ciemne sekcje |
| `--muted` | `#5B5852` | tekst pomocniczy (na jasnym) |
| `--bg` | `#FAF9F7` | tło główne (ciepła biel) — web |
| `--bg-soft` | `#F2EFE9` | tło naprzemiennych sekcji — web |
| `--line` | `#E3DED4` | ramki, separatory |
| `--white` | `#FFFFFF` | karty, kontrast |

### Ciemny motyw / social
| Token | HEX | Rola |
|---|---|---|
| `--dark-warm` | `#241A0D` | tło grafik social (story/post/okładki) |
| `--ink-2` | `#0F0E0C` | najciemniejsze (stopka web) |
| `--ink-card` | `#211F1B` | karta na ciemnym tle |
| `--ink-card-line` | `#322F29` | ramka karty na ciemnym |
| `--on-dark` | `#EDE9E1` | tekst na ciemnym (główny) |
| `--on-dark-2` | `#CFC8BC` | tekst pomocniczy na ciemnym |
| `--on-dark-muted` | `#B6B0A4` | przygaszony tekst na ciemnym |

### Akcentowe wypełnienia
| Zastosowanie | Wartości |
|---|---|
| Miękki badge (np. „zwrot z inwestycji") | tło `#FBF1DC`, ramka `#F0DBA6` |
| Pill branży (na ciemnym) | tło `rgba(245,160,27,.14)`, ramka `rgba(245,160,27,.6)`, tekst `#F5A01B` |
| Gradient akcentu (linie, bannery) | `linear-gradient(90deg,#F5A01B,#D9860A)` |
| Poświata na ciemnym tle | radialne: `rgba(245,160,27,.18–.30)` + `rgba(217,134,10,.13–.20)` |

### Poświata (tło social) — gotowy blok
```css
background:
  radial-gradient(1200px 1000px at 50% 26%, rgba(245,160,27,.18), transparent 66%),
  radial-gradient(1000px 900px at 50% 104%, rgba(217,134,10,.13), transparent 66%),
  #241A0D;
```

---

## 3. Typografia

- **Nagłówki / liczby: `Manrope`** — ExtraBold **800** (H1/H2, metryki), Bold **700** (podtytuły, pill).
  `letter-spacing: -0.02em; line-height: 1.05–1.12`.
- **Tekst: `Inter`** — 400 (body), 500/600 (wyróżnienia).
- **Eyebrow / nadtytuł:** Manrope 700, UPPERCASE, `letter-spacing: .14–.3em`, kolor `--brown` lub `--amber`.

Import:
```css
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&family=Inter:wght@400;500;600;700&display=swap');
```
Fallback: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.

Skala referencyjna (web): H1 `clamp(30px,5vw,52px)` · H2 `clamp(26px,3.6vw,38px)` · body 16–20px · eyebrow 13px.

---

## 4. Logo i sygnet

Znak: **niemożliwy trójkąt (Penrose)** w bursztynie / brązie / grafitze. Wordmark: „Trifecta**OS**" lub „Trifecta **Agency**" (końcówka bursztynowa).

Sygnet — inline SVG (na jasnym tle użyj `#161513` dla dolnej ściany; na ciemnym `#3a3630`):
```html
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <polygon points="8,90 92,90 66,76 31,70" fill="#161513"/>   <!-- ciemna ściana (#3a3630 na ciemnym tle) -->
  <polygon points="92,90 50,6 58,41 66,76" fill="#8A5A12"/>   <!-- brąz -->
  <polygon points="50,6 8,90 31,70 58,41" fill="#F5A01B"/>    <!-- bursztyn -->
</svg>
```
Wariant jednokolorowy (watermark): wszystkie polygony `#F5A01B`, opacity 0.06–0.10.

Zasady logo:
- Lockup poziomy: sygnet + wordmark, odstęp ≈ 0.3× wysokości sygnetu.
- Na ciemnym: „Trifecta" biały/`#F7F4EE`, „Agency/OS" bursztyn.
- Na jasnym: „Trifecta" `#161513`, „Agency/OS" bursztyn.
- Ikona/awatar: sam sygnet na `#211809` z delikatną poświatą (app-icon).

---

## 5. Kształt, cień, siatka

- Zaokrąglenia: karty `16px` (web) / `20–26px` (grafiki), przyciski `12px`, pill/chip `999px`, badge `10px`.
- Cienie: `--shadow: 0 10px 30px rgba(22,21,19,.08)` · `--shadow-lg: 0 24px 60px rgba(22,21,19,.14)` · na grafikach kart white `0 24px 55px rgba(0,0,0,.42)`.
- Siatka web: `max-width:1080px`, wyśrodkowana, padding boczny min. 24px.

---

## 6. Komponenty (recepty)

**Przycisk (CTA)**
```css
background:#F5A01B; color:#161513; font:800 16px Manrope; padding:16px 30px;
border-radius:12px; box-shadow:0 8px 20px rgba(245,160,27,.28);
/* hover: background:#D9860A; transform:translateY(-2px) */
```

**Karta (web)**: białe tło, ramka `#E3DED4`, `border-radius:16px`, `--shadow`, padding ~34px.

**Chip / pigułka** (kategorie): białe tło, ramka `#E3DED4`, `border-radius:999px`, przed tekstem bursztynowa kropka 7px.

**Pill branży (na ciemnym)** — dla grafik social:
```css
background:rgba(245,160,27,.14); border:2px solid rgba(245,160,27,.6);
color:#F5A01B; font:800 28px Manrope; letter-spacing:.1em; text-transform:uppercase;
border-radius:999px; padding:12px 30px;
```

**Separator sekcji** (zamiast „taśmy"):
```css
height:3px; background:linear-gradient(90deg,transparent,rgba(245,160,27,.55) 32%,#8A5A12 50%,rgba(245,160,27,.55) 68%,transparent);
```

**Banner przychodu / wyniku** (mocny akcent):
```css
background:linear-gradient(90deg,#F5A01B,#D9860A); color:#1a1305;
border-radius:16px; padding:22px 34px; font:800 44px Manrope;
/* podpis w środku: Inter 600, color:#3a2c0c */
```

**Badge mnożnika / zwrotu** (miękki): tło `#FBF1DC`, ramka `#F0DBA6`, liczba Manrope 800 `#8A5A12`; wariant „featured": tło pełny bursztyn.

**Pieczęć gwarancji**: okrąg, obwódka bursztyn, przerywany pierścień brąz, środek wypełniony bursztynem, tekst na okręgu (SVG `textPath`).

**Biała kafla na logo klienta** (okładki firm): białe tło, `border-radius:26px`, padding 44px, cień `0 26px 60px rgba(0,0,0,.45)`, logo `object-fit:contain`. Uniwersalne dla dowolnego logo (jasne/ciemne/foto).

---

## 7. Nagłówek wyniku — HIERARCHIA (kluczowe)

Kolejność i waga (od góry):
1. **Usługa / produkt** — Manrope 800, DUŻY (story ~46px / post ~40px), np. „Program B2B dla branży beauty". Ma być mocno widoczny.
2. **Headline z metryką** — Manrope 800, NAJWIĘKSZY (story ~78px / post ~64px), amber highlight na liczbie, np. „**159** umówionych spotkań w 2 miesiące".
3. **Zrzut dowodowy** — w białej, zaokrąglonej kafli z cieniem.
4. **Caption ze statami** — Inter 600, `#D6CEBF`, np. „ROAS 29 · 25 klientów · 271 zł/klient".
5. **Banner przychodu** (opcjonalnie) — gdy jest kwota, np. „≈197 500 zł przychodu".

> Branża może być zaszyta w linii usługi (np. „…dla branży beauty") zamiast osobnego pilla. Pill branży stosujemy głównie na okładkach firm.

---

## 8. Formaty i specyfikacje grafik

Wszystkie grafiki social: tło `--dark-warm` + poświata (blok z §2), logo „Trifecta Agency" na dole (sygnet 44px + wordmark Manrope 800 32px, „Agency" bursztyn).

| Typ | Wymiary | Układ |
|---|---|---|
| **Landing hero / web** | responsywne | jasne tło, patrz §1–6 |
| **Story wyniku** | 1080×1920 (9:16) | usługa → headline → zrzut → caption → (banner) → logo |
| **Post wyniku** | 1080×1350 (4:5) | jw., bardziej kompaktowo |
| **Okładka firmy (relacja/wyróżnione)** | 1080×1920 | eyebrow „Współpraca z TrifectaOS" → **logo w białej kafli** (640×400) → **pill branży** → wynik (Manrope 800 ~62px) → zakres (Inter 500 ~30px) → logo |
| **Okładka firmy BEZ logo** | 1080×1920 | eyebrow → **duża NAZWA firmy** (Manrope 800 ~120px) → pill branży → (wynik + zakres, jeśli są) → logo |
| **Okładka modułu (Akademia)** | 1460×752 | wyśrodkowane: lockup „Trifecta Agency Akademia" → eyebrow „MODUŁ" → duży tytuł (Manrope 800 ~122px) → subheading (Inter 500 ~52px). Bez numeracji. |
| **Okładka-grid Akademii** | 1460×752 | lockup + „CO ZNAJDZIESZ W ŚRODKU" + grid 2×N kafli (kropka bursztyn + tytuł) |
| **Cover Facebook** | 1702×630 (=851×315 ×2) | wyśrodkowany lockup + tagline (kropki bursztyn) + akcent-linia + subheading; sygnet-watermark po prawej |
| **Cover Skool (Akademia)** | 1084×576 | sygnet + „TRIFECTA AGENCY" + duże „Akademia" |
| **IG cover serii** | 1080×1920 | wielki tytuł 2-liniowy (2. linia bursztyn) + eyebrow + sub + „Zobacz wyniki ↓" |
| **Ikona / awatar** | 128×128, 1024×1024 | sam sygnet; ikona na `#211809` z poświatą; sygnet też jako PNG transparent/white |

Kadrowanie zrzutów: przycinaj do samej treści (odcinaj białe marginesy). Bardzo szerokie/wąskie zrzuty pokazuj mniejsze, a kluczowe liczby powtarzaj w caption.

---

## 9. Ton i copy

- Bezpośrednio, na „ty", konkretnie, bez żargonu. Poważnie, ale nie „zimne korpo".
- Liczby zamiast obietnic. Zawsze pokaż metrykę + kontekst czasu („w 30 dni", „w 2 miesiące").
- CTA główne: **„Umów spotkanie"** (20-min rozmowa, bez zobowiązań).
- Wzorce headline: „{liczba} {rezultat} w {czas}", „Z {A} do {B} w {czas}", „{liczba} {rezultat} — średnio po {koszt}".
- Dowód > deklaracja: pokazuj zrzuty z Menedżera Reklam / CRM.
- Prywatność: firmy/marki można nazywać (za zgodą), osoby prywatne anonimizuj do branży; oznaczenia typu „BA" zostają anonimowe.

---

## 10. Do / Don't

**Do:** jeden mocny przekaz na widok · liczby duże w Manrope 800 · kolor punktowo · ciepłe cienie · dużo powietrza · logo klienta zawsze w białej kafli.
**Don't:** żółto-czarne „taśmy" · bursztyn jako duże pełne tło · zimna czerń w cieniach · ściany tekstu · numerowanie modułów (kolejność bywa zmienna) · mały, słabo widoczny opis usługi.

---

## 11. Kontekst biznesowy (do treści)

- **Oferta:** pozyskiwanie zainteresowanych kontaktów / umawianie spotkań / sprzedaż — dla ośrodków szkoleniowych, beauty, B2B, usług lokalnych i online.
- **USP:** jeden klient na region (ekskluzywność), gwarancja wynikowa (np. 100 kontaktów/mc), dowody z realnych kampanii.
- **Dane firmowe (stopka):** Agencja LL – Marcin Horowski · NIP 734-35-73-325 · ul. Szujskiego 13/13, 33-300 Nowy Sącz · marcin@trifectaos.pl · trifectaos.pl

---

*Design system TrifectaOS · wersja robocza wypracowana w trakcie produkcji landingu, brandingu i grafik social.*
