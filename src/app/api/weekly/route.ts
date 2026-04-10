import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getISOWeek, getWeekBounds } from "@/lib/calculations";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Brak dostępu" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  const weekNumber = searchParams.get("week");
  const year = searchParams.get("year");

  if (!clientId) return NextResponse.json({ error: "Brak clientId" }, { status: 400 });

  const where: any = { clientId };
  if (weekNumber && year) {
    where.weekNumber = parseInt(weekNumber);
    where.year = parseInt(year);
  }

  const forms = await prisma.weeklyForm.findMany({
    where,
    orderBy: [{ year: "desc" }, { weekNumber: "desc" }],
  });

  return NextResponse.json(forms);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Brak dostępu" }, { status: 401 });

  if (session.user.role !== "ADMIN" && session.user.role !== "LIDER") {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const body = await req.json();
  const { clientId, weekNumber, year, totalLeads, adSpend, cpl, notes, lock } = body;

  if (!clientId || !weekNumber || !year) {
    return NextResponse.json({ error: "Brak wymaganych pól" }, { status: 400 });
  }

  const { start, end } = getWeekBounds(weekNumber, year);

  // Aggregate daily forms
  const dailyForms = await prisma.dailyForm.findMany({
    where: {
      clientId,
      date: { gte: start, lte: end },
    },
  });

  const totalCallsMade = dailyForms.reduce((s, f) => s + (f.callsMade ?? 0), 0);
  const totalMeetingsBooked = dailyForms.reduce((s, f) => s + (f.meetingsBooked ?? 0), 0);
  const totalPlannedMeetings = dailyForms.reduce((s, f) => s + (f.plannedMeetings ?? 0), 0);
  const totalAttended = dailyForms.reduce((s, f) => s + (f.attendedMeetings ?? 0), 0);
  const totalClosings = dailyForms.reduce((s, f) => s + (f.closings ?? 0), 0);
  const totalRevenue = dailyForms.reduce((s, f) => s + (f.revenue ?? 0), 0);

  const computedCpl = adSpend && totalLeads ? adSpend / totalLeads : cpl ?? null;

  const existing = await prisma.weeklyForm.findUnique({
    where: { clientId_weekNumber_year: { clientId, weekNumber, year } },
  });

  if (existing?.lockedAt && !lock) {
    return NextResponse.json({ error: "Tydzień jest zamknięty" }, { status: 400 });
  }

  const data = {
    clientId,
    weekNumber,
    year,
    weekStart: start,
    weekEnd: end,
    totalLeads: totalLeads ?? existing?.totalLeads ?? 0,
    totalCallsMade,
    totalMeetingsBooked,
    totalPlannedMeetings,
    totalAttended,
    totalClosings,
    totalRevenue,
    adSpend: adSpend ?? existing?.adSpend ?? null,
    cpl: computedCpl,
    notes: notes ?? existing?.notes ?? null,
    lockedAt: lock ? new Date() : existing?.lockedAt ?? null,
  };

  let form;
  if (existing) {
    form = await prisma.weeklyForm.update({ where: { id: existing.id }, data });
  } else {
    form = await prisma.weeklyForm.create({ data });
  }

  return NextResponse.json(form);
}
