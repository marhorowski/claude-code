# Ergon — zarządzanie zadaniami

Prosta, osobista aplikacja do zarządzania zadaniami w ciemnej, grecko-inspirowanej estetyce.
Stack: Next.js 14, TypeScript, Tailwind CSS, Zustand (dane w localStorage przeglądarki — zero konfiguracji).

## Funkcje

- **Skrzynka odbiorcza** — braindump: dodawanie zadań Enterem (tytuł + data), segregacja później
- **Projekty** — własne projekty, dodawanie zadań bezpośrednio w projekcie, filtrowanie
- **Szczegóły zadania** — opis, checklista, estymacja, fokusy
- **Pomodoro** — play/pauza na zadaniu, konfigurowalne interwały pracy/przerw, łączny czas per zadanie liczony automatycznie
- **Koniec zadania** — ekran gratulacji, notatka z wnioskami, ocena czasu; „będę robić to częściej?" → automatyczne zadanie „Stwórz proces: …" w projekcie „Procesy do stworzenia" na jutro
- **Zakończ dzień pracy** — podsumowanie godzin i zadań + wytyczne (AI przez klucz `ANTHROPIC_API_KEY`, bez klucza — lokalny generator)
- **Cele** — cel → mierniki (np. 50 rozmów sprzedażowych), powiązanie projektów z celem, licznik godzin na realizację celu
- **Plan** — zadania na dziś (pogrupowane po projektach), jutro i w tym tygodniu
- **Ustalanie dnia / tygodnia** — moduł planowania z podglądem celów, projektów i przepracowanych godzin
- **Baner celu głównego** + fokus dnia (czerwone podświetlenie zadań) i fokus tygodnia (brązowe)
- **Liczniki** — zadania/godziny dziś i w tym tygodniu, zrobione vs. pozostałe
- **Archiwum** — ukończone zadania z wnioskami + podsumowania dni

## Uruchomienie

```bash
npm install
npm run dev        # http://localhost:3000
```

Opcjonalnie (podsumowania AI): ustaw zmienną środowiskową `ANTHROPIC_API_KEY`.

## Deploy na Vercel

Aplikacja nie wymaga bazy danych — wystarczy wskazać ten katalog (`taskflow/`) jako root projektu.
