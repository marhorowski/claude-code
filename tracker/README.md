# Tracker marketingu, settingu i sprzedaży

Prosta aplikacja: publiczny formularz (marketing, setting, sprzedaż) → baza → podsumowania i wskaźniki.
Specyfikacja: dokument „Struktura danych — Tracker marketingu, settingu i sprzedaży”.

Stack: Next.js 14, Prisma + Postgres (Neon na Vercelu, schemat `tracker`), Tailwind.

## Gdzie co jest

- `src/lib/fields.ts` — pola formularzy (zmiana tutaj = zmiana formularza i podsumowań)
- `src/lib/metrics.ts` — wzory wskaźników
- `src/lib/periods.ts` — tygodnie ISO, miesiące, zakresy dat
- `src/lib/entries.ts` — walidacja wpisów i reguła nakładania się zakresów
- `/f/[token]` — publiczny formularz klienta
- `/panel` — wyniki (dni / tygodnie / miesiące), `/panel/dane` — edycja surowych wpisów

## Lokalnie

```bash
cp .env.example .env   # ustaw TRACKER_DATABASE_URL i ADMIN_PASSWORD
npm install
npm run db:push
npm run dev            # panel: login "admin" + ADMIN_PASSWORD
npm test               # testy wzorów
```

Na Vercelu adres bazy brany jest z `database_url_POSTGRES_PRISMA_URL` (integracja Neon),
a `npm run build` sam aktualizuje tabele (`prisma db push`).
