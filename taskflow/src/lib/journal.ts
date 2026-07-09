import { ID } from "./types";

export type JournalType = "day" | "week";

export interface JournalEntry {
  id: ID;
  type: JournalType;
  date: string; // dzień: "yyyy-MM-dd"; tydzień: data poniedziałku
  answers: Record<string, string>;
  aiText: string;
  createdAt: string;
  updatedAt: string;
}

export interface JournalQuestion {
  id: string;
  section: string;
  text: string;
  hint?: string;
}

export const DAY_QUESTIONS: JournalQuestion[] = [
  {
    id: "d_stan",
    section: "STAN (ciało / umysł)",
    text: "Czy brakowało dziś zasobów? Jakich?",
    hint: "Energia · Uwaga · Pewność · Czas · Focus · Pragnienia",
  },
  {
    id: "d_toz1",
    section: "TOŻSAMOŚĆ",
    text: "Czy czułem synchronizację z tym, kim chcę się stać?",
  },
  {
    id: "d_toz2",
    section: "TOŻSAMOŚĆ",
    text: "Czy dzisiejsze działania pasowały do człowieka, którym chcę się stawać?",
  },
  {
    id: "d_toz3",
    section: "TOŻSAMOŚĆ",
    text: "Co dziś zrobiłem „Twardy”, a co „Wolny”? Który wygrał i dlaczego?",
  },
  {
    id: "d_post1",
    section: "POSTĘP",
    text: "Czy dziś zbliżyłem się do celu, czy tylko wyglądałem na zajętego?",
  },
  {
    id: "d_post2",
    section: "POSTĘP",
    text: "Co dziś zrobiłem, czego bym nie zrobił rok temu?",
  },
  {
    id: "d_cien",
    section: "PRZESZKODA / CIEŃ",
    text: "Czego dziś unikałem i dlaczego?",
  },
  {
    id: "d_nauka",
    section: "NAUKA",
    text: "Co dziś odkryłem o sobie, o innych, albo o tym jak działa świat?",
  },
  {
    id: "d_koniec",
    section: "ZAMKNIĘCIE DNIA",
    text: "Gdybym jutro miał powtórzyć dokładnie ten dzień — co bym zmienił?",
  },
];

export const WEEK_QUESTIONS: JournalQuestion[] = [
  {
    id: "w_win",
    section: "ZWYCIĘSTWO",
    text: "Największe zwycięstwo tygodnia — co konkretnie i dlaczego się udało?",
  },
  {
    id: "w_cel",
    section: "POSTĘP",
    text: "Czy ten tydzień realnie przybliżył mnie do celu głównego? O ile — liczby, fakty?",
  },
  {
    id: "w_blok",
    section: "PRZESZKODA",
    text: "Co powtarzało się jako przeszkoda przez cały tydzień?",
  },
  {
    id: "w_nauka",
    section: "NAUKA",
    text: "Czego się nauczyłem i co konkretnie wdrożę?",
  },
  {
    id: "w_fokus",
    section: "NASTĘPNY TYDZIEŃ",
    text: "Jeden fokus na następny tydzień — co musi się wydarzyć?",
  },
];

export interface JournalStats {
  totalSec: number;
  tasksCompleted: string[];
  pulseRealize: number;
  pulseWaste: number;
  habitsDone: number;
  habitsTotal: number;
  targetHoursPerDay: number;
}

interface StatsSource {
  tasks: { completedAt: string | null; title: string }[];
  habits: { log: Record<string, number>; targetCount: number }[];
  pulseLog: { ts: string; answer: string }[];
  workLog: Record<string, number>;
  settings: { targetHoursPerDay: number };
}

