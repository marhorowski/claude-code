import type { Inputs } from "./fields";

export type KpiUnit = "%" | "PLN" | "dni" | "h" | "min" | "pkt" | "x" | ":1" | "mies." | "usł." | "kont";

export type AreaId = "retencja" | "upsell" | "onboarding" | "satysfakcja" | "wyniki" | "proces";

export const AREAS: { id: AreaId; title: string; description: string }[] = [
  { id: "retencja", title: "Retencja i przychód cykliczny", description: "Czy baza MRR rośnie sama z siebie, bez nowej sprzedaży. NRR > 100% = wzrost nawet przy zerowej akwizycji." },
  { id: "upsell", title: "Upsell i dosprzedaż", description: "Strona, SEO, CRM podnoszą ARPA i obniżają churn — klient z kilkoma usługami trudniej odchodzi." },
  { id: "onboarding", title: "Onboarding", description: "Większość odejść zapada w pierwszych 90 dniach. Kluczowy jest czas do pierwszego leada." },
  { id: "satysfakcja", title: "Zadowolenie i ryzyko odejścia", description: "Ankiety mówią, co klient deklaruje; Health Score — co robi." },
  { id: "wyniki", title: "Wyniki klientów", description: "Najczęstsza przyczyna churnu to nie zły CPL, tylko leady, do których klient nie dzwoni." },
  { id: "proces", title: "Proces i obciążenie CSM", description: "Wskaźniki wyprzedzające: gdy spadają, za 1–2 miesiące spada retencja." },
];

export interface SurveyStats {
  npsPromoters: number;
  npsPassives: number;
  npsDetractors: number;
  csatPositive: number;
  csatTotal: number;
  responsesMonth: number;
}

export interface AgencyInputs {
  cac: number | null;
  grossMarginPct: number | null;
  newClientsTotal: number | null;
  newClientsReferral: number | null;
}

export interface KpiContext {
  cur: Inputs | null; // bieżący miesiąc (zagregowany dla zakresu)
  qtd: (Inputs | null)[]; // miesiące kwartału do bieżącego włącznie
  history: (Inputs | null)[]; // do 12 miesięcy kończąc na bieżącym, od najstarszego
  threeMonthsAgo: Inputs | null;
  agency: AgencyInputs | null; // bieżący miesiąc
  agencyLatest: { cac: number | null; grossMarginPct: number | null }; // ostatnie znane wartości
  surveys: SurveyStats;
  fte: number | null;
}

export interface KpiValue {
  value: number | null;
  sub?: string;
  breakdown?: { label: string; value: number | null; unit: KpiUnit }[];
}

export interface KpiDef {
  code: string;
  label: string;
  area: AreaId;
  key: boolean; // KPI kluczowy (raport tygodniowy dla zarządu)
  unit: KpiUnit;
  decimals: number;
  target: number;
  lowerIsBetter: boolean;
  period: "MONTHLY" | "QUARTERLY";
  agencyLevel?: boolean; // liczony dla całej agencji, niezależnie od wybranego CSM
  definition: string;
  formula: string;
  compute: (ctx: KpiContext) => KpiValue;
}

const g = (i: Inputs | null, k: string): number | null => (i ? i[k] ?? null : null);

function ratio(n: number | null, d: number | null, mult = 100): number | null {
  if (n === null || d === null || d === 0) return null;
  return (n / d) * mult;
}

// Suma, w której brak pojedynczej wartości liczy się jako 0 — null tylko gdy brak wszystkich
function sumOpt(...vals: (number | null)[]): number | null {
  if (vals.every((v) => v === null)) return null;
  return vals.reduce<number>((a, v) => a + (v ?? 0), 0);
}

const neg = (v: number | null) => (v === null ? null : -v);

function sumField(list: (Inputs | null)[], k: string): number | null {
  return sumOpt(...list.map((i) => g(i, k)));
}

function clientsEnd(i: Inputs | null): number | null {
  const start = g(i, "activeClientsStart");
  if (start === null) return null;
  return start + (g(i, "newClients") ?? 0) - (g(i, "churnedClients") ?? 0);
}

