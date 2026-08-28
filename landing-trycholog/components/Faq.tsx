const faqs: { q: string; a: string; open?: boolean }[] = [
  {
    q: "Czym różni się wizyta u Ciebie od wizyty u dermatologa?",
    a: "Dermatolog poświęca zwykle kilka minut. U mnie masz pełne 60 minut szczegółowej analizy: wywiad, interpretację badań krwi i badanie skóry głowy mikrokamerą na żywo. Szukamy przyczyny, a nie tylko wyciszamy objawy na chwilę.",
    open: true,
  },
  {
    q: "Czy badanie boli?",
    a: "Nie. Badanie mikrokamerą jest w 100% bezbolesne i nieinwazyjne — bez wyrywania włosów. To po prostu oglądanie skóry głowy w powiększeniu na ekranie.",
  },
  {
    q: "To pewnie znowu drogie kosmetyki?",
    a: "Nie sprzedaję uniwersalnych, drogich kosmetyków. Dobieram celowane preparaty z apteki — specjalistyczne i takie, które w Twoim przypadku mają prawo zadziałać. Preparaty kupujesz osobno, więc dokładnie wiesz, za co płacisz.",
  },
  {
    q: "Czy to w ogóle zadziała?",
    a: "Postęp weryfikujemy twardymi zdjęciami z mikrokamery, zestawianymi na ekranie w skali 1:1. Pierwsze efekty przy łojotoku i świądzie widać w 1–2 tygodnie, zmniejszenie wypadania zwykle po 4–8 tygodniach. Jeśli organizm nie odpowiada na zabiegi nieinwazyjne, mówię o tym wprost i kieruję do lekarza — nie naciągam na kolejne wizyty.",
  },
  {
    q: "Mam ten problem od lat — czy nie jest już za późno?",
    a: "Zawsze można zatrzymać postęp i poprawić kondycję istniejących mieszków. Im wcześniej, tym więcej da się zrobić — ale rzetelna diagnoza ma sens na każdym etapie.",
  },
  {
    q: "Jak mam się przygotować do wizyty?",
    a: "Nie myj głowy przez minimum 24 godziny przed badaniem (skóra w naturalnym stanie daje prawdziwy obraz) i przynieś aktualne wyniki badań krwi, jeśli je masz.",
  },
  {
    q: "Czy przyjmujesz dzieci?",
    a: "Tak. Przyjmuję pacjentów w każdym wieku — od dzieci po seniorów. Przy problemach dzieci i młodzieży (łupież, łuska, łojotok) rodzic dostaje rzetelną diagnozę i bezpieczny plan zamiast domowych eksperymentów.",
  },
  {
    q: "Czy prowadzisz konsultacje online?",
    a: "Nie. Rzetelna diagnostyka wymaga badania skóry głowy mikrokamerą na miejscu, dlatego konsultacje odbywają się wyłącznie w gabinecie w Pruszczu Gdańskim.",
  },
  {
    q: "Jak umówić wizytę?",
    a: "Najprościej przez system rezerwacji online Booksy — wybierasz termin, który Ci pasuje. Możesz też zadzwonić pod numer 666 161 191. Telefon odbieram osobiście w godzinach pracy, a jeśli nie odbiorę — zawsze oddzwaniam.",
  },
];

export default function Faq() {
  return (
    <section className="band" id="faq">
      <div className="wrap" style={{ maxWidth: 820 }}>
        <div className="section-head center">
          <span className="eyebrow">Najczęstsze pytania</span>
          <h2>Zanim się umówisz</h2>
        </div>
        {faqs.map((f) => (
          <details className="faq" key={f.q} open={f.open}>
            <summary>
              {f.q}
              <span className="pm" aria-hidden="true">
                +
              </span>
            </summary>
            <div className="body">{f.a}</div>
          </details>
        ))}
      </div>
    </section>
  );
}
