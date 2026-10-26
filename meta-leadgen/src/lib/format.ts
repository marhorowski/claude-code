export function money(value: number | null | undefined, currency: string, digits = 0): string {
  if (value === null || value === undefined || !isFinite(value)) return "—";
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

export function num(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || !isFinite(value)) return "—";
  return new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

export function pct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !isFinite(value)) return "—";
  return `${num(value, digits)}%`;
}

export function shortDate(day: string): string {
  const [, m, d] = day.split("-");
  return `${d}.${m}`;
}

export function dateRangeLabel(start: string, end: string): string {
  const fmt = (s: string) => s.split("-").reverse().join(".");
  return `${fmt(start)} – ${fmt(end)}`;
}
