# LeadGen Monitor

Panel wyników kampanii Meta pod lead generation (lejek: reklama → opt-in → VSL → kalendarz).
Dla wielu kont reklamowych klientów. Pokazuje najważniejsze rzeczy:

- **koszt umówionego spotkania** (zdarzenie `Schedule`) i **koszt leada** (`Lead`), % leadów, które się umawiają,
- **wygrane reklamy**, **do skalowania**, **słabsze**, **do wyłączenia** — z uzasadnieniem,
- **nagłe spadki** (ostatnie 3 dni vs poprzednie 14): wzrost kosztu spotkania/leada, brak spotkań, spadek CTR, skok CPM, zatrzymane dostarczanie, wysoka frequency,
- **grupy docelowe**: ranking zestawów reklam + rozbicie na wiek, płeć, placement i region (kluczowe przy broad / Advantage+),
- **raporty** tygodniowe/miesięczne z rekomendacjami — do wysłania klientowi linkiem lub wydruku do PDF.

Aplikacja tylko **czyta** dane z Meta (uprawnienie `ads_read`). Niczego nie zmienia na kontach reklamowych.

---

## Jak aplikacja ocenia reklamy

Wszystkie progi ustawiasz osobno dla każdego klienta (zakładka *Ustawienia* klienta).

| Ocena | Warunek |
|---|---|
| **Do skalowania** | koszt spotkania ≤ cel, min. N spotkań (domyślnie 3), reklama aktywna, ostatnie 3 dni stabilne (koszt ≤ 120% celu), frequency poniżej ~85% limitu |
| **Wygrana** | jak wyżej, ale coś blokuje skalowanie (wysoka frequency, słabsze ostatnie dni, reklama wyłączona) |
| **Obiecująca** | koszt spotkania ≤ cel, ale za mało spotkań, żeby to potwierdzić |
| **OK** | koszt spotkania do 115% celu |
| **Słabsza** | koszt spotkania powyżej 115% celu |
| **Do wyłączenia** | wydano ≥ 2× cel bez spotkania **lub** koszt spotkania > 2× cel przy wydatku ≥ 2× cel |
| **Za mało danych** | brak spotkań, ale wydano mniej niż 2× cel |

Dodatkowo: jeśli podasz docelowy CPL, aplikacja wskaże reklamy z **tanimi leadami, które się nie umawiają** (sygnał złego dopasowania przekazu reklamy do VSL/oferty).

Okresy: 7 / 14 / 30 / 90 ostatnich pełnych dni (bez dzisiaj, jak w Ads Managerze), zawsze z porównaniem do poprzedniego okresu tej samej długości.

---

## Wymagania po stronie Meta

1. **Pixel / CAPI wysyła zdarzenie `Schedule`** po umówieniu spotkania (strona podziękowania po kalendarzu albo integracja kalendarza) oraz `Lead` po opt-inie.
   Jeśli spotkania liczysz custom conversion, wpisz jej typ w ustawieniach klienta (np. `offsite_conversion.custom.123456789`) — lista zdarzeń wykrytych na koncie jest tam widoczna.
2. **Token dostępu** — najlepiej token *System User* (nie wygasa):
   1. Business Manager → *Ustawienia firmy* → *Użytkownicy* → **Użytkownicy systemowi** → *Dodaj* (rola: Pracownik lub Administrator).
   2. *Przypisz zasoby* → zaznacz konta reklamowe klientów → uprawnienie **Wyświetlanie wyników** wystarczy.
   3. *Wygeneruj nowy token* → wybierz aplikację (jeśli nie masz: developers.facebook.com → *Utwórz aplikację* → typ *Business*) → zaznacz uprawnienia **`ads_read`** i **`business_management`** → wygaśnięcie: *Nigdy*.
   4. Skopiuj token do zmiennej `META_ACCESS_TOKEN`.

   Konta klientów muszą być udostępnione Twojemu Business Managerowi (klient dodaje Twoją agencję jako partnera z dostępem do konta reklamowego).

---

## Wdrożenie na Vercel (krok po kroku)

