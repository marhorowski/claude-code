import { Task, Project, Settings } from "./types";
import { fmtHM } from "./dates";

export interface DayContext {
  date: string;
  totalSec: number;
  completed: Task[];
  remainingToday: Task[];
  projects: Project[];
  settings: Settings;
}

/** Lokalny generator podsumowania — działa bez klucza API. */
export function localSummary(ctx: DayContext): string {
  const { totalSec, completed, remainingToday, settings } = ctx;
  const hours = totalSec / 3600;
  const target = settings.targetHoursPerDay;
  const lines: string[] = [];

  lines.push(
    `Przepracowany czas: ${fmtHM(totalSec)}${
      target ? ` (cel dzienny: ${target} h)` : ""
    }.`
  );
  lines.push(
    `Ukończone zadania: ${completed.length}${
      completed.length ? " — " + completed.map((t) => t.title).join(", ") : ""
    }.`
  );

  if (completed.length >= 3 && hours >= target) {
    lines.push(
      "Świetny dzień — solidna liczba domkniętych zadań i pełny wymiar skupionej pracy. Utrzymaj to tempo."
    );
  } else if (completed.length > 0 && hours < target * 0.5) {
    lines.push(
      "Zadania szły do przodu, ale czasu skupionej pracy było niewiele. Jutro spróbuj zacząć od jednej pełnej sesji Pomodoro zanim otworzysz cokolwiek innego."
    );
  } else if (completed.length === 0 && hours > 0) {
    lines.push(
      "Sporo czasu w pracy, ale nic nie zostało domknięte — możliwe, że zadania są za duże. Rozbij największe zadanie na 2–3 mniejsze z checklistą."
    );
  } else if (completed.length === 0 && hours === 0) {
    lines.push(
      "Dziś bez zarejestrowanej pracy. Jeśli to był dzień wolny — w porządku. Jeśli nie: jutro zacznij od najmniejszego zadania z listy, żeby ruszyć z miejsca."
    );
  } else {
    lines.push("Dobra, systematyczna praca. Krok po kroku do celu.");
  }

  const fasters = completed.filter((t) => t.onTime === "faster").length;
  const slowers = completed.filter((t) => t.onTime === "slower").length;
  if (slowers > fasters && slowers > 0) {
    lines.push(
      "Większość zadań zajęła więcej czasu niż zakładano — planując jutro dodaj ~30% zapasu do estymacji."
    );
  } else if (fasters > 0 && slowers === 0) {
    lines.push(
      "Zadania szły szybciej niż planowano — możesz jutro śmielej dołożyć jedno ambitniejsze zadanie."
    );
  }

  if (remainingToday.length > 0) {
    lines.push(
      `Niedokończone na dziś (${remainingToday.length}): ${remainingToday
        .map((t) => t.title)
        .join(", ")} — przy „Ustalaniu dnia" zdecyduj, czy przenieść je na jutro.`
    );
  }

  return lines.join("\n\n");
}

/** Próbuje AI (endpoint /api/ai-summary), w razie braku klucza — lokalne podsumowanie. */
export async function generateSummary(ctx: DayContext): Promise<string> {
  try {
    const res = await fetch("/api/ai-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: ctx.date,
        totalSec: ctx.totalSec,
        targetHoursPerDay: ctx.settings.targetHoursPerDay,
        completed: ctx.completed.map((t) => ({
          title: t.title,
          timeSpentSec: t.timeSpentSec,
          estimateMin: t.estimateMin,
          onTime: t.onTime,
          note: t.completionNote,
        })),
        remainingToday: ctx.remainingToday.map((t) => t.title),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.text) return data.text as string;
    }
  } catch {
    // brak sieci / klucza — spadamy do lokalnego generatora
  }
  return localSummary(ctx);
}
