// Pola formularzy — jedno źródło prawdy dla formularzy, API i agregacji.

export type FieldUnit = "szt" | "PLN" | "dni" | "h" | "min" | "%";

export interface FieldDef {
  key: string;
  label: string;
  unit: FieldUnit;
  hint?: string;
  // Pole będące średnią — przy sumowaniu zespołu lub tygodni ważone tym polem
  weight?: string;
  int?: boolean;
}

export interface FieldSection {
  id: string;
  title: string;
  description?: string;
  fields: FieldDef[];
}

export const MONTHLY_SECTIONS: FieldSection[] = [
  {
    id: "baza",
    title: "Baza i MRR",
    description: "Aktywny klient = opłacony abonament na 1. dzień miesiąca. Churn liczymy w miesiącu wypowiedzenia.",
    fields: [
      { key: "activeClientsStart", label: "Aktywni klienci na 1. dzień miesiąca", unit: "szt", int: true },
      { key: "mrrStart", label: "MRR na początek miesiąca", unit: "PLN" },
      { key: "mrrEnd", label: "MRR na koniec miesiąca", unit: "PLN" },
      { key: "newClients", label: "Nowi klienci w portfelu", unit: "szt", int: true },
      { key: "newMrr", label: "MRR od nowych klientów", unit: "PLN" },
      { key: "churnedClients", label: "Klienci, którzy wypowiedzieli umowę", unit: "szt", int: true },
      { key: "churnMrr", label: "MRR utracony z wypowiedzeń", unit: "PLN" },
      { key: "downgradeMrr", label: "MRR utracony z obniżek pakietów", unit: "PLN" },
      { key: "expansionMrr", label: "Expansion MRR (dosprzedaż cykliczna i podniesienia pakietów)", unit: "PLN" },
    ],
  },
  {
    id: "upsell",
    title: "Upsell i dosprzedaż",
    fields: [
      { key: "clientsWithUpsell", label: "Klienci, którzy kupili dodatkową usługę w tym miesiącu", unit: "szt", int: true, hint: "Cykliczną lub jednorazową" },
      { key: "activeServices", label: "Suma aktywnych usług u klientów", unit: "szt", int: true, hint: "Meta Ads, SEO, CRM, opieka nad stroną…" },
      { key: "oneTimeRevenue", label: "Przychód z dosprzedaży jednorazowej", unit: "PLN", hint: "Strona www, wdrożenie CRM itp." },
      { key: "offersWebSent", label: "Oferty: strona www — przedstawione", unit: "szt", int: true },
      { key: "offersWebWon", label: "Oferty: strona www — zaakceptowane", unit: "szt", int: true },
      { key: "offersSeoSent", label: "Oferty: SEO — przedstawione", unit: "szt", int: true },
      { key: "offersSeoWon", label: "Oferty: SEO — zaakceptowane", unit: "szt", int: true },
      { key: "offersCrmSent", label: "Oferty: CRM — przedstawione", unit: "szt", int: true },
      { key: "offersCrmWon", label: "Oferty: CRM — zaakceptowane", unit: "szt", int: true },
      { key: "offersOtherSent", label: "Oferty: inne — przedstawione", unit: "szt", int: true },
      { key: "offersOtherWon", label: "Oferty: inne — zaakceptowane", unit: "szt", int: true },
    ],
  },
  {
    id: "onboarding",
    title: "Onboarding",
    description: "Średnie liczone dla onboardingów zakończonych w tym miesiącu.",
    fields: [
      { key: "onboardings", label: "Onboardingi zakończone w miesiącu", unit: "szt", int: true },
      { key: "onboardingsOnTime", label: "…w tym zakończone w terminie (wg checklisty)", unit: "szt", int: true },
      { key: "onboardingsClientDelay", label: "…w tym opóźnione z winy klienta", unit: "szt", int: true, hint: "Brak dostępów, materiałów, zdjęć realizacji" },
      { key: "avgDaysToKickoff", label: "Średni czas do kickoffu", unit: "dni", weight: "onboardings", hint: "Dni robocze od podpisania umowy" },
      { key: "avgDaysToLaunch", label: "Średni Time to Launch", unit: "dni", weight: "onboardings", hint: "Dni kalendarzowe od podpisania do startu kampanii" },
      { key: "avgDaysToFirstLead", label: "Średni Time to First Lead", unit: "dni", weight: "onboardings", hint: "Dni kalendarzowe od podpisania do pierwszego leada" },
      { key: "cohort90Size", label: "Klienci pozyskani 3 miesiące temu (kohorta)", unit: "szt", int: true },
      { key: "cohort90Retained", label: "…z nich wciąż płaci", unit: "szt", int: true },
    ],
  },
  {
    id: "satysfakcja",
    title: "Zadowolenie i ryzyko",
    description: "NPS i CSAT liczą się automatycznie z ankiet. Health Score: zielony ≥ 75 pkt, czerwony < 50 pkt.",
    fields: [
      { key: "surveysSent", label: "Ankiety wysłane klientom (NPS + CSAT)", unit: "szt", int: true },
      { key: "healthGreen", label: "Klienci z zielonym Health Score", unit: "szt", int: true },
      { key: "healthRed", label: "Klienci z czerwonym Health Score", unit: "szt", int: true },
      { key: "escalations", label: "Klienci z reklamacją lub eskalacją do właściciela", unit: "szt", int: true },
      { key: "avgResponseHours", label: "Średni czas pierwszej odpowiedzi", unit: "h", weight: "activeClientsStart", hint: "Godziny robocze" },
    ],
  },
  {
    id: "wyniki",
    title: "Wyniki klientów",
    description: "Contact rate, jakość i ROI liczymy z danych od klientów, którzy raportują sprzedaż.",
    fields: [
      { key: "clientsCplOnTarget", label: "Klienci z CPL ≤ celu", unit: "szt", int: true },
      { key: "leadsPlanned", label: "Leady zaplanowane", unit: "szt", int: true },
      { key: "leadsDelivered", label: "Leady dostarczone", unit: "szt", int: true },
      { key: "leadsContacted", label: "Leady z odbytą rozmową", unit: "szt", int: true },
      { key: "leadsQualified", label: "Leady zakwalifikowane przez klienta", unit: "szt", int: true },
      { key: "avgSpeedToLeadMin", label: "Średni Speed to Lead (po stronie klienta)", unit: "min", weight: "leadsContacted", hint: "Minuty w godzinach pracy" },
      { key: "clientsReportingSales", label: "Klienci przekazujący dane sprzedażowe", unit: "szt", int: true },
      { key: "clientRevenue", label: "Przychód klientów z leadów", unit: "PLN", hint: "Suma dla raportujących klientów" },
      { key: "clientAdSpend", label: "Budżet reklamowy klientów", unit: "PLN", hint: "Te same, raportujące konta" },
      { key: "clientFees", label: "Abonamenty agencji tych klientów", unit: "PLN" },
    ],
  },
  {
    id: "proces",
    title: "Proces i obciążenie",
    fields: [
      { key: "clientsWithCall", label: "Klienci z odbytym callem strategicznym", unit: "szt", int: true },
      { key: "reportsDue", label: "Raporty miesięczne należne", unit: "szt", int: true },
      { key: "reportsOnTime", label: "Raporty wysłane w terminie", unit: "szt", int: true },
    ],
  },
];

