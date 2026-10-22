# Tracker marketingu, settingu i sprzedaży

Prosta aplikacja: publiczny formularz (marketing, setting, sprzedaż) → baza → podsumowania i wskaźniki.
Specyfikacja: dokument „Struktura danych — Tracker marketingu, settingu i sprzedaży”.

Stack: Next.js 14, Prisma + Postgres (Neon na Vercelu, schemat `tracker`), Tailwind.

## Gdzie co jest

- `src/lib/fields.ts` — pola formularzy (zmiana tutaj = zmiana formularza i podsumowań)
- `src/lib/metrics.ts` — wzory wskaźników
- `src/lib/periods.ts` — tygodnie ISO, miesiące, zakresy dat
- `src/lib/entries.ts` — walidacja wpisów i reguła nakładania się zakresów
- `src/lib/session.ts`, `src/lib/auth.ts` — logowanie (podpisane ciasteczko, „Zapamiętaj mnie” = 90 dni)
- `/f/[token]` — publiczny formularz klienta
- `/logowanie` — logowanie emailem i hasłem
- `/panel` — wyniki w zakładkach Ogólny / Marketing / Setting i sprzedaż (north star na górze),
  `/panel/dane` — edycja surowych wpisów, `/panel/konto` — zmiana hasła
- `/panel/klienci` (admin) — firmy, ich linki do formularza, konta osób i administratorów;
  przełącznik w nagłówku wybiera firmę, której wyniki ogląda admin
- Arkusz Google: `src/lib/apps-script.ts` (skrypt wklejany do arkusza, z kluczem klienta),
  `src/lib/sheets.ts` (wysyłanie wpisów), `src/lib/sheet-spec.ts` (wskaźniki jako formuły arkusza —
  test pilnuje zgodności z aplikacją). Podłączenie: strona klienta → „Arkusz Google”.

## Lokalnie

```bash
cp .env.example .env   # ustaw TRACKER_DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, SESSION_SECRET
npm install
npm run db:push
npm run dev            # pierwsze logowanie danymi ADMIN_EMAIL + ADMIN_PASSWORD zakłada konto admina
npm test               # testy wzorów i sesji
```

Na Vercelu adres bazy brany jest z `database_url_POSTGRES_PRISMA_URL` (integracja Neon),
a `npm run build` sam aktualizuje tabele (`prisma db push`).
