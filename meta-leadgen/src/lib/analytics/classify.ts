import { derive, type Metrics, type Totals } from "./metrics";

export type Label = "scale" | "winner" | "promising" | "neutral" | "weak" | "kill" | "learning" | "no_delivery";

export const LABELS: Record<Label, { text: string; order: number }> = {
  scale: { text: "Do skalowania", order: 0 },
  winner: { text: "Wygrana", order: 1 },
  promising: { text: "Obiecująca", order: 2 },
  neutral: { text: "OK", order: 3 },
  learning: { text: "Za mało danych", order: 4 },
  weak: { text: "Słabsza", order: 5 },
  kill: { text: "Do wyłączenia", order: 6 },
  no_delivery: { text: "Brak wyświetleń", order: 7 },
};

export type Thresholds = {
  targetCostPerBooking: number;
  targetCpl: number | null;
  minBookingsForWin: number;
  killSpendMultiplier: number;
  maxFrequency: number;
};

export type ClassifyInput = {
  totals: Totals; // cały analizowany okres
  recent?: Totals; // ostatnie 3 dni, do oceny stabilności
  frequency7d?: number | null;
  active: boolean;
};

export type Classification = { label: Label; reasons: string[] };

const fmt = (v: number) => Math.round(v).toLocaleString("pl-PL");

export function classify(input: ClassifyInput, t: Thresholds): Classification {
  const m: Metrics = derive(input.totals);
  const target = t.targetCostPerBooking;
  const killSpend = target * t.killSpendMultiplier;
  const freq = input.frequency7d ?? null;
  const reasons: string[] = [];

  const leadQualityNote = () => {
    if (t.targetCpl && m.cpl !== null && m.cpl <= t.targetCpl && m.leads >= 5) {
      reasons.push(
        `Leady są tanie (CPL ${fmt(m.cpl)}), ale umawia się tylko ${m.bookingRate === null ? 0 : Math.round(m.bookingRate)}% — sprawdź dopasowanie przekazu i jakość leadów.`,
      );
    }
  };
  const fatigueNote = () => {
    if (freq !== null && freq > t.maxFrequency) reasons.push(`Frequency ${freq.toFixed(1)} w 7 dni — możliwe zmęczenie kreacji.`);
  };

  if (m.spend <= 0 || m.impressions === 0) return { label: "no_delivery", reasons: ["Brak wydatków w tym okresie."] };

  if (m.bookings === 0) {
    if (m.spend >= killSpend) {
      reasons.push(`Wydano ${fmt(m.spend)} (≥ ${t.killSpendMultiplier}× cel ${fmt(target)}) bez żadnego spotkania.`);
      leadQualityNote();
      return { label: "kill", reasons };
    }
    reasons.push(`Wydano ${fmt(m.spend)} z ~${fmt(killSpend)} potrzebnych do oceny. Brak spotkań na razie.`);
    if (m.leads > 0 && m.cpl !== null) reasons.push(`${fmt(m.leads)} leadów, CPL ${fmt(m.cpl)}.`);
    return { label: "learning", reasons };
  }

  const cpb = m.cpb as number;
  const vsTarget = Math.round(((cpb - target) / target) * 100);

  if (cpb <= target) {
    if (m.bookings < t.minBookingsForWin) {
      reasons.push(`Koszt spotkania ${fmt(cpb)} (cel ${fmt(target)}), ale tylko ${fmt(m.bookings)} spotk. — potrzeba min. ${t.minBookingsForWin} do potwierdzenia.`);
      return { label: "promising", reasons };
    }
    reasons.push(`Koszt spotkania ${fmt(cpb)} — ${Math.abs(vsTarget)}% poniżej celu, ${fmt(m.bookings)} spotkań.`);

    const recent = input.recent ? derive(input.recent) : null;
    const recentStable =
      !recent || recent.spend < target * 0.5 || (recent.cpb !== null && recent.cpb <= target * 1.2);
    const freqOk = freq === null || freq < t.maxFrequency * 0.85;

    if (input.active && recentStable && freqOk) {
      reasons.push("Stabilna w ostatnich dniach i frequency w normie — można zwiększać budżet.");
      return { label: "scale", reasons };
    }
    if (!input.active) reasons.push("Reklama jest wyłączona — rozważ ponowne włączenie lub duplikację.");
    if (!recentStable)
      reasons.push(
        recent?.cpb ? `Ostatnie 3 dni słabsze (koszt spotkania ${fmt(recent.cpb)}) — obserwuj przed skalowaniem.` : "Ostatnie 3 dni bez spotkań — obserwuj przed skalowaniem.",
      );
    if (!freqOk) reasons.push(`Frequency ${freq?.toFixed(1)} — zamiast skalować, przygotuj odświeżoną wersję kreacji.`);
    return { label: "winner", reasons };
  }

  if (cpb <= target * 1.15) {
    reasons.push(`Koszt spotkania ${fmt(cpb)} — blisko celu (+${vsTarget}%).`);
    fatigueNote();
    return { label: "neutral", reasons };
  }

  if (cpb > killSpend && m.spend >= killSpend) {
    reasons.push(`Koszt spotkania ${fmt(cpb)} — ${vsTarget}% powyżej celu przy wydatku ${fmt(m.spend)}.`);
    leadQualityNote();
    fatigueNote();
    return { label: "kill", reasons };
  }

  reasons.push(`Koszt spotkania ${fmt(cpb)} — ${vsTarget}% powyżej celu.`);
  leadQualityNote();
  fatigueNote();
  return { label: "weak", reasons };
}
