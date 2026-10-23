import { NextResponse } from "next/server";
import { canEditFor, intParam, loadWeeks, requireUser } from "@/lib/server";
import { aggregateInputs, WEEKLY_FIELDS } from "@/lib/fields";

// Podpowiedź do formularza miesięcznego: sumy z tygodni miesiąca
export async function GET(req: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const p = new URL(req.url).searchParams;
  const year = intParam(p.get("year"), 2000, 2100);
  const month = intParam(p.get("month"), 1, 12);
  const userId = p.get("userId") || auth.user.id;
  if (!year || !month) return NextResponse.json({ error: "Nieprawidłowy okres" }, { status: 400 });
  if (!canEditFor(auth.user, userId)) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const { weeks } = await loadWeeks(userId, year, month);
  const filled = weeks.filter((w) => w.inputs);
  if (filled.length === 0) return NextResponse.json({ weeks: 0, values: {} });

  const sums = aggregateInputs(filled.map((w) => w.inputs!), WEEKLY_FIELDS)!;
  const first = filled[0].inputs!;
  return NextResponse.json({
    weeks: filled.length,
    values: {
      activeClientsStart: first.activeClientsStart,
      mrrStart: first.mrrStart,
      churnedClients: sums.churnedClients,
      churnMrr: sums.churnMrr,
      downgradeMrr: sums.downgradeMrr,
      expansionMrr: sums.expansionMrr,
    },
  });
}
