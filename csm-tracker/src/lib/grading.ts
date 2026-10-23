export type KpiStatus = "GOD" | "GREEN" | "ORANGE" | "RED" | "NONE";

// Progi w % normy: poniżej `orange` = czerwony, poniżej `green` = pomarańczowy,
// do `god` włącznie = zielony, powyżej = God Mode.
export interface Thresholds {
  orange: number;
  green: number;
  god: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = { orange: 65, green: 95, god: 120 };

// Realizacja normy w %. Dla metryk "niżej = lepiej" odwrócona (norma / wynik).
export function performance(value: number | null, target: number, lowerIsBetter: boolean): number | null {
  if (value === null || !Number.isFinite(value) || target === 0) return null;
  if (lowerIsBetter) {
    if (value <= 0) return Infinity;
    return (target / value) * 100;
  }
  return (value / target) * 100;
}

export function grade(perf: number | null, t: Thresholds = DEFAULT_THRESHOLDS): KpiStatus {
  if (perf === null) return "NONE";
  if (perf < t.orange) return "RED";
  if (perf < t.green) return "ORANGE";
  if (perf <= t.god) return "GREEN";
  return "GOD";
}

export function statusColor(s: KpiStatus): string {
  switch (s) {
    case "GOD": return "#EAB308";
    case "GREEN": return "#22C55E";
    case "ORANGE": return "#F97316";
    case "RED": return "#EF4444";
    default: return "var(--text-muted)";
  }
}

export function statusLabel(s: KpiStatus): string {
  switch (s) {
    case "GOD": return "God Mode 🥇";
    case "GREEN": return "W normie 🟢";
    case "ORANGE": return "Poniżej normy 🟠";
    case "RED": return "Red flag 🔴";
    default: return "Brak danych";
  }
}

export function parseThresholds(raw: string | null | undefined): Thresholds {
  if (!raw) return DEFAULT_THRESHOLDS;
  try {
    const t = JSON.parse(raw);
    if ([t.orange, t.green, t.god].every((n) => typeof n === "number" && Number.isFinite(n)) && t.orange < t.green && t.green < t.god) {
      return { orange: t.orange, green: t.green, god: t.god };
    }
  } catch {}
  return DEFAULT_THRESHOLDS;
}
