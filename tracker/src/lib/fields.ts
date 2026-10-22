// Pola formularzy. Dodanie, usunięcie lub zmiana pola tutaj zmienia formularz,
// zakładkę Dane i podsumowania — bez zmian w bazie.

export type Area = "marketing" | "setting" | "sales";
export type FieldUnit = "PLN" | "szt.";

export interface FieldDef {
  key: string;
  label: string;
  unit: FieldUnit;
  hint?: string;
}

export interface AreaDef {
  key: Area;
  label: string;
  fields: FieldDef[];
}

export const AREAS: AreaDef[] = [
  {
    key: "marketing",
    label: "Marketing",
    fields: [
      { key: "adSpend", label: "Wydatek na reklamy", unit: "PLN" },
      { key: "impressions", label: "Wyświetlenia", unit: "szt." },
      { key: "clicks", label: "Unikatowe kliknięcia linku", unit: "szt." },
      { key: "leads", label: "Liczba leadów", unit: "szt." },
      {
        key: "vslMeetingsBooked",
        label: "Umówione rozmowy z VSL",
        unit: "szt.",
        hint: "Lead sam zarezerwował termin, bez settera",
      },
    ],
  },
  {
    key: "setting",
    label: "Setting",
    fields: [
      { key: "callsMade", label: "Wykonane telefony", unit: "szt.", hint: "Także nieodebrane" },
      { key: "conductedCalls", label: "Przeprowadzone rozmowy", unit: "szt." },
      { key: "meetingsBooked", label: "Umówione spotkania", unit: "szt." },
    ],
  },
  {
    key: "sales",
    label: "Sprzedaż",
    fields: [
      { key: "plannedMeetings", label: "Zaplanowane spotkania (pierwsze)", unit: "szt." },
      { key: "plannedFollowUps", label: "Zaplanowane follow-upy", unit: "szt." },
      { key: "attendedMeetings", label: "Odbyte spotkania pierwsze", unit: "szt." },
      { key: "followUpsDone", label: "Odbyte follow-upy", unit: "szt." },
      { key: "postponedMeetings", label: "Przełożone spotkania", unit: "szt." },
      { key: "cancelledMeetings", label: "Odwołane spotkania", unit: "szt." },
      { key: "noShows", label: "No show", unit: "szt." },
      { key: "closings", label: "Domknięte sprzedaże", unit: "szt.", hint: "Z pierwszych spotkań" },
      { key: "followUpClosings", label: "Sprzedaże z follow-upów", unit: "szt." },
      { key: "revenue", label: "Zakontraktowany przychód", unit: "PLN", hint: "Netto, z pierwszych spotkań" },
      { key: "followUpRevenue", label: "Przychód z follow-upów", unit: "PLN", hint: "Netto" },
    ],
  },
];

export const AREA_KEYS = AREAS.map((a) => a.key);

export function getArea(key: string): AreaDef | undefined {
  return AREAS.find((a) => a.key === key);
}
