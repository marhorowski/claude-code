import { NextResponse } from "next/server";
import { KPI_BY_CODE } from "@/lib/kpis";
import { computeMonth } from "@/lib/report";
import { addMonths, MONTHS_PL } from "@/lib/dates";
import { intParam, loadReportData, requireUser, resolveScope } from "@/lib/server";

export async function GET(req: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const p = new URL(req.url).searchParams;
  const scope = resolveScope(auth.user, p.get("scope"));
  const year = intParam(p.get("year"), 2000, 2100);
  const month = intParam(p.get("month"), 1, 12);
  const months = intParam(p.get("months") ?? "6", 2, 24) ?? 6;
  const codes = (p.get("codes") ?? "").split(",").filter((c) => KPI_BY_CODE[c]);
  if (!year || !month || codes.length === 0) return NextResponse.json({ error: "Nieprawidłowe parametry" }, { status: 400 });

  const data = await loadReportData(scope);
  const series = [];
  for (let i = months - 1; i >= 0; i--) {
    const { year: y, month: m } = addMonths(year, month, -i);
    const res = computeMonth(data, y, m);
    const point: Record<string, number | string | null> = { label: `${MONTHS_PL[m - 1].slice(0, 3)} ${String(y).slice(2)}` };
    for (const c of codes) point[c] = res.find((r) => r.code === c)?.value ?? null;
    series.push(point);
  }
  return NextResponse.json({ series });
}
