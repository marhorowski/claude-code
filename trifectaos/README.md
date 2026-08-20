# TrifectaOS — pakiet marki i materiały

Materiały wizualne i landing page dla agencji **TrifectaOS / Trifecta Agency**
(System Pełnej Grupy™ — pozyskiwanie zainteresowanych dla ośrodków szkolenia zawodowego).

## Struktura

```
trifectaos/
├── landing/
│   └── index.html                     # Landing page (samodzielny HTML+CSS, gotowy pod GHL)
├── brand/
│   ├── brand-tokens.css               # Tokeny kolorów/typografii do reużycia
│   ├── sygnet-transparent-1024.png    # Sygnet (trójkąt Penrose'a), przezroczyste tło
│   ├── sygnet-white-1024.png          # Sygnet na białym
│   ├── sygnet-white-padded-1024.png   # Sygnet na białym z marginesem
│   └── akademia-icon-128.png          # Ikona Trifecta Agency Akademia (128×128)
└── social/
    ├── facebook-cover.png                     # Cover FB 1702×630
    ├── ig-cover-wyniki-klientow.png           # Okładka serii IG „Wyniki klientów" 1080×1920
    ├── skool-akademia-cover-1084x576.png      # Cover społeczności Skool (Akademia)
    └── wyniki-klientow/                        # 10 grafik wyników klientów (IG Stories 1080×1920)
        └── cs1.png … cs10.png
```

## Landing page (GHL)

`landing/index.html` to jeden samodzielny plik HTML+CSS. Wklej całą zawartość w
element **Custom Code / HTML** na nowej stronie/funnelu w GoHighLevel.

- **Kalendarz** jest już wpięty (iframe LeadConnector) — działa od razu.
- **Full-bleed + skrypt** na końcu pliku wypełniają pełną szerokość ekranu i
  zerują pionowy padding kontenera GHL (bez białych pasów). Jeśli plan GHL wycina
  `<script>`, ustaw ręcznie: Sekcja → Full Width + padding = 0.
- Zdjęcia dowodów i portret founbera podpięte jako URL-e z mediów GHL (filesafe CDN).

## Marka — skrót

- **Klimat:** industrialna hybryda B2B — jasne tło, mocna typografia, kolor punktowo.
- **Kolory:** bursztyn `#F5A01B`, brąz `#8A5A12`, grafit `#161513`, tło `#FAF9F7`.
- **Fonty:** Manrope (nagłówki 800), Inter (tekst). Google Fonts.
- Pełne tokeny: `brand/brand-tokens.css`.
