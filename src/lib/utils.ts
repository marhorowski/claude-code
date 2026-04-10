// Format number in Polish locale
export function formatNumber(num: number, decimals = 0): string {
  return new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

// Format currency in PLN
export function formatPLN(num: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

// Format percentage
export function formatPercent(num: number, decimals = 1): string {
  return `${formatNumber(num, decimals)}%`;
}

// Format date in Polish format DD.MM.RRRR
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

// Format date short DD.MM
export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
  }).format(d);
}

// Polish month names
export const MONTHS_PL = [
  "Styczeń",
  "Luty",
  "Marzec",
  "Kwiecień",
  "Maj",
  "Czerwiec",
  "Lipiec",
  "Sierpień",
  "Wrzesień",
  "Październik",
  "Listopad",
  "Grudzień",
];

export function getMonthName(month: number): string {
  return MONTHS_PL[month - 1] || "";
}

// Polish day names (short)
export const DAYS_PL = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"];

export function formatValue(value: number, unit: string): string {
  if (unit === "PLN") return formatPLN(value);
  if (unit === "%") return formatPercent(value);
  if (unit === "x") return `${formatNumber(value, 1)}x`;
  if (unit === ":1") return `${formatNumber(value, 1)}:1`;
  return formatNumber(value);
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