1. **Nowy projekt**: vercel.com → *Add New… → Project* → wybierz to repozytorium.
   - **Root Directory**: `meta-leadgen` (ważne — repo zawiera też inne aplikacje).
   - Framework: Next.js (wykryje się sam).
2. **Baza danych**: w projekcie → *Storage* → *Create Database* → **Neon (Postgres)** → połącz z projektem.
   Vercel doda zmienne bazy. Upewnij się, że istnieje **`DATABASE_URL`** (connection string z poolingiem). Jeśli integracja nazwała go inaczej, dodaj `DATABASE_URL` ręcznie z tą samą wartością.
3. **Zmienne środowiskowe** (*Settings → Environment Variables*):

   | Zmienna | Wartość |
   |---|---|
   | `DATABASE_URL` | z kroku 2 |
   | `APP_PASSWORD` | hasło do panelu dla zespołu |
   | `AUTH_SECRET` | losowy ciąg min. 32 znaki (`openssl rand -base64 32`) |
   | `META_ACCESS_TOKEN` | token System User |
   | `META_API_VERSION` | opcjonalnie, domyślnie `v23.0` |
   | `CRON_SECRET` | losowy ciąg — Vercel użyje go do autoryzacji codziennej synchronizacji |

4. **Deploy**. Build sam tworzy tabele w bazie (`prisma db push`).
5. Zaloguj się → **Ustawienia** → zobaczysz listę kont dostępnych dla tokenu → przy koncie klienta wpisz cel kosztu spotkania → **Dodaj**. Pierwsza synchronizacja (90 dni) uruchomi się automatycznie.
6. Wejdź w klienta → **Ustawienia** → ustaw docelowy CPL i progi.

**Synchronizacja**: automatycznie codziennie rano (Vercel Cron, `vercel.json`), ręcznie przyciskiem *Synchronizuj* przy kliencie lub *Synchronizuj wszystkich* na liście klientów. Każda synchronizacja odświeża ostatnie 7–30 dni, bo Meta dopisuje konwersje wstecz w oknie atrybucji.

> Plan Hobby na Vercel: crony uruchamiają się raz dziennie, a funkcja może działać do 300 s. Przy kilkudziesięciu dużych kontach część klientów zsynchronizuje się przy drugim uruchomieniu crona (są dwa) albo przyciskiem *Synchronizuj wszystkich*.

---

## Uruchomienie lokalne

```bash
cd meta-leadgen
cp .env.example .env      # uzupełnij DATABASE_URL (lokalny Postgres), APP_PASSWORD, AUTH_SECRET, META_ACCESS_TOKEN
npm install
npm run db:push           # tworzy tabele
npm run seed:demo         # opcjonalnie: klient demo z przykładowymi danymi
npm run dev               # http://localhost:3000
```

Testy logiki ocen i alertów: `npm test`.

Klienta demo możesz też dodać w aplikacji: *Ustawienia → Konto demo*.

---

## Struktura

```
prisma/schema.prisma        model danych (klienci, kampanie, zestawy, reklamy, metryki dzienne, rozbicia, raporty)
src/lib/meta/graph.ts       klient Graph API (paginacja, ponawianie przy limitach, czytelne błędy)
src/lib/meta/actions.ts     mapowanie zdarzeń Meta → leady / spotkania
src/lib/sync.ts             synchronizacja konta (90 dni na start, potem ostatnie dni)
src/lib/analytics/          metryki, ocena reklam, wykrywanie spadków
src/lib/data.ts             przygotowanie widoków, rozbicia, rekomendacje
src/lib/report.ts           budowa raportu (zapisywany jako snapshot)
src/app/(app)/              panel (lista klientów, dashboard, reklamy, grupy, raporty, ustawienia)
src/app/r/[token]/          publiczny podgląd raportu dla klienta
src/app/api/cron/sync       codzienna synchronizacja
```

## Ograniczenia (świadomie na później)

- Dane tylko z Meta — bez CRM, więc bez show-rate, zamknięć i przychodu. Koszt spotkania = koszt zdarzenia `Schedule` wg atrybucji Meta.
- Jedno wspólne hasło dla zespołu (bez osobnych kont użytkowników).
- Rekomendacje, bez automatycznych zmian budżetów/wyłączania reklam.
