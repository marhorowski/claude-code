export const CSAT_STAGES = [
  { id: "ONBOARDING", label: "Onboarding", question: "Jak oceniasz przebieg onboardingu i startu kampanii?" },
  { id: "RAPORT", label: "Raport miesięczny", question: "Jak oceniasz ostatni raport miesięczny?" },
  { id: "CALL", label: "Call strategiczny", question: "Jak oceniasz ostatni call strategiczny?" },
  { id: "INNE", label: "Inne", question: "Jak oceniasz współpracę z nami w ostatnim czasie?" },
] as const;

export const NPS_QUESTION = "Jak bardzo prawdopodobne jest, że polecisz naszą agencję znajomemu przedsiębiorcy?";

export function stageLabel(stage: string | null | undefined): string {
  return CSAT_STAGES.find((s) => s.id === stage)?.label ?? "";
}