export const MONTHLY_FIELDS: FieldDef[] = MONTHLY_SECTIONS.flatMap((s) => s.fields);
export const MONTHLY_KEYS = MONTHLY_FIELDS.map((f) => f.key);

export const WEEKLY_FIELDS: FieldDef[] = [
  { key: "activeClientsStart", label: "Aktywni klienci na początek tygodnia", unit: "szt", int: true },
  { key: "mrrStart", label: "MRR na początek tygodnia", unit: "PLN" },
  { key: "churnedClients", label: "Wypowiedzenia w tym tygodniu", unit: "szt", int: true },
  { key: "churnMrr", label: "MRR utracony z wypowiedzeń", unit: "PLN" },
  { key: "downgradeMrr", label: "MRR utracony z obniżek", unit: "PLN" },
  { key: "expansionMrr", label: "Expansion MRR", unit: "PLN" },
  { key: "firstLeads", label: "Nowi klienci, którzy dostali pierwszego leada", unit: "szt", int: true },
  { key: "avgDaysToFirstLead", label: "…średni Time to First Lead", unit: "dni", weight: "firstLeads" },
  { key: "healthGreen", label: "Klienci z zielonym Health Score (stan na dziś)", unit: "szt", int: true },
  { key: "clientsCplOnTarget", label: "Klienci z CPL ≤ celu (stan na dziś)", unit: "szt", int: true },
];
export const WEEKLY_KEYS = WEEKLY_FIELDS.map((f) => f.key);

export const AGENCY_FIELDS: FieldDef[] = [
  { key: "cac", label: "CAC — pełny koszt pozyskania klienta", unit: "PLN", hint: "Reklamy + prowizje settera i closera + koszty stałe sprzedaży" },
  { key: "grossMarginPct", label: "Marża brutto agencji", unit: "%" },
  { key: "newClientsTotal", label: "Nowi klienci agencji w miesiącu", unit: "szt", int: true },
  { key: "newClientsReferral", label: "…w tym z polecenia obecnych klientów", unit: "szt", int: true },
];
export const AGENCY_KEYS = AGENCY_FIELDS.map((f) => f.key);

export type Inputs = Record<string, number | null>;

// Czyści dane z formularza: tylko znane klucze, liczby ≥ 0 albo null.
export function sanitizeInputs(raw: unknown, fields: FieldDef[]): Inputs {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: Inputs = {};
  for (const f of fields) {
    const v = src[f.key];
    if (v === null || v === undefined || v === "") {
      out[f.key] = null;
      continue;
    }
    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
    if (!Number.isFinite(n) || n < 0) {
      out[f.key] = null;
      continue;
    }
    out[f.key] = f.int ? Math.round(n) : n;
  }
  return out;
}

// Sumuje portfele (lub tygodnie). Średnie ważone wskazanym polem.
export function aggregateInputs(list: Inputs[], fields: FieldDef[]): Inputs | null {
  if (list.length === 0) return null;
  const out: Inputs = {};
  for (const f of fields) {
    const vals = list.filter((e) => e[f.key] !== null && e[f.key] !== undefined);
    if (vals.length === 0) {
      out[f.key] = null;
      continue;
    }
    if (f.weight) {
      let sw = 0;
      let swv = 0;
      for (const e of vals) {
        const w = e[f.weight] ?? 0;
        sw += w;
        swv += w * (e[f.key] as number);
      }
      out[f.key] = sw > 0 ? swv / sw : vals.reduce((a, e) => a + (e[f.key] as number), 0) / vals.length;
    } else {
      out[f.key] = vals.reduce((a, e) => a + (e[f.key] as number), 0);
    }
  }
  return out;
}
