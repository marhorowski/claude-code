const nf = (digits: number) =>
  new Intl.NumberFormat("pl-PL", { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: "always" } as Intl.NumberFormatOptions);

export function formatValue(value: number | null | undefined, unit: string): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  if (unit === "%") return `${nf(1).format(value)}%`;
  if (unit === "×") return `${nf(2).format(value)}×`;
  if (unit === "PLN") return `${nf(2).format(value)} zł`;
  return nf(0).format(value);
}

/** Wartość w kafelku: kwoty od 1000 zł bez groszy (dokładna wartość w podpowiedzi). */
export function formatKpi(value: number | null | undefined, unit: string): string {
  if (unit === "PLN" && value !== null && value !== undefined && Math.abs(value) >= 1000) {
    return `${nf(0).format(value)} zł`;
  }
  return formatValue(value, unit);
}

const compact = new Intl.NumberFormat("pl-PL", { notation: "compact", maximumFractionDigits: 1 });

/** Oś wykresu: 0, 500, 1 tys., 2,5 tys. */
export function formatAxis(value: number, unit: string): string {
  if (unit === "%") return `${compact.format(value)}%`;
  if (unit === "×") return `${compact.format(value)}×`;
  return compact.format(value);
}

/** Udział: nigdy „0,0%” dla prawdziwego, ale małego udziału. */
export function formatShare(pct: number): string {
  if (pct === 0) return "0%";
  if (pct < 0.1) return "<0,1%";
  if (pct < 10) return `${nf(1).format(pct)}%`;
  return `${nf(0).format(pct)}%`;
}

/** Okrągłe podziałki osi: 0 i równe kroki 1 / 2 / 2,5 / 5 × 10^n. */
export function niceTicks(max: number, count = 4): number[] {
  if (!(max > 0)) return [0];
  const raw = max / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw)!;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => +(i * step).toFixed(10));
}
