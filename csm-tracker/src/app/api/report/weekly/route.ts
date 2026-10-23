import { NextResponse } from "next/server";
import { computeMonth, weeklyResults, weeklyValues } from "@/lib/report";
import { isoDate, weekLabel } from "@/lib/dates";
import { intParam, loadReportData, loadWeeks, requireUser, resolveScope } from "@/lib/server";

export async function GET(req: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const p = new URL(req.url).searchParams;
  const scope = resolveScope(auth.user, p.get("scope"));
  const year = intParam(p.get("year"), 2000, 2100);
  const month = intParam(p.get("month"), 1, 12);
  if (!year || !month) return NextResponse.json({ error: "Nieprawidłowy okres" }, { status: 400 });

  const [{ mondays, weeks }, data] = await Promise.all([loadWeeks(scope, year, month), loadReportData(scope)]);
  const filled = weeks.filter((w) => w.inputs).map((w) => w.inputs!);
  const monthResults = computeMonth(data, year, month);

  return NextResponse.json({
    scope,
    weeks: weeks.map((w) => ({
      weekStart: isoDate(w.monday),
      label: weekLabel(w.monday),
      entries: w.entries,
      values: w.inputs ? weeklyValues([w.inputs]) : null,
    })),
    mtd: weeklyResults(data, filled, mondays.length),
    // RET90 i NPS mają kohortę/kwartał — pokazujemy wartości z formularza miesięcznego i ankiet
    fromMonth: monthResults.filter((r) => r.code === "RET90" || r.code === "NPS"),
  });
}
