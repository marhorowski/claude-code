const nf = (digits: number) =>
  new Intl.NumberFormat("pl-PL", { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: "always" } as Intl.NumberFormatOptions);

export function formatValue(value: number | null | undefined, unit: string): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  if (unit === "%") return `${nf(1).format(value)}%`;
  if (unit === "×") return `${nf(2).format(value)}×`;
  if (unit === "PLN") return `${nf(2).format(value)} zł`;
  return nf(0).format(value);
}
