import { NextResponse } from "next/server";
import { computeMonth, computeQuarter } from "@/lib/report";
import { intParam, loadReportData, requireUser, resolveScope } from "@/lib/server";

export async function GET(req: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const p = new URL(req.url).searchParams;
  const scope = resolveScope(auth.user, p.get("scope"));
  const year = intParam(p.get("year"), 2000, 2100);
  if (!year) return NextResponse.json({ error: "Nieprawidłowy rok" }, { status: 400 });

  const data = await loadReportData(scope);

  if (p.get("period") === "quarter") {
    const quarter = intParam(p.get("quarter"), 1, 4);
    if (!quarter) return NextResponse.json({ error: "Nieprawidłowy kwartał" }, { status: 400 });
    const now = new Date();
    const lastMonth = year === now.getFullYear() && Math.ceil((now.getMonth() + 1) / 3) === quarter ? now.getMonth() + 1 : quarter * 3;
    return NextResponse.json({ scope, results: computeQuarter(data, year, quarter, lastMonth) });
  }

  const month = intParam(p.get("month"), 1, 12);
  if (!month) return NextResponse.json({ error: "Nieprawidłowy miesiąc" }, { status: 400 });
  return NextResponse.json({
    scope,
    results: computeMonth(data, year, month),
    previous: computeMonth(data, month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1),
  });
}
