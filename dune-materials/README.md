# Materiały graficzne — seria „Diuna" (pomarańcz na czerni)

Cztery samodzielne pliki HTML w spójnej, surowej estetyce inspirowanej Diuną:
ostra typografia sans-serif (Oswald + Barlow), motyw słońca/pustyni, cienkie linie,
dużo pustej przestrzeni, żadnych zaokrąglonych „korporacyjnych" kształtów.

## Pliki

| Plik | Co to | Format wydruku |
|------|-------|----------------|
| `matryca-decyzyjna.html` | Plansza z **obiema** matrycami decyzyjnymi obok siebie | **A3 poziomo** |
| `diagram-drzewo-1.html` | Samo Drzewo I — „Czy robię to, co powinienem?" | **A3 pionowo** |
| `diagram-drzewo-2.html` | Samo Drzewo II — „Zarabianie pieniędzy" (wąskie gardło) | **A3 pionowo** |
| `manifest-90-dni.html` | Manifest 90 dni, 2 strony (biała wersja do druku) | **A4 × 2** |

`generate-diagrams.cjs` to skrypt, który generuje oba samodzielne diagramy z jednego
źródła danych (żeby trzymały identyczny układ węzłów). Uruchomienie: `node generate-diagrams.cjs`.

## Jak zrobić PDF do druku

1. Otwórz plik `.html` w przeglądarce (najlepiej Chrome).
2. `Ctrl/Cmd + P` → **Zapisz jako PDF**.
3. W ustawieniach druku:
   - **Rozmiar papieru:** A3 (matryca/diagramy) lub A4 (manifest),
   - **Orientacja:** pozioma dla `matryca-decyzyjna`, pionowa dla pozostałych,
   - **Marginesy:** brak / none,
   - **Grafika w tle (Background graphics):** WŁĄCZONA — inaczej znikną kolory i wypełnienia.

Rozmiary stron są zdefiniowane w CSS (`@page`), więc plik sam „trafi" w A3/A4.

## Podgląd / udostępnianie

Każdy plik jest też opublikowany jako prywatny Artefakt na claude.ai — można go
obejrzeć w przeglądarce i wyeksportować, a w razie potrzeby udostępnić z menu strony.