/** Twarde dane dla trenera z podanych dni. */
export function buildStatsForDates(
  dates: string[],
  s: StatsSource
): JournalStats {
  const totalSec = dates.reduce((a, d) => a + (s.workLog[d] ?? 0), 0);
  const completed = s.tasks
    .filter((t) => t.completedAt && dates.includes(t.completedAt.slice(0, 10)))
    .map((t) => t.title);
  const pulses = s.pulseLog.filter((p) => dates.includes(p.ts.slice(0, 10)));
  const habitsDone = s.habits.filter((h) => {
    const sum = dates.reduce((a, d) => a + (h.log[d] ?? 0), 0);
    return sum >= h.targetCount;
  }).length;
  return {
    totalSec,
    tasksCompleted: completed,
    pulseRealize: pulses.filter((p) => p.answer === "realize").length,
    pulseWaste: pulses.filter((p) => p.answer === "waste").length,
    habitsDone,
    habitsTotal: s.habits.length,
    targetHoursPerDay: s.settings.targetHoursPerDay || 6,
  };
}

/** Zapytaj trenera AI; fallback: lokalny szczery komentarz. */
export async function coachVerdict(
  type: JournalType,
  date: string,
  answers: Record<string, string>,
  stats: JournalStats
): Promise<string> {
  const questions = type === "day" ? DAY_QUESTIONS : WEEK_QUESTIONS;
  const labeled: Record<string, string> = {};
  for (const q of questions) {
    if ((answers[q.id] ?? "").trim()) {
      labeled[`[${q.section}] ${q.text}`] = answers[q.id].trim();
    }
  }
  try {
    const res = await fetch("/api/ai-journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, date, answers: labeled, stats }),
    });
    if (res.ok) {
      const d = await res.json();
      if (d.text) return d.text as string;
    }
  } catch {
    // fallback niżej
  }
  return localCoach(type, answers, stats);
}

/** Lokalny, szczery komentarz — działa bez klucza AI. */
export function localCoach(
  type: JournalType,
  answers: Record<string, string>,
  stats: JournalStats
): string {
  const lines: string[] = [];
  const answered = Object.values(answers).filter((a) => a.trim().length > 2)
    .length;
  const hours = stats.totalSec / 3600;
  const period = type === "day" ? "Dziś" : "W tym tygodniu";
  const target =
    type === "day" ? stats.targetHoursPerDay : stats.targetHoursPerDay * 5;

  lines.push(
    `${period}: ${Math.round(hours * 10) / 10} h skupionej pracy (cel: ${target} h), ` +
      `${stats.tasksCompleted.length} ukończonych zadań, ` +
      `puls ${stats.pulseRealize}:${stats.pulseWaste} (realizuję:marnuję).`
  );

  if (answered < 3) {
    lines.push(
      "Odpowiedziałeś ledwo na kilka pytań. Refleksja na pół gwizdka to nie refleksja — wróć i odpowiedz szczerze, albo nie udawaj, że journalujesz."
    );
  }
  if (hours < target * 0.4) {
    lines.push(
      "Liczby nie kłamią: czas skupionej pracy to ułamek celu. Możesz mieć najlepsze przemyślenia świata, ale bez godzin przy ważnych zadaniach cel się nie zbliży."
    );
  } else if (hours >= target) {
    lines.push(
      "Wymiar pracy zrealizowany — to jest standard, nie osiągnięcie. Pytanie brzmi: czy to były godziny przy rzeczach, które przesuwają cel, czy przy wygodnych zadaniach?"
    );
  }
  if (stats.pulseWaste > stats.pulseRealize) {
    lines.push(
      "Puls częściej pokazywał „marnuję” niż „realizuję”. Sam to przyznałeś w trakcie dnia — więc nie opowiadaj sobie wieczorem innej historii."
    );
  }
  const avoid = answers["d_cien"] ?? answers["w_blok"] ?? "";
  if (avoid.trim().length > 2) {
    lines.push(
      `Unikanie, które opisałeś, to jutrzejsze pierwsze zadanie. Zrób to zanim otworzysz cokolwiek innego — inaczej za tydzień napiszesz tu to samo.`
    );
  }
  lines.push(
    type === "day"
      ? "Jutro: jedna rzecz z odpowiedzi na pytanie 8 wchodzi do planu dnia jako fokus. Wykonaj, nie negocjuj."
      : "Fokus tygodnia z ostatniej odpowiedzi wpisz do „Ustalania tygodnia” i powiąż z nim zadania. Bez tego to tylko literatura."
  );
  return lines.join("\n\n");
}
