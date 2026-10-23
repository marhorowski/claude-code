import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeMonth } from "@/lib/report";
import { monthKey } from "@/lib/dates";
import { intParam, loadReportData, requireLeader } from "@/lib/server";

export async function GET(req: Request) {
  const auth = await requireLeader();
  if (auth.error) return auth.error;
  const p = new URL(req.url).searchParams;
  const year = intParam(p.get("year"), 2000, 2100);
  const month = intParam(p.get("month"), 1, 12);
  if (!year || !month) return NextResponse.json({ error: "Nieprawidłowy okres" }, { status: 400 });

  const users = await prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, role: true, fte: true } });
  const rows = [];
  for (const u of users) {
    const data = await loadReportData(u.id);
    const filled = data.monthly.has(monthKey(year, month));
    if (!filled && u.role === "LIDER") continue;
    rows.push({ user: u, filled, results: computeMonth(data, year, month) });
  }
  const team = computeMonth(await loadReportData("team"), year, month);
  return NextResponse.json({ rows, team });
}
