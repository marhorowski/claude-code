import { site } from "@/lib/site";
import {
  Phone,
  Calendar,
  Check,
  XCircle,
  Info,
  Microscope,
  Vial,
  Flask,
  Target,
  ClipboardCheck,
  FileText,
  Cap,
  GoogleG,
} from "./icons";

/* ---------------------------------------------------------------- HERO --- */
export function Hero() {
  return (
    <section className="hero">
      <div className="wrap hero-grid">
        <div>
          <span className="eyebrow">Gabinet trychologiczny · {site.city}</span>
          <h1>
            Zanim kupisz kolejny szampon —&nbsp;
            <em>sprawdźmy, co naprawdę dzieje się na Twojej skórze&nbsp;głowy.</em>
          </h1>
          <p className="lede">
            Diagnostyka włosów i skóry głowy oparta na dowodach, nie na obietnicach.
            Łączę badanie mikrokamerą z wiedzą farmaceutyczną, żeby znaleźć przyczynę
            problemu i ułożyć celowany plan kuracji, który ma prawo zadziałać.
          </p>
          <div className="hero-cta">
            <a className="btn btn-primary" href="#rezerwacja">
              <Calendar /> Umów konsultację
            </a>
            <a className="btn btn-ghost" href={site.phoneHref}>
              <Phone /> {site.phoneDisplay}
            </a>
          </div>
          <a
            className="gbadge"
            href={site.googleUrl}
            target="_blank"
            rel="noopener"
            aria-label="Zobacz opinie w Google"
          >
            <GoogleG width={20} height={20} />
            <span className="stars" aria-hidden="true">
              ★★★★★
            </span>
            <span className="txt">
              Opinie w Google <span>· zobacz, co mówią podopieczni</span>
            </span>
          </a>
          <div className="chips">
            <span className="chip">
              <Check /> Gabinet przy aptece
            </span>
            <span className="chip">
              <Check /> Badanie mikrokamerą na żywo
            </span>
            <span className="chip">
              <Check /> Polskie Stowarzyszenie Trychologiczne
            </span>
          </div>
        </div>
        <div>
          <div className="arch">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/zofia.jpg" alt={`${site.person} — ${site.role}`} />
            <div className="hero-badge">
              <b>60 min</b>
              <small>tyle trwa rzetelna konsultacja — bez pośpiechu i zgadywania „na oko”</small>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Wave() {
  return (
    <svg className="wave" viewBox="0 0 1440 56" preserveAspectRatio="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M0,30 C240,58 480,2 720,16 C960,30 1200,58 1440,26 L1440,56 L0,56 Z"
      />
    </svg>
  );
}

/* --------------------------------------------------------------- STATS --- */
export function Stats() {
  const items = [
    ["60 min", "Czas jednej konsultacji diagnostycznej"],
    ["100+", "Podopiecznych przyjętych od uzyskania dyplomu"],
    ["UV", "Mikrokamera Bomtech KONG — obraz skóry na żywo"],
    ["1–2 tyg.", "Pierwsze efekty przy łojotoku i świądzie"],
  ];
  return (
    <section
      className="band"
      style={{ paddingTop: 50, paddingBottom: 50 }}
      aria-label="Gabinet w liczbach"
    >
      <div className="wrap stats">
        {items.map(([b, s]) => (
          <div className="stat" key={s}>
            <b>{b}</b>
            <span>{s}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------ MOJE PODEJŚCIE (first) -- */
export function Approach() {
  const cards = [
    {
      Icon: Target,
      tag: "Diagnoza przyczyny",
      h: "Drążę temat do skutku",
      p: "Dociekliwy wywiad, analiza badań krwi i prześwietlenie codziennej pielęgnacji. Szukam źródła problemu, nie tylko wyciszam objawy.",
    },
    {
      Icon: Microscope,
      tag: "Widać na ekranie",
      h: "Badanie mikrokamerą na żywo",
      p: "Na własne oczy widzisz na ekranie zatkane mieszki, stan skóry i gęstość włosów — koniec ze zgadywaniem „na oko”.",
    },
    {
      Icon: Flask,
      tag: "Farmacja + trychologia",
      h: "Celowana suplementacja i dermopreparaty",
      p: "Znam składy. Dobieram apteczne preparaty pod konkretny problem, a część płynów do zabiegów komponuję własnoręcznie.",
    },
    {
      Icon: ClipboardCheck,
      tag: "Praca od wewnątrz i z zewnątrz",
      h: "Dwa fronty jednocześnie",
      p: "Korekta niedoborów na podstawie wyników krwi (od wewnątrz) i odblokowanie mieszków oraz zabiegi stymulujące (od zewnątrz).",
    },
    {
      Icon: FileText,
      tag: "Konkret na wyjściu",
      h: "Plan na piśmie, nie ogólniki",
      p: "Z gabinetu wychodzisz z gotowym schematem pielęgnacji, listą preparatów i badań — dokładnie wiesz, co robić krok po kroku.",
    },
    {
      Icon: XCircle,
      tag: "Czego nie robię",
      h: "Bez cudownych obietnic",
      p: "Nie sprzedaję uniwersalnych kosmetyków bez badania i nie obiecuję nierealnych efektów. Postęp rozliczam twardymi zdjęciami z mikrokamery.",
    },
  ];
  return (
    <section id="podejscie">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow">Moje podejście</span>
          <h2>Trychologia połączona z twardą wiedzą farmaceutyczną</h2>
          <hr className="rule" />
          <p className="lede">
            Prowadzę gabinet przy aptece. Dzięki temu w jednym miejscu dostajesz
            rzetelną analitykę i sprawdzone preparaty — dobrane pod Twój problem, a nie
            pod chwytliwy slogan z reklamy.
          </p>
        </div>
        <div className="grid-3">
          {cards.map((c) => (
            <div className="card" key={c.h}>
              <div className="icon">
                <c.Icon />
              </div>
              <span className="tag">{c.tag}</span>
              <h3>{c.h}</h3>
              <p>{c.p}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ ZNASZ TO? --- */
export function Problem() {
  const pains = [
    "Kolejne szampony „na wypadanie” z drogerii — bez żadnego efektu.",
    "Suplementy łykane bez ładu i składu, „na wszelki wypadek”.",
    "Wizyta u dermatologa na 5 minut i sterydowa maść, po której problem wraca.",
    "„Poproszę coś na włosy” — w przekonaniu, że jedna flaszka załatwi sprawę.",
  ];
  return (
    <section className="band" id="znasz">
      <div className="wrap">
        <div className="problem-grid">
          <div>
            <div className="section-head" style={{ marginBottom: 26 }}>
              <span className="eyebrow">Znasz to?</span>
              <h2>Doktor Google, apteczne półki i miesiące błądzenia</h2>
              <p className="lede">
                Większość osób trafia do mnie po tym, jak samodzielnie próbowali
                rozwiązać problem — bez diagnozy, w ciemno.
              </p>
            </div>
            <ul className="pain">
              {pains.map((p) => (
                <li key={p}>
                  <XCircle />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="turn">
            <span className="eyebrow">Dlaczego to nie działa</span>
            <h3>Bez trafnej diagnozy każdy preparat to wyrzucanie pieniędzy w błoto</h3>
            <p>
              Szampon pracuje na powierzchni skóry przez dwie minuty. Suplement bez
              wskazań obciąża organizm i potrafi zafałszować wyniki badań. Prawdziwa
              przyczyna — niedobory, hormony, stan zapalny, błędy pielęgnacyjne —
              zostaje nietknięta. Dlatego zaczynamy od zrozumienia,{" "}
              <strong>dlaczego</strong> włosy wypadają, a dopiero potem dobieramy to,
              co ma prawo zadziałać.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ HELP WITH --- */
export function HelpWith() {
  const items = [
    {
      h: "Łojotokowe zapalenie skóry, łupież, sucha skóra głowy",
      p: "Stany zapalne i błędy pielęgnacyjne — najczęstszy powód wizyt. Tu efekty bywają najszybsze: głębokie oczyszczenie skóry i korekta domowej pielęgnacji przynoszą widoczną ulgę w 1–2 tygodnie.",
    },
    {
      h: "Łysienie androgenowe (kobiety i mężczyźni)",
      p: "Miniaturyzacja mieszków i cofająca się linia włosów. Pracujemy długofalowo: celowana suplementacja, dermokosmetyki i seria zabiegów stymulujących, w razie potrzeby we współpracy z lekarzem.",
    },
    {
      h: "Wypadanie telogenowe i hormonalne",
      p: "Po porodzie, w okresie peri- i menopauzy, po stresie lub restrykcyjnych dietach. Zaczynamy od badań krwi i wywiadu, bo tu przyczyna niemal zawsze leży wewnątrz organizmu.",
    },
    {
      h: "Skóra głowy dzieci i młodzieży",
      p: "Uporczywy łupież, gruba łuska, silny łojotok młodzieńczy. Rodzic dostaje rzetelną diagnozę i bezpieczny plan zamiast domowych eksperymentów.",
    },
  ];
  return (
    <section id="pomoc">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow">Z czym pomagam</span>
          <h2>Skóra głowy i włosy — u dorosłych, dzieci i seniorów</h2>
          <hr className="rule" />
          <p className="lede">
            Do gabinetu trafiają pacjenci w każdym wieku. Każdy przypadek zaczyna się
            tak samo: od rzetelnej diagnostyki, a nie od gotowego schematu.
          </p>
        </div>
        <div className="grid-2">
          {items.map((i) => (
            <div className="card" key={i.h}>
              <h3>{i.h}</h3>
              <p>{i.p}</p>
            </div>
          ))}
        </div>
        <p className="disclaimer" style={{ marginTop: 26 }}>
          <Info />
          <span>
            Nie każdy przypadek to zadanie dla trychologa. Jeśli problem wymaga
            leczenia dermatologicznego, endokrynologicznego czy ginekologicznego —
            mówię o tym wprost i kieruję do odpowiedniego specjalisty, z którym
            współpracuję.
          </span>
        </p>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- KONSULTACJA --- */
export function Offer() {
  const steps = [
    ["0–35 min", "Głęboki wywiad", "Prześwietlenie zdrowia, diety, nawyków i analiza wyników badań krwi. To trzon całej wizyty."],
    ["35–45 min", "Trichoskopia", "Badanie skóry głowy i włosów mikrokamerą, z podglądem na żywo na ekranie i dokumentacją zdjęciową."],
    ["45–60 min", "Plan działania", "Wyeliminowanie błędów pielęgnacyjnych, dobór suplementacji i ułożenie dalszej terapii."],
  ];
  const deliver = [
    ["Planem pielęgnacji", "Wyeliminowane błędy + konkretny schemat mycia i dbania o skórę głowy."],
    ["Listą preparatów i suplementów", "Rozpiska aptecznych produktów pod Twój problem — do kupienia na miejscu."],
    ["Listą celowanych badań krwi", "Spis konkretnych parametrów do wykonania, jeśli brakuje ich w diagnostyce."],
    ["Propozycją planu zabiegowego", "Harmonogram rekomendowanej serii zabiegów — jakie, ile i w jakich odstępach."],
  ];
  return (
    <section className="offer" id="offer">
      <div className="wrap">
        <div className="section-head center">
          <span className="eyebrow">Pierwszy krok</span>
          <h2>Konsultacja trychologiczna</h2>
          <p className="lede">
            Jedna wizyta w gabinecie, na której znajdujemy przyczynę problemu i
            wychodzisz z konkretnym planem działania. To właściwy początek każdej
            kuracji.
          </p>
        </div>
        <div className="offer-card">
          <div className="offer-top">
            <div className="offer-main">
              <h3 style={{ fontSize: "1.4rem", marginBottom: 6 }}>
                60 minut, trzy etapy, zero pośpiechu
              </h3>
              <p style={{ color: "var(--ink-soft)" }}>
                Dermatolog poświęca kilka minut. U mnie masz pełną godzinę
                szczegółowej analizy i badanie mikrokamerą na żywo.
              </p>
              <div className="steps">
                {steps.map(([t, b, p]) => (
                  <div className="step" key={b}>
                    <time>{t}</time>
                    <b>{b}</b>
                    <p>{p}</p>
                  </div>
                ))}
              </div>
              <h4 className="deliver-h">Z tej wizyty wychodzisz z:</h4>
              <ul className="deliver">
                {deliver.map(([b, s]) => (
                  <li key={b}>
                    <Check />
                    <div>
                      <b>{b}</b>
                      <span>{s}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="offer-side">
              <span className="eyebrow" style={{ color: "var(--gold-2)" }}>
                Cena
              </span>
              <div className="price">{site.consultationPrice}</div>
              <div className="dur">Czas trwania: 60 minut · w gabinecie</div>
              <ul>
                <li>
                  <Check /> Badanie mikrokamerą UV
                </li>
                <li>
                  <Check /> Interpretacja badań krwi
                </li>
                <li>
                  <Check /> Gotowy plan na piśmie
                </li>
              </ul>
              <a className="btn btn-gold" href="#rezerwacja">
                <Calendar /> Rezerwuj przez Booksy
              </a>
              <a className="btn offer-tel" href={site.phoneHref}>
                <Phone /> {site.phoneDisplay}
              </a>
            </div>
          </div>
        </div>
        <p className="prep-note">
          Przed wizytą nie myj głowy przez min. 24 h i przynieś aktualne wyniki badań
          krwi, jeśli je masz.
        </p>
      </div>
    </section>
  );
}

/* --------------------------------------------------------- DIAGNOSTYKA --- */
export function Diagnostics() {
  return (
    <section id="diagnostyka">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow">Diagnostyka i sprzęt</span>
          <h2>Widzisz to samo, co ja — na ekranie</h2>
          <hr className="rule" />
          <p className="lede">
            Diagnoza nie opiera się na deklaracjach, tylko na obrazie skóry głowy i
            wynikach badań. To one decydują o planie kuracji.
          </p>
        </div>
        <div className="grid-2">
          <div className="card">
            <div className="icon">
              <Microscope />
            </div>
            <h3>Mikrokamera ze światłem UV — Bomtech KONG</h3>
            <p>
              Skóra głowy w dużym powiększeniu, na żywo na ekranie. Widzisz zatkane
              mieszki, stan skóry, gęstość włosów i miniaturyzację cebulek — a w
              świetle UV także „mikrożycie” na skórze. Zdjęcia zapisujemy, żeby
              później porównać efekty.
            </p>
          </div>
          <div className="card">
            <div className="icon">
              <Vial />
            </div>
            <h3>Badania krwi — zlecam i interpretuję sama</h3>
            <p>
              Morfologia, ferrytyna, witamina D3, a w zależności od wywiadu panel
              tarczycowy i lipidogram. Wyniki czytam sama, łącząc wiedzę
              farmaceutyczną z trychologiczną — bez odsyłania „gdzie indziej”.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- PROCES --- */
export function Process() {
  const steps = [
    ["Pierwszy kontakt i przygotowanie", "Rezerwujesz termin przez Booksy lub telefonicznie. Dostajesz krótką instrukcję: nie myj głowy min. 24 h przed badaniem i przynieś aktualne wyniki badań krwi, jeśli je masz."],
    ["Wizyta diagnostyczna (60 min)", "Wywiad, trichoskopia mikrokamerą i plan działania. Na miejscu korygujemy błędy pielęgnacyjne i ustalamy schemat suplementacji oraz dermokosmetyków do kupienia w aptece."],
    ["Etap 1 — oczyszczanie", "Zabieg wstępny odblokowujący zapchane mieszki, usuwający łuskę lub redukujący stan zapalny. To przygotowanie skóry do przyjmowania substancji aktywnych."],
    ["Etap 2 — terapia właściwa (3–6 miesięcy)", "Seria celowanych zabiegów w gabinecie połączona z konsekwentną pielęgnacją domową i suplementacją apteczną. Między wizytami masz ze mną kontakt telefoniczny i mailowy."],
    ["Etap 3 — kontrola i ocena efektów", "Ponowna trichoskopia i zestawienie zdjęć z mikrokamery na ekranie w skali 1:1. Twarda ocena postępów i plan podtrzymujący efekty. Zero zgadywania — tylko dowody na ekranie."],
  ];
  return (
    <section className="band" id="proces">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow">Jak wygląda współpraca</span>
          <h2>Od telefonu do trwałego efektu — krok po kroku</h2>
          <hr className="rule" />
          <p className="lede">
            Terapia trychologiczna wymaga czasu i systematyczności. Oto dokładnie, na
            co się umawiasz.
          </p>
        </div>
        <div className="timeline">
          {steps.map(([h, p]) => (
            <div className="tl" key={h}>
              <div className="num" aria-hidden="true" />
              <div>
                <h3>{h}</h3>
                <p>{p}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- ZABIEGI --- */
export function Treatments() {
  const items: { tag?: string; h: string; p: string }[] = [
    { tag: "Autorski", h: "Zabieg oczyszczający z infuzją tlenową", p: "Głębokie oczyszczenie skóry głowy z użyciem płynów, które komponuję własnoręcznie pod problem pacjenta. Odblokowuje mieszki i przygotowuje skórę do dalszej pracy." },
    { h: "Mezoterapia mikroigłowa", p: "Wprowadzenie dobranej ampułki bezpośrednio w skórę głowy, by pobudzić mieszki i wzmocnić cebulki." },
    { h: "Laseroterapia LLLT", p: "Niskopoziomowe światło laserowe (Hairmax) stymulujące skórę głowy i wspierające włosy w fazie wzrostu." },
    { h: "Darsonvalizacja skóry głowy", p: "Delikatna stymulacja skóry poprawiająca jej ukrwienie i kondycję — element serii zabiegowej." },
    { tag: "Autorski", h: "Zabieg silnie stymulujący", p: "Autorskie połączenie darsonvalizacji, mezoterapii mikroigłowej i LLLT w jednej wizycie — dla najbardziej wymagających przypadków." },
  ];
  return (
    <section id="zabiegi">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow">Zabiegi gabinetowe</span>
          <h2>Dobierane po diagnozie — nigdy przed nią</h2>
          <hr className="rule" />
          <p className="lede">
            Zabiegi są elementem planu, który układamy na konsultacji. Poniżej te,
            które wykonuję najczęściej.
          </p>
        </div>
        <div className="grid-3">
          {items.map((i) => (
            <div className="card" key={i.h}>
              {i.tag && <span className="tag">{i.tag}</span>}
              <h3>{i.h}</h3>
              <p>{i.p}</p>
            </div>
          ))}
          <div
            className="card"
            style={{
              background: "rgba(45,72,53,.06)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <h3>Nie wiesz, czego potrzebujesz?</h3>
            <p>
              I nie musisz wiedzieć. To konsultacja pokaże, które zabiegi mają sens w
              Twoim przypadku — a które byłyby zbędnym kosztem.
            </p>
            <a
              className="btn btn-primary"
              href="#rezerwacja"
              style={{ marginTop: 14, alignSelf: "flex-start" }}
            >
              Zacznij od konsultacji
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- MITY --- */
export function Myths() {
  const myths = [
    ["Częste mycie nasila wypadanie włosów.", "Mycie usuwa łój zapychający mieszki. Głowę myjemy tak często, jak wymaga tego skóra — nie rzadziej „na wszelki wypadek”."],
    ["Odpowiedni szampon zahamuje wypadanie.", "Szampon działa na powierzchni skóry przez dwie minuty. Realna praca dzieje się od wewnątrz i przez celowane wcierki."],
    ["Biotyna rozwiąże każdy problem z włosami.", "Nadmiar biotyny bez wskazań nie pomaga, a potrafi zafałszować wyniki badań tarczycy. Suplementujemy to, czego naprawdę brakuje."],
    ["Ścinanie włosów sprawia, że rosną gęstsze.", "Obcinanie nie ma żadnego wpływu na mieszek włosowy ukryty pod skórą. Gęstość rodzi się w skórze, nie na końcówkach."],
    ["Wypadanie włosów to zawsze kwestia genetyki.", "W większości przypadków odpowiadają za nie niedobory, hormony, stres i błędy w pielęgnacji — a to da się zbadać i skorygować."],
  ];
  return (
    <section className="myths" id="mity">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow">Prostuję na pierwszej wizycie</span>
          <h2>Pięć mitów o włosach, w które nie warto wierzyć</h2>
        </div>
        {myths.map(([m, f]) => (
          <div className="myth" key={m}>
            <div className="m">
              <span className="lab">Mit</span>
              <p>{m}</p>
            </div>
            <div className="f">
              <span className="lab">Jak jest naprawdę</span>
              <p>{f}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- CASES --- */
export function Cases() {
  const cases = [
    {
      who: "Mężczyzna, 35 lat",
      rows: [
        ["Problem", "Nasilone wypadanie przy każdym myciu i cofająca się linia włosów — początki zakoli."],
        ["Wcześniej", "Drogeryjne szampony „na wypadanie” na własną rękę — bez rezultatu."],
        ["Diagnoza", "Początkowe łysienie androgenowe (widoczna miniaturyzacja mieszków) + znaczny niedobór witaminy D3."],
        ["Plan i czas", "Celowana suplementacja D3, seria 4 zabiegów mezoterapii mikroigłowej, praca domowa. 4 miesiące."],
      ],
      quote: "„Żona powiedziała, że jest znacznie lepiej i zakola przestały rzucać się w oczy.”",
    },
    {
      who: "Dziecko, 10 lat",
      rows: [
        ["Problem", "Nawracający gruby łupież, płatowa łuska i gwałtowne przetłuszczanie się włosów."],
        ["Wcześniej", "Standardowe szampony dziecięce i łagodne preparaty drogeryjne — nie radziły sobie z łuską."],
        ["Diagnoza", "Łojotokowe zapalenie skóry. Trichoskopia pokazała złogi blokujące ujścia mieszków."],
        ["Plan i czas", "Gabinetowy zabieg oczyszczający z autorskim preparatem na bazie mocznika, pielęgnacja domowa, korekta diety. Odblokowanie po 1 zabiegu, stabilizacja w 2–3 tygodnie."],
      ],
      quote: "Ogromna ulga u mamy, u dziecka ustąpił świąd, a skóra głowy odzyskała zdrową kondycję.",
    },
    {
      who: "Kobieta, 37 lat",
      rows: [
        ["Problem", "Nasilone wypadanie i utrata gęstości od roku. Przekonana, że sama „niszczy sobie włosy”."],
        ["Wcześniej", "Ciągłe zmiany kosmetyków i diety wykluczające bez konsultacji, które pogłębiły problem."],
        ["Diagnoza", "Łysienie androgenowe typu żeńskiego nałożone na wypadanie telogenowe i stan zapalny skóry."],
        ["Plan i czas", "Pilna konsultacja u zaprzyjaźnionego dermatologa, leczenie lekarskie, celowana Omega-3, wyciszanie stanu zapalnego w gabinecie. Terapia w toku — stan zapalny wyciszony."],
      ],
      quote: "Odzyskała spokój i poczucie kontroli — od płaczu i poczucia winy do jasnego planu na przyszłość.",
    },
  ];
  return (
    <section id="efekty">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow">Efekty i przypadki</span>
          <h2>Trzy historie z gabinetu</h2>
          <hr className="rule" />
          <p className="lede">
            Prawdziwe przypadki podopiecznych — z zachowaniem anonimowości. Pokazują,
            jak wygląda droga od problemu do jego rozwiązania.
          </p>
        </div>
        <div className="grid-3">
          {cases.map((c) => (
            <div className="case" key={c.who}>
              <span className="who">{c.who}</span>
              <dl>
                {c.rows.map(([dt, dd]) => (
                  <div key={dt}>
                    <dt>{dt}</dt>
                    <dd>{dd}</dd>
                  </div>
                ))}
              </dl>
              <p className="quote">{c.quote}</p>
            </div>
          ))}
        </div>

        <div className="voices">
          <div className="voice">
            <p>„Wreszcie ktoś mi wytłumaczył, skąd bierze się mój problem.”</p>
            <span>— najczęstsza reakcja po pierwszej wizycie</span>
          </div>
          <div className="voice">
            <p>„Super, że patrzy pani na problem całościowo.”</p>
            <span>— podopieczna gabinetu</span>
          </div>
        </div>

        <p className="disclaimer">
          <Info />
          <span>
            Cytaty pochodzą od podopiecznych gabinetu i zostały zanonimizowane.
            Trychologia nie jest leczeniem — nie obiecuję gwarancji 100% odrostu;
            gwarantuję rzetelną diagnostykę i uczciwe rozliczenie efektów podczas wizyt
            kontrolnych, na podstawie porównania zdjęć z mikrokamery na ekranie.
          </span>
        </p>
      </div>
    </section>
  );
}

/* -------------------------------------------------------- O MNIE + GABINET */
export function About() {
  return (
    <section className="band" id="omnie">
      <div className="wrap">
        <div className="about-grid">
          <div className="about-copy">
            <span className="eyebrow">O mnie</span>
            <h2 style={{ margin: "12px 0 18px" }}>
              Do trychologii doprowadziły mnie… własne włosy
            </h2>
            <p>
              Wszystko zaczęło się od mojej wpadki z trwałą ondulacją, po której włosy
              były w opłakanym stanie. Szukając ratunku, trafiłam na profile zawodowych
              trycholożek — i przepadłam w tym świecie bez reszty.
            </p>
            <p>
              Na co dzień pracuję w aptece. Przy okienku niemal codziennie widzę osoby,
              które łykają suplementy na włosy „jak pelikany”, licząc na natychmiastowy
              cud. Bez trafnej diagnozy to jednak tylko wyrzucanie pieniędzy i
              obciążanie organizmu. Zrozumiałam, że moją supermocą jest dokładna
              znajomość składów i precyzyjny dobór dermokosmetyków oraz suplementacji
              pod konkretny, zdiagnozowany problem.
            </p>
            <p>
              Poszłam na studia podyplomowe z trychologii, żeby połączyć twardą wiedzę
              diagnostyczną z praktyką farmaceutyczną. Dziś w gabinecie nie sprzedaję
              obietnic ani powtarzalnych schematów — łączę badanie mikrokamerą z
              celowanym doborem preparatów, które naprawdę mają prawo zadziałać.
            </p>
            <ul className="creds">
              <li>
                <Cap />
                <span>
                  <b>Trycholog kosmetologiczny</b> — Wyższa Szkoła Zdrowia w Gdańsku
                  (dyplom 2025)
                </span>
              </li>
              <li>
                <Cap />
                <span>
                  <b>Psychologia w biznesie</b> — Uniwersytet WSB Merito (2024)
                </span>
              </li>
              <li>
                <Flask />
                <span>
                  <b>Technik farmaceutyczny</b> — Studium Farmaceutyczne w Gdańsku
                  (2006)
                </span>
              </li>
              <li>
                <Check />
                <span>
                  Członkini <b>Polskiego Stowarzyszenia Trychologicznego</b> (od 2025)
                </span>
              </li>
            </ul>
          </div>
          <div>
            <figure className="media-frame" style={{ margin: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/img/gabinet.jpg"
                alt="Gabinet trychologiczny w Pruszczu Gdańskim — stanowisko z mikrokamerą"
              />
              <figcaption>Gabinet w Pruszczu Gdańskim</figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- CENNIK --- */
export function Pricing() {
  const rows: { n: string; sub?: string; v: string }[] = [
    { n: "Konsultacja trychologiczna", sub: "Pełna diagnostyka, 60 min", v: "190 zł" },
    { n: "Wizyta kontrolna", sub: "Trichoskopia i ocena postępów, 30 min", v: "100 zł" },
    { n: "Autorski zabieg oczyszczający", sub: "z infuzją tlenową", v: "250 zł" },
    { n: "Mezoterapia mikroigłowa", v: "280 zł" },
    { n: "Laseroterapia LLLT", v: "70 zł" },
    { n: "Darsonvalizacja skóry głowy", v: "50 zł" },
    { n: "Autorski zabieg silnie stymulujący", sub: "Darsonval + mezoterapia + LLLT", v: "350 zł" },
  ];
  return (
    <section id="cennik">
      <div className="wrap">
        <div className="section-head center">
          <span className="eyebrow">Cennik</span>
          <h2>Przejrzyste ceny — bo zaufanie zaczyna się od jasności</h2>
        </div>
        <div className="price-wrap">
          <div className="card">
            <div className="price-list">
              {rows.map((r, idx) => (
                <div className={`price-row${idx === 0 ? " highlight-row" : ""}`} key={r.n}>
                  <span className="n">
                    {r.n}
                    {r.sub && <small>{r.sub}</small>}
                  </span>
                  <span className="v">{r.v}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="price-note">
            Preparaty i suplementy z apteki kupujesz osobno, na podstawie schematu z
            konsultacji. Dostępne pakiety zabiegowe — szczegóły ustalamy na wizycie.
          </p>
        </div>
      </div>
    </section>
  );
}