function arpa(i: Inputs | null): number | null {
  return ratio(g(i, "mrrEnd"), clientsEnd(i), 1);
}

const fmtPLN = (n: number) =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(n);

export const LIFETIME_CAP = 120;

export function clientLifetime(history: (Inputs | null)[]): { months: number | null; capped: boolean; samples: number } {
  const rates = history
    .map((i) => ratio(g(i, "churnedClients"), g(i, "activeClientsStart"), 1))
    .filter((r): r is number => r !== null);
  if (rates.length === 0) return { months: null, capped: false, samples: 0 };
  const avg = rates.reduce((a, r) => a + r, 0) / rates.length;
  if (avg <= 0 || 1 / avg > LIFETIME_CAP) return { months: LIFETIME_CAP, capped: true, samples: rates.length };
  return { months: 1 / avg, capped: false, samples: rates.length };
}

export const KPIS: KpiDef[] = [
  // ───────── 1. Retencja i przychód cykliczny ─────────
  {
    code: "MRR_GROWTH", label: "MRR Growth Rate", area: "retencja", key: false, unit: "%", decimals: 1, target: 5, lowerIsBetter: false, period: "MONTHLY",
    definition: "Miesięczna zmiana bazy przychodu cyklicznego (łącznie z nowymi klientami).",
    formula: "(MRR koniec − MRR początek) / MRR początek",
    compute: ({ cur }) => {
      const s = g(cur, "mrrStart"), e = g(cur, "mrrEnd");
      return { value: s === null || e === null ? null : ratio(e - s, s) };
    },
  },
  {
    code: "LOGO_CHURN", label: "Logo Churn Rate", area: "retencja", key: true, unit: "%", decimals: 1, target: 4, lowerIsBetter: true, period: "MONTHLY",
    definition: "Odsetek klientów, którzy wypowiedzieli umowę w danym miesiącu.",
    formula: "Klienci utraceni w miesiącu / aktywni klienci na początku miesiąca",
    compute: ({ cur }) => ({ value: ratio(g(cur, "churnedClients"), g(cur, "activeClientsStart")) }),
  },
  {
    code: "GROSS_MRR_CHURN", label: "Gross MRR Churn", area: "retencja", key: false, unit: "%", decimals: 1, target: 3, lowerIsBetter: true, period: "MONTHLY",
    definition: "Odsetek MRR utraconego przez odejścia i obniżki pakietów.",
    formula: "(MRR utracony z churnu + MRR z obniżek) / MRR na początku miesiąca",
    compute: ({ cur }) => ({ value: ratio(sumOpt(g(cur, "churnMrr"), g(cur, "downgradeMrr")), g(cur, "mrrStart")) }),
  },
  {
    code: "GRR", label: "GRR — Gross Revenue Retention", area: "retencja", key: false, unit: "%", decimals: 1, target: 96, lowerIsBetter: false, period: "MONTHLY",
    definition: "Jaka część MRR z początku okresu została, bez liczenia dosprzedaży. Maksimum 100%.",
    formula: "(MRR początek − churn MRR − obniżki MRR) / MRR początek",
    compute: ({ cur }) => {
      const s = g(cur, "mrrStart");
      const lost = sumOpt(g(cur, "churnMrr"), g(cur, "downgradeMrr"));
      return { value: s === null || lost === null ? null : ratio(s - lost, s) };
    },
  },
  {
    code: "NRR", label: "NRR — Net Revenue Retention", area: "retencja", key: true, unit: "%", decimals: 1, target: 100, lowerIsBetter: false, period: "MONTHLY",
    definition: "Jaka część MRR z początku okresu została, łącznie z dosprzedażą u tych samych klientów. Bez nowych klientów.",
    formula: "(MRR początek + expansion MRR − obniżki MRR − churn MRR) / MRR początek",
    compute: ({ cur }) => {
      const s = g(cur, "mrrStart");
      const delta = sumOpt(g(cur, "expansionMrr"), neg(g(cur, "downgradeMrr")), neg(g(cur, "churnMrr")));
      return { value: s === null || delta === null ? null : ratio(s + delta, s) };
    },
  },
  {
    code: "LIFETIME", label: "Średni czas współpracy", area: "retencja", key: false, unit: "mies.", decimals: 1, target: 12, lowerIsBetter: false, period: "MONTHLY",
    definition: "Ile miesięcy średnio klient płaci abonament.",
    formula: "1 / średni miesięczny Logo Churn Rate (do 12 ostatnich miesięcy)",
    compute: ({ history }) => {
      const lt = clientLifetime(history);
      if (lt.months === null) return { value: null };
      return { value: lt.months, sub: lt.capped ? `Brak odejść — limit ${LIFETIME_CAP} mies.` : `Ze średniej z ${lt.samples} mies.` };
    },
  },
  {
    code: "LTV_CAC", label: "LTV : CAC", area: "retencja", key: false, unit: ":1", decimals: 1, target: 4, lowerIsBetter: false, period: "MONTHLY",
    definition: "Marża brutto z klienta przez cały okres współpracy (z usługami dosprzedanymi) w relacji do pełnego kosztu pozyskania.",
    formula: "LTV = (ARPA + średnia dosprzedaż jednorazowa / mies.) × marża brutto × czas współpracy; LTV / CAC",
    compute: ({ cur, history, agencyLatest }) => {
      const a = arpa(cur);
      const lt = clientLifetime(history).months;
      const margin = agencyLatest.grossMarginPct;
      if (a === null || lt === null || margin === null) return { value: null, sub: margin === null ? "Brak marży brutto (dane agencji)" : undefined };
      const months = history.filter((i) => g(i, "oneTimeRevenue") !== null);
      const oneTimePerClient = months.length
        ? months.reduce((acc, i) => acc + (ratio(g(i, "oneTimeRevenue"), clientsEnd(i), 1) ?? 0), 0) / months.length
        : 0;
      const ltv = (a + oneTimePerClient) * (margin / 100) * lt;
      const cac = agencyLatest.cac;
      return { value: ratio(ltv, cac, 1), sub: `LTV: ${fmtPLN(ltv)}${cac ? ` · CAC: ${fmtPLN(cac)}` : " · brak CAC"}` };
    },
  },

  // ───────── 2. Upsell i dosprzedaż ─────────
  {
    code: "EXPANSION", label: "Expansion MRR Rate", area: "upsell", key: true, unit: "%", decimals: 1, target: 3, lowerIsBetter: false, period: "MONTHLY",
    definition: "Przyrost MRR z dosprzedaży i podniesienia pakietów u istniejących klientów.",
    formula: "Expansion MRR w miesiącu / MRR na początku miesiąca",
    compute: ({ cur }) => ({ value: ratio(g(cur, "expansionMrr"), g(cur, "mrrStart")) }),
  },
  {
    code: "UPSELL_RATE", label: "Upsell Rate", area: "upsell", key: false, unit: "%", decimals: 1, target: 15, lowerIsBetter: false, period: "QUARTERLY",
    definition: "Odsetek klientów, którzy kupili co najmniej jedną dodatkową usługę (narastająco w kwartale).",
    formula: "Klienci z dosprzedażą w kwartale / aktywni klienci",
    compute: ({ cur, qtd }) => ({ value: ratio(sumField(qtd, "clientsWithUpsell"), g(cur, "activeClientsStart")), sub: "Narastająco w kwartale" }),
  },
  {
    code: "SERVICES_PER_CLIENT", label: "Usługi na klienta", area: "upsell", key: false, unit: "usł.", decimals: 2, target: 2, lowerIsBetter: false, period: "MONTHLY",
    definition: "Głębokość współpracy — ile usług średnio ma aktywny klient.",
    formula: "Suma aktywnych usług / aktywni klienci",
    compute: ({ cur }) => ({ value: ratio(g(cur, "activeServices"), g(cur, "activeClientsStart"), 1) }),
  },
  {
    code: "ARPA_GROWTH", label: "ARPA — wzrost kw./kw.", area: "upsell", key: false, unit: "%", decimals: 1, target: 5, lowerIsBetter: false, period: "QUARTERLY",
    definition: "Średni miesięczny przychód cykliczny z jednego klienta i jego zmiana względem stanu sprzed 3 miesięcy.",
    formula: "ARPA = MRR / aktywni klienci; (ARPA teraz − ARPA 3 mies. temu) / ARPA 3 mies. temu",
    compute: ({ cur, threeMonthsAgo }) => {
      const now = arpa(cur), before = arpa(threeMonthsAgo);
      const sub = now === null ? undefined : `ARPA: ${fmtPLN(now)}${before === null ? " · brak danych sprzed 3 mies." : ""}`;
      return { value: now === null || before === null ? null : ratio(now - before, before), sub };
    },
  },
  {
    code: "OFFER_CONV", label: "Konwersja ofert dosprzedaży", area: "upsell", key: false, unit: "%", decimals: 1, target: 30, lowerIsBetter: false, period: "MONTHLY",
    definition: "Skuteczność CSM w zamykaniu przedstawionych ofert.",
    formula: "Zaakceptowane oferty / przedstawione oferty",
    compute: ({ cur }) => {
      const services: [string, string][] = [["Strona www", "Web"], ["SEO", "Seo"], ["CRM", "Crm"], ["Inne", "Other"]];
      const won = sumOpt(...services.map(([, k]) => g(cur, `offers${k}Won`)));
      const sent = sumOpt(...services.map(([, k]) => g(cur, `offers${k}Sent`)));
      return {
        value: ratio(won, sent),
        breakdown: services.map(([label, k]) => ({ label, value: ratio(g(cur, `offers${k}Won`), g(cur, `offers${k}Sent`)), unit: "%" as KpiUnit })),
      };
    },
  },
  {
    code: "ONE_TIME_REV", label: "Przychód z dosprzedaży jednorazowej", area: "upsell", key: false, unit: "%", decimals: 1, target: 10, lowerIsBetter: false, period: "QUARTERLY",
    definition: "Przychód z projektów jednorazowych sprzedanych obecnym klientom, jako % MRR w tym samym okresie.",
    formula: "Przychód z jednorazowych dosprzedaży / MRR w tym samym okresie (kwartał)",
    compute: ({ qtd }) => {
      const rev = sumField(qtd, "oneTimeRevenue");
      return { value: ratio(rev, sumField(qtd, "mrrEnd")), sub: rev === null ? undefined : `${fmtPLN(rev)} w kwartale` };
    },
  },

  // ───────── 3. Onboarding ─────────
  {
    code: "KICKOFF", label: "Czas do kickoffu", area: "onboarding", key: false, unit: "dni", decimals: 1, target: 2, lowerIsBetter: true, period: "MONTHLY",
    definition: "Czas od podpisania umowy do spotkania startowego (dni robocze).",
    formula: "Średnia (data kickoffu − data podpisania umowy)",
    compute: ({ cur }) => ({ value: g(cur, "avgDaysToKickoff") }),
  },
  {
    code: "TIME_TO_LAUNCH", label: "Time to Launch", area: "onboarding", key: false, unit: "dni", decimals: 1, target: 10, lowerIsBetter: true, period: "MONTHLY",
    definition: "Czas od podpisania umowy do uruchomienia kampanii (dostępy BM, kreacje, formularz, integracja z CRM).",
    formula: "Średnia (data startu kampanii − data podpisania umowy)",
    compute: ({ cur }) => {
      const d = g(cur, "onboardingsClientDelay");
      return { value: g(cur, "avgDaysToLaunch"), sub: d ? `Opóźnione z winy klienta: ${d}` : undefined };
    },
  },
  {
    code: "TTFL", label: "Time to First Lead", area: "onboarding", key: true, unit: "dni", decimals: 1, target: 12, lowerIsBetter: true, period: "MONTHLY",
    definition: "Czas od podpisania umowy do pierwszego leada przekazanego klientowi.",
    formula: "Średnia (data pierwszego leada − data podpisania umowy)",
    compute: ({ cur }) => ({ value: g(cur, "avgDaysToFirstLead") }),
  },
  {
    code: "ONBOARDING_ON_TIME", label: "Terminowość onboardingu", area: "onboarding", key: false, unit: "%", decimals: 0, target: 90, lowerIsBetter: false, period: "MONTHLY",
    definition: "Odsetek onboardingów zamkniętych w planowanym terminie, wg checklisty.",
    formula: "Onboardingi zakończone w terminie / wszystkie onboardingi w okresie",
    compute: ({ cur }) => {
      const d = g(cur, "onboardingsClientDelay");
      return { value: ratio(g(cur, "onboardingsOnTime"), g(cur, "onboardings")), sub: d ? `Opóźnione z winy klienta: ${d}` : undefined };
    },
  },
  {
    code: "RET90", label: "Retencja 90 dni", area: "onboarding", key: true, unit: "%", decimals: 0, target: 90, lowerIsBetter: false, period: "MONTHLY",
    definition: "Odsetek klientów z kohorty miesięcznej, którzy wciąż płacą po 90 dniach.",
    formula: "Klienci aktywni po 90 dniach / klienci pozyskani w kohorcie",
    compute: ({ cur }) => ({ value: ratio(g(cur, "cohort90Retained"), g(cur, "cohort90Size")) }),
  },

  // ───────── 4. Zadowolenie i ryzyko ─────────
  {
    code: "NPS", label: "NPS", area: "satysfakcja", key: true, unit: "pkt", decimals: 0, target: 50, lowerIsBetter: false, period: "QUARTERLY",
    definition: "Skłonność do polecenia agencji (0–10), mierzona co kwartał z ankiet NPS.",
    formula: "% promotorów (9–10) − % krytyków (0–6)",
    compute: ({ surveys: s }) => {
      const total = s.npsPromoters + s.npsPassives + s.npsDetractors;
      if (total === 0) return { value: null, sub: "Brak odpowiedzi w kwartale" };
      return { value: ((s.npsPromoters - s.npsDetractors) / total) * 100, sub: `${total} odp. w kwartale` };
    },
  },
  {
    code: "CSAT", label: "CSAT", area: "satysfakcja", key: false, unit: "%", decimals: 0, target: 85, lowerIsBetter: false, period: "MONTHLY",
    definition: "Zadowolenie z etapu (onboarding, raport, call strategiczny) — ankiety CSAT 1–5.",
    formula: "Odpowiedzi 4–5 / wszystkie odpowiedzi",
    compute: ({ surveys: s }) => ({ value: ratio(s.csatPositive, s.csatTotal), sub: s.csatTotal ? `${s.csatTotal} odp.` : "Brak odpowiedzi" }),
  },
  {
    code: "SURVEY_RESPONSE", label: "Wskaźnik odpowiedzi na ankiety", area: "satysfakcja", key: false, unit: "%", decimals: 0, target: 60, lowerIsBetter: false, period: "MONTHLY",
    definition: "Odsetek wysłanych ankiet, które wróciły. Poniżej progu NPS i CSAT są niewiarygodne.",
    formula: "Odpowiedzi w miesiącu / ankiety wysłane w miesiącu",
    compute: ({ cur, surveys }) => ({ value: ratio(g(cur, "surveysSent") === null ? null : surveys.responsesMonth, g(cur, "surveysSent")) }),
  },
  {
    code: "HEALTH_GREEN", label: "Klienci w strefie zielonej", area: "satysfakcja", key: true, unit: "%", decimals: 0, target: 70, lowerIsBetter: false, period: "MONTHLY",
    definition: "Odsetek klientów z zielonym Health Score (≥ 75 pkt).",
    formula: "Klienci z Health Score zielonym / aktywni klienci",
    compute: ({ cur }) => ({ value: ratio(g(cur, "healthGreen"), g(cur, "activeClientsStart")) }),
  },
  {
    code: "AT_RISK", label: "Klienci zagrożeni (At-Risk)", area: "satysfakcja", key: false, unit: "%", decimals: 0, target: 10, lowerIsBetter: true, period: "MONTHLY",
    definition: "Odsetek klientów z czerwonym Health Score — kandydaci do odejścia w 30–60 dni.",
    formula: "Klienci z Health Score czerwonym / aktywni klienci",
    compute: ({ cur }) => ({ value: ratio(g(cur, "healthRed"), g(cur, "activeClientsStart")) }),
  },
  {
    code: "REFERRAL", label: "Referral Rate", area: "satysfakcja", key: false, unit: "%", decimals: 0, target: 20, lowerIsBetter: false, period: "MONTHLY", agencyLevel: true,
    definition: "Odsetek nowych klientów agencji pozyskanych z poleceń obecnych klientów.",
    formula: "Nowi klienci z polecenia / wszyscy nowi klienci w okresie",
    compute: ({ agency }) => ({ value: ratio(agency?.newClientsReferral ?? null, agency?.newClientsTotal ?? null), sub: "Cała agencja" }),
  },
  {
    code: "FIRST_RESPONSE", label: "Czas pierwszej odpowiedzi", area: "satysfakcja", key: false, unit: "h", decimals: 1, target: 4, lowerIsBetter: true, period: "MONTHLY",
    definition: "Czas od wiadomości klienta do pierwszej odpowiedzi CSM (godziny robocze).",
    formula: "Średnia (czas odpowiedzi − czas wiadomości)",
    compute: ({ cur }) => ({ value: g(cur, "avgResponseHours") }),
  },
  {
    code: "ESCALATION", label: "Wskaźnik eskalacji", area: "satysfakcja", key: false, unit: "%", decimals: 1, target: 5, lowerIsBetter: true, period: "MONTHLY",
    definition: "Odsetek klientów, którzy w miesiącu zgłosili reklamację lub eskalację do właściciela.",
    formula: "Klienci z eskalacją / aktywni klienci",
    compute: ({ cur }) => ({ value: ratio(g(cur, "escalations"), g(cur, "activeClientsStart")) }),
  },

  // ───────── 5. Wyniki klientów ─────────
  {
    code: "CPL_ON_TARGET", label: "CPL vs cel klienta", area: "wyniki", key: true, unit: "%", decimals: 0, target: 80, lowerIsBetter: false, period: "MONTHLY",
    definition: "Odsetek klientów, u których koszt leada mieści się w celu ustalonym przy onboardingu.",
    formula: "Klienci z CPL ≤ celu / aktywni klienci",
    compute: ({ cur }) => ({ value: ratio(g(cur, "clientsCplOnTarget"), g(cur, "activeClientsStart")) }),
  },
  {
    code: "LEAD_VOLUME", label: "Realizacja wolumenu leadów", area: "wyniki", key: false, unit: "%", decimals: 0, target: 100, lowerIsBetter: false, period: "MONTHLY",
    definition: "Ile leadów dostarczono względem planu miesięcznego.",
    formula: "Leady dostarczone / leady zaplanowane",
    compute: ({ cur }) => ({ value: ratio(g(cur, "leadsDelivered"), g(cur, "leadsPlanned")) }),
  },
  {
    code: "CONTACT_RATE", label: "Contact Rate", area: "wyniki", key: false, unit: "%", decimals: 0, target: 70, lowerIsBetter: false, period: "MONTHLY",
    definition: "Odsetek leadów, z którymi klient nawiązał rozmowę.",
    formula: "Leady z odbytą rozmową / leady dostarczone",
    compute: ({ cur }) => ({ value: ratio(g(cur, "leadsContacted"), g(cur, "leadsDelivered")) }),
  },
  {
    code: "LEAD_QUALITY", label: "Jakość leadów", area: "wyniki", key: false, unit: "%", decimals: 0, target: 40, lowerIsBetter: false, period: "MONTHLY",
    definition: "Odsetek leadów uznanych przez klienta za wartościowe (realna inwestycja, budżet, termin).",
    formula: "Leady zakwalifikowane / leady z odbytą rozmową",
    compute: ({ cur }) => ({ value: ratio(g(cur, "leadsQualified"), g(cur, "leadsContacted")) }),
  },
  {
    code: "SPEED_TO_LEAD", label: "Speed to Lead (klient)", area: "wyniki", key: false, unit: "min", decimals: 0, target: 30, lowerIsBetter: true, period: "MONTHLY",
    definition: "Czas od wpłynięcia leada do pierwszego kontaktu ze strony klienta (w godzinach pracy).",
    formula: "Średnia (czas pierwszego kontaktu − czas wpłynięcia leada)",
    compute: ({ cur }) => ({ value: g(cur, "avgSpeedToLeadMin") }),
  },
  {
    code: "CLIENT_ROI", label: "ROI klienta", area: "wyniki", key: false, unit: "x", decimals: 1, target: 5, lowerIsBetter: false, period: "MONTHLY",
    definition: "Zwrot klienta z inwestycji w agencję (klienci raportujący sprzedaż).",
    formula: "Przychód klienta z leadów / (budżet reklamowy + abonament agencji)",
    compute: ({ cur }) => ({ value: ratio(g(cur, "clientRevenue"), sumOpt(g(cur, "clientAdSpend"), g(cur, "clientFees")), 1) }),
  },
  {
    code: "SALES_REPORTING", label: "Raportowanie sprzedaży przez klientów", area: "wyniki", key: false, unit: "%", decimals: 0, target: 80, lowerIsBetter: false, period: "MONTHLY",
    definition: "Odsetek klientów, którzy co miesiąc przekazują dane o rozmowach, wycenach i sprzedaży.",
    formula: "Klienci przekazujący dane / aktywni klienci",
    compute: ({ cur }) => ({ value: ratio(g(cur, "clientsReportingSales"), g(cur, "activeClientsStart")) }),
  },

  // ───────── 6. Proces i obciążenie ─────────
  {
    code: "CALL_COVERAGE", label: "Pokrycie calli strategicznych", area: "proces", key: false, unit: "%", decimals: 0, target: 100, lowerIsBetter: false, period: "MONTHLY",
    definition: "Odsetek klientów, z którymi w miesiącu odbył się call przeglądowy (wyniki, plan, dosprzedaż).",
    formula: "Klienci z odbytym callem / aktywni klienci",
    compute: ({ cur }) => ({ value: ratio(g(cur, "clientsWithCall"), g(cur, "activeClientsStart")) }),
  },
  {
    code: "REPORTS_ON_TIME", label: "Raporty w terminie", area: "proces", key: false, unit: "%", decimals: 0, target: 100, lowerIsBetter: false, period: "MONTHLY",
    definition: "Odsetek miesięcznych raportów wysłanych klientom w ustalonym dniu.",
    formula: "Raporty wysłane w terminie / raporty należne",
    compute: ({ cur }) => ({ value: ratio(g(cur, "reportsOnTime"), g(cur, "reportsDue")) }),
  },
  {
    code: "CLIENTS_PER_CSM", label: "Klienci na CSM", area: "proces", key: false, unit: "kont", decimals: 1, target: 25, lowerIsBetter: true, period: "MONTHLY",
    definition: "Liczba aktywnych kont prowadzonych przez jedną osobę (w etatach).",
    formula: "Aktywni klienci / liczba CSM (etaty)",
    compute: ({ cur, fte }) => ({ value: ratio(g(cur, "activeClientsStart"), fte, 1), sub: fte ? `Etaty: ${fte.toLocaleString("pl-PL")}` : undefined }),
  },
];

export const KEY_KPI_ORDER = ["LOGO_CHURN", "NRR", "EXPANSION", "RET90", "TTFL", "NPS", "HEALTH_GREEN", "CPL_ON_TARGET"];

export const KPI_BY_CODE: Record<string, KpiDef> = Object.fromEntries(KPIS.map((k) => [k.code, k]));
