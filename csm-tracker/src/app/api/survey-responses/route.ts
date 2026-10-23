import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { intParam, requireLeader } from "@/lib/server";
import { monthRangeUtc } from "@/lib/dates";

export async function GET(req: Request) {
  const auth = await requireLeader();
  if (auth.error) return auth.error;
  const p = new URL(req.url).searchParams;
  const year = intParam(p.get("year"), 2000, 2100);
  const month = intParam(p.get("month"), 1, 12);
  if (!year || !month) return NextResponse.json({ error: "Nieprawidłowy okres" }, { status: 400 });
  const { from, to } = monthRangeUtc(year, month);
  const rows = await prisma.surveyResponse.findMany({
    where: { createdAt: { gte: from, lt: to } },
    orderBy: { createdAt: "desc" },
    include: { link: { select: { label: true, csm: { select: { name: true } } } } },
  });
  return NextResponse.json(rows);
}
