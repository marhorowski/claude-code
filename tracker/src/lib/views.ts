// Zakładki dashboardu: każda odpowiada na jedno pytanie, a north star to liczby, które na nie odpowiadają.

export type ViewKey = "ogolny" | "marketing" | "setting-sprzedaz";

export interface KpiDef {
  key: string;
  /** Krótkie wyjaśnienie pod liczbą (definicja, nie powtórzenie wartości). */
  hint: string;
}

export type PanelKind =
  /** Etapy lejka: pasek i % względem pierwszego etapu. */
  | "funnel"
  /** Etapy, gdzie liczy się przejście z poprzedniego kroku (np. wyświetlenia → kliknięcia). */
  | "steps"
  /** Części całości: pasek i % względem wiersza „total”. */
  | "parts"
  /** Same wartości (np. koszty), pasek względem największej. */
  | "values";

export interface PanelDef {
  title: string;
  kind: PanelKind;
  rows: { key: string; label: string }[];
  /** Dla „parts”: klucz całości, od której liczymy udział. */
  total?: string;
  note: string;
}

export interface ViewDef {
  key: ViewKey;
  label: string;
  question: string;
  northStar: KpiDef[];
  panels: PanelDef[];
}

export const VIEWS: ViewDef[] = [
  {
    key: "ogolny",
    label: "Ogólny",
    question: "Czy lejek zarabia i ile kosztuje klient?",
    northStar: [
      { key: "totalRevenue", hint: "Zakontraktowany, netto, z follow-upami" },
      { key: "totalClosings", hint: "Pierwsze spotkania + follow-upy" },
      { key: "roas", hint: "Przychód na 1 zł wydany na reklamy" },
      { key: "cac", hint: "Wydatek na reklamy na jedną sprzedaż" },
      { key: "leads", hint: "Zgłoszenia z marketingu" },
      { key: "leadToClose", hint: "Sprzedaże łącznie / leady" },
    ],
    panels: [
      {
        title: "Lejek",
        kind: "funnel",
        rows: [
          { key: "leads", label: "Leady" },
          { key: "bookedTotal", label: "Umówione rozmowy (setter + VSL)" },
          { key: "attendedMeetings", label: "Odbyte spotkania pierwsze" },
          { key: "totalClosings", label: "Sprzedaże łącznie" },
        ],
        note: "Udział względem leadów z tego samego okresu.",
      },
      {
        title: "Koszt na etap",
        kind: "values",
        rows: [
          { key: "cpl", label: "Lead (CPL)" },
          { key: "totalCostPerCall", label: "Umówiona rozmowa" },
          { key: "cac", label: "Klient (CAC)" },
        ],
        note: "Wydatek na reklamy podzielony przez liczbę na danym etapie.",
      },
    ],
  },
  {
    key: "marketing",
    label: "Marketing",
    question: "Ile kosztuje lead i rozmowa?",
    northStar: [
      { key: "adSpend", hint: "Łączny budżet reklam w okresie" },
      { key: "leads", hint: "Zgłoszenia, ankiety, zapisy" },
      { key: "cpl", hint: "Wydatek / leady" },
      { key: "marketingCostPerCall", hint: "Wydatek / rozmowy umówione z VSL" },
      { key: "ctr", hint: "Kliknięcia / wyświetlenia" },
      { key: "vslBookingRate", hint: "Umówione z VSL / leady" },
    ],
    panels: [
      {
        title: "Lejek reklamy",
        kind: "steps",
        rows: [
          { key: "impressions", label: "Wyświetlenia" },
          { key: "clicks", label: "Kliknięcia linku" },
          { key: "leads", label: "Leady" },
          { key: "vslMeetingsBooked", label: "Umówione z VSL" },
        ],
        note: "Udział względem poprzedniego kroku.",
      },
      {
        title: "Koszty",
        kind: "values",
        rows: [
          { key: "cpm", label: "1000 wyświetleń (CPM)" },
          { key: "cpc", label: "Kliknięcie (CPC)" },
          { key: "cpl", label: "Lead (CPL)" },
          { key: "marketingCostPerCall", label: "Rozmowa z VSL" },
        ],
        note: "Wydatek na reklamy podzielony przez liczbę na danym etapie.",
      },
    ],
  },
  {
    key: "setting-sprzedaz",
    label: "Setting i sprzedaż",
    question: "Ile rozmów umawiamy i ile z nich zamykamy?",
    northStar: [
      { key: "meetingsBooked", hint: "Spotkania umówione przez settera" },
      { key: "bookingRate", hint: "Umówione / wykonane telefony" },
      { key: "sur", hint: "Odbyte / zaplanowane pierwsze" },
      { key: "cp", hint: "Sprzedaże / odbyte pierwsze" },
      { key: "totalClosings", hint: "Pierwsze spotkania + follow-upy" },
      { key: "totalRevenue", hint: "Zakontraktowany, netto, z follow-upami" },
    ],
    panels: [
      {
        title: "Setting",
        kind: "steps",
        rows: [
          { key: "callsMade", label: "Wykonane telefony" },
          { key: "conductedCalls", label: "Przeprowadzone rozmowy" },
          { key: "meetingsBooked", label: "Umówione spotkania" },
        ],
        note: "Udział względem poprzedniego kroku.",
      },
      {
        title: "Zaplanowane spotkania pierwsze",
        kind: "parts",
        total: "plannedMeetings",
        rows: [
          { key: "attendedMeetings", label: "Odbyte" },
          { key: "postponedMeetings", label: "Przełożone" },
          { key: "cancelledMeetings", label: "Odwołane" },
          { key: "noShows", label: "No show" },
        ],
        note: "Udział w zaplanowanych spotkaniach pierwszych.",
      },
      {
        title: "Skąd sprzedaże",
        kind: "parts",
        total: "totalClosings",
        rows: [
          { key: "closings", label: "Pierwsze spotkania" },
          { key: "followUpClosings", label: "Follow-upy" },
        ],
        note: "Udział w sprzedażach łącznie.",
      },
    ],
  },
];

export function getView(key: string | undefined): ViewDef {
  return VIEWS.find((v) => v.key === key) ?? VIEWS[0];
}
