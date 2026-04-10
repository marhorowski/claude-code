# Sales KPI Dashboard — Instrukcja uruchomienia

Pełna aplikacja webowa do śledzenia KPI sprzedażowych i marketingowych.
Stack: Next.js 14, SQLite + Prisma, NextAuth.js, Tailwind CSS, Recharts.

---

## Wymagania

- Node.js 18+
- npm 9+

---

## Krok 1 — Klonowanie i instalacja

```bash
git clone <url-repozytorium>
cd sales-kpi-dashboard
npm install
```

---

## Krok 2 — Konfiguracja środowiska

Skopiuj plik `.env.example` do `.env`:

```bash
cp .env.example .env
```

Edytuj `.env`:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="zmien-to-na-dlugi-losowy-klucz-min-32-znaki"
NEXTAUTH_URL="http://localhost:3000"
```

> **Ważne:** Na produkcji zmień `NEXTAUTH_SECRET` na bezpieczny, losowy ciąg znaków (np. `openssl rand -base64 32`).

---

## Krok 3 — Migracja bazy danych

```bash
npx prisma migrate dev --name init
```

Baza SQLite zostanie utworzona w `prisma/dev.db`.

---

## Krok 4 — Seedowanie (pierwsze uruchomienie)

```bash
npx prisma db seed
```

Zostaną utworzone:
- Klient szablonowy "Mój Pierwszy Klient"
- 53 cele KPI (standard 26 Keys)
- 2 konta użytkowników (Admin + Lider)

### Dane do logowania:

| Rola | Email | Hasło |
|------|-------|-------|
| Admin | `admin@firma.pl` | `Admin2026!` |
| Lider Sprzedaży | `lider@firma.pl` | `Lider2026!` |

> **⚠️ Zmień hasła po pierwszym logowaniu!** (Ustawienia → Moje konto)

---

## Krok 5 — Uruchomienie lokalne

```bash
npm run dev
```

Aplikacja dostępna pod: http://localhost:3000

---

## Krok 6 — Konfiguracja po pierwszym logowaniu

1. **Zaloguj się** jako Admin
2. **Ustawienia → Klienci** — zmień nazwę klienta szablonowego lub dodaj nowego
3. **Ustawienia → Cele KPI** — ustaw cele dla swojego klienta (domyślnie załadowane standardy 26 Keys)
4. **Ustawienia → Użytkownicy** — dodaj closerów, setterów, liderów
5. **Dzienny** — zacznij wpisywać dane

---

## Krok 7 — Deploy na Vercel

### Opcja A: CLI

```bash
npm install -g vercel
npx vercel deploy
```

### Opcja B: GitHub + Vercel

1. Wypchnij kod na GitHub
2. Połącz repo z Vercel (vercel.com)
3. Ustaw zmienne środowiskowe w panelu Vercel:
   - `DATABASE_URL` = ścieżka do bazy (lub connection string dla PlanetScale/Turso)
   - `NEXTAUTH_SECRET` = bezpieczny klucz
   - `NEXTAUTH_URL` = https://twoja-domena.vercel.app

> **Uwaga:** SQLite nie działa w środowiskach serverless. Na Vercel użyj:
> - [Turso](https://turso.tech) (SQLite edge database)
> - [PlanetScale](https://planetscale.com) (MySQL, zmień provider w schema.prisma)
> - [Supabase](https://supabase.com) (PostgreSQL, zmień provider w schema.prisma)

---

## Struktura ról

| Rola | Możliwości |
|------|-----------|
| **ADMIN** | Pełny dostęp: wszystkie dashboardy, formularze, ustawienia, wszystkie klienty |
| **LIDER** | Własni klienci: dashboardy tygodniowe/miesięczne, formularz tygodniowy, widok zespołu |
| **CLOSER** | Tylko własny formularz dzienny (closing) |
| **SETTER** | Tylko własny formularz dzienny (setting) |

---

## Obsługiwane strategie marketingowe (26 Keys)

KPI są podzielone na kategorie:

- **Finance (Universal):** ROAS, GP, LTV:CAC, LTV, ALPVC, CAC, RPE
- **Sales (Universal):** SUR, CP, ATTS
- **Operations (Universal):** RR, DR
- **Paid Lead Gen:** MER, CPM, CTR, CPLC, OIR, CPL, EOR, ECR, APLR, LTS, AOV, AR
- **Liquidated:** CVR, CAR, BTR, OTOTR
- **Organic:** ROTI, TER, TAC, RRC
- **Organic DM:** DMVOL, DMOPR, DMTRR, DMDCR, DMBCR
- **Organic Email:** EVOL, ERR, EQR, EBCR, EDELR
- **Organic Content:** AUDG, ENGE, CF, IDMR, C2L, CREF
- **Sales Volume:** Leads, Meetings Booked/Attended, Closings, Revenue

### System gradingu (taki sam dla każdej metryki):
- 🔴 **Red Flag** = poniżej 50% standardu
- 🟠 **Orange** = 50–99% standardu
- 🟢 **Green** = 100–149% standardu
- 🥇 **God Mode** = 150%+ standardu
- Metryki [INVERTED] — niższy wynik jest lepszy (grading odwrócony)

---

## Komendy pomocnicze

```bash
# Otwórz Prisma Studio (GUI bazy danych)
npx prisma studio

# Reset bazy i ponowne seedowanie
npx prisma migrate reset

# Generowanie klienta Prisma po zmianach schematu
npx prisma generate

# Build produkcyjny
npm run build

# Start produkcyjny
npm start
```

---

## Troubleshooting

**Problem:** Błąd `NEXTAUTH_SECRET not found`
**Rozwiązanie:** Upewnij się, że plik `.env` istnieje i zawiera `NEXTAUTH_SECRET`

**Problem:** Baza danych nie istnieje
**Rozwiązanie:** Uruchom `npx prisma migrate dev --name init`

**Problem:** Strona pusta po logowaniu
**Rozwiązanie:** Sprawdź czy seed został uruchomiony (`npx prisma db seed`)
