import type { KpiUnit } from "./kpis";

export function formatNumber(n: number, decimals = 0): string {
  return new Intl.NumberFormat("pl-PL", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
}

export function formatPLN(n: number): string {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(n);
}

export function formatKpi(value: number | null | undefined, unit: KpiUnit, decimals = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  switch (unit) {
    case "%": return `${formatNumber(value, decimals)}%`;
    case "PLN": return formatPLN(value);
    case "x": return `${formatNumber(value, decimals)}×`;
    case ":1": return `${formatNumber(value, decimals)}:1`;
    case "pkt": return formatNumber(value, decimals);
    default: return `${formatNumber(value, decimals)} ${unit}`;
  }
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
