# CSM Tracker — KPI działu Customer Success

Aplikacja do śledzenia 36 KPI działu CSM agencji lead gen (Meta Ads) w 6 obszarach:
retencja i MRR, upsell, onboarding, zadowolenie i ryzyko, wyniki klientów, proces.
Stack jak w KPI trackerze sprzedaży: Next.js 14, Prisma + Postgres, NextAuth, Tailwind, Recharts.
To osobna aplikacja z własną bazą i własnym deployem.

## Jak działa

- **Każdy CSM wpisuje liczby zbiorcze za swój portfel**, a aplikacja sumuje zespół. Średnie (czasy) są ważone.
- **Formularz tygodniowy** zbiera dane pod 8 KPI kluczowych (raport dla zarządu, narastająco w miesiącu).
  **Formularz miesięczny** to pełny zestaw. Przycisk „Uzupełnij z tygodni” przenosi sumy z tygodni do pustych pól.
- **Dane agencji** (CAC, marża brutto, nowi klienci, polecenia) wpisuje lider w formularzu miesięcznym.
- **Ankiety NPS i CSAT** mają osobne publiczne linki (`/a/<token>`), dla CSAT osobno dla każdego etapu:
  onboarding, raport, call strategiczny, inne. Link można przypisać do CSM. NPS liczy się narastająco w kwartale, CSAT w miesiącu.
- **Grading** (edytowalny w Ustawieniach): 🔴 < 65% normy · 🟠 65–95% · 🟢 95–120% · 🥇 > 120%.
  Dla metryk „niżej = lepiej” (churn, czasy, At-Risk, eskalacje, klienci na CSM) % normy = norma / wynik.
- **Standardy KPI** domyślnie pochodzą z dokumentu „KPI działu CSM” i można je zmienić w Ustawieniach.
- Wzory są w `src/lib/kpis.ts`, a testy w `src/lib/report.test.ts` (`npm test`).

### Role

| Rola | Dostęp |
|------|--------|
| **Lider CSM** | Wszystko: dashboard zespołu i każdego CSM, formularze za dowolny portfel, zespół, ankiety, ustawienia |
| **CSM** | Własne formularze i własne wyniki |
| **Klient** | Tylko publiczny link do ankiety (bez logowania) |

## Uruchomienie lokalne

```bash
cd csm-tracker
npm install
cp .env.example .env      # uzupełnij DATABASE_URL, NEXTAUTH_SECRET, SETUP_TOKEN
npx prisma db push
npm run dev
```

Następnie otwórz `http://localhost:3000/api/setup?token=<SETUP_TOKEN>`. Utworzy to konto lidera
`lider@agencja.pl` / `LiderCSM2026!`. **Zmień hasło po pierwszym logowaniu** (Ustawienia → Moje konto),
a potem dodaj CSM-ów w Ustawieniach → Użytkownicy.

## Deploy na Vercel

1. Nowy projekt w Vercel z tego repozytorium, **Root Directory: `csm-tracker`**.
   Główny `vercel.json` repo dotyczy aplikacji `taskflow` i nie jest tu używany.
2. Podłącz bazę Postgres (np. Vercel Postgres / Neon) i ustaw zmienne:
   - `DATABASE_URL` — connection string z poolingiem (w Neon/Vercel: `POSTGRES_PRISMA_URL`)
   - `NEXTAUTH_SECRET` — np. `openssl rand -base64 32`
   - `NEXTAUTH_URL` — adres aplikacji, np. `https://csm.twoja-domena.pl`
   - `SETUP_TOKEN` — dowolny sekret do jednorazowego `/api/setup`
3. Build (`npm run vercel-build`) sam synchronizuje schemat bazy (`prisma db push`).
