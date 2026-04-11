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
  const date = searchParams.get("date");
  const userId = searchParams.get("userId");

  if (!clientId) return NextResponse.json({ error: "Brak clientId" }, { status: 400 });

  const where: any = { clientId };

  if (date) {
    const d = new Date(date);
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    where.date = { gte: start, lte: end };
  }

  if (session.user.role === "CLOSER" || session.user.role === "SETTER") {
    where.userId = session.user.id;
  } else if (userId) {
    where.userId = userId;
  }

  const forms = await prisma.dailyForm.findMany({
    where,
    include: { user: true },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(forms);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Brak dostępu" }, { status: 401 });

  const body = await req.json();
  const {
    clientId,
    date,
    plannedMeetings,
    attendedMeetings,
    closings,
    revenue,
    callsMade,
    meetingsBooked,
    vslMeetingsBooked,
    dailyLeads,
    dailyAdSpend,
    dailyClicks,
    dailyImpressions,
    dailyCtr,
    callsReceived,
    followUpCount,
    unqualifiedMeetings,
    meetingFollowUps,
    notes,
    targetUserId,
  } = body;

  if (!clientId || !date) {
    return NextResponse.json({ error: "Brak wymaganych pól" }, { status: 400 });
  }

  const userId =
    (session.user.role === "ADMIN" || session.user.role === "LIDER") && targetUserId
      ? targetUserId
      : session.user.id;

  const parsedDate = new Date(date);
  const start = new Date(parsedDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(parsedDate);
  end.setHours(23, 59, 59, 999);

  const existing = await prisma.dailyForm.findFirst({
    where: { clientId, userId, date: { gte: start, lte: end } },
  });

  const data = {
    clientId,
    userId,
    date: parsedDate,
    plannedMeetings: plannedMeetings ?? null,
    attendedMeetings: attendedMeetings ?? null,
    closings: closings ?? null,
    revenue: revenue ?? null,
    callsMade: callsMade ?? null,
    meetingsBooked: meetingsBooked ?? null,
    vslMeetingsBooked: vslMeetingsBooked ?? null,
    dailyLeads: dailyLeads ?? null,
    dailyAdSpend: dailyAdSpend ?? null,
    dailyClicks: dailyClicks ?? null,
    dailyImpressions: dailyImpressions ?? null,
    dailyCtr: dailyCtr ?? null,
    callsReceived: callsReceived ?? null,
    followUpCount: followUpCount ?? null,
    unqualifiedMeetings: unqualifiedMeetings ?? null,
    meetingFollowUps: meetingFollowUps ?? null,
    notes: notes ?? null,
  };

  let form;
  if (existing) {
    form = await prisma.dailyForm.update({ where: { id: existing.id }, data });
  } else {
    form = await prisma.dailyForm.create({ data });
  }

  // Auto-aggregate into WeeklyForm so dashboards stay up to date
  try {
    const { week: weekNumber, year } = getISOWeek(parsedDate);
    const { start: wStart, end: wEnd } = getWeekBounds(weekNumber, year);

    const dailyForms = await prisma.dailyForm.findMany({
      where: { clientId, date: { gte: wStart, lte: wEnd } },
    });

    const totalCallsMade = dailyForms.reduce((s, f) => s + (f.callsMade ?? 0), 0);
    const totalMeetingsBooked = dailyForms.reduce((s, f) => s + (f.meetingsBooked ?? 0), 0);
    const totalPlannedMeetings = dailyForms.reduce((s, f) => s + (f.plannedMeetings ?? 0), 0);
    const totalAttended = dailyForms.reduce((s, f) => s + (f.attendedMeetings ?? 0), 0);
    const totalClosings = dailyForms.reduce((s, f) => s + (f.closings ?? 0), 0);
    const totalRevenue = dailyForms.reduce((s, f) => s + (f.revenue ?? 0), 0);
    const totalLeads = dailyForms.reduce((s, f) => s + (f.dailyLeads ?? 0), 0);
    const adSpend = dailyForms.reduce((s, f) => s + (f.dailyAdSpend ?? 0), 0);

    const existingWeekly = await prisma.weeklyForm.findUnique({
      where: { clientId_weekNumber_year: { clientId, weekNumber, year } },
    });

    if (existingWeekly?.lockedAt) {
      // Don't overwrite locked weeks
    } else {
      const weeklyData = {
        clientId,
        weekNumber,
        year,
        weekStart: wStart,
        weekEnd: wEnd,
        totalLeads: existingWeekly?.totalLeads ?? totalLeads,
        totalCallsMade,
        totalMeetingsBooked,
        totalPlannedMeetings,
        totalAttended,
        totalClosings,
        totalRevenue,
        adSpend: adSpend > 0 ? adSpend : existingWeekly?.adSpend ?? null,
        cpl: (adSpend > 0 && totalLeads > 0) ? adSpend / totalLeads : existingWeekly?.cpl ?? null,
        notes: existingWeekly?.notes ?? null,
        lockedAt: null,
      };

      if (existingWeekly) {
        await prisma.weeklyForm.update({ where: { id: existingWeekly.id }, data: weeklyData });
      } else {
        await prisma.weeklyForm.create({ data: weeklyData });
      }
    }
  } catch {
    // Weekly aggregation failure is non-fatal
  }

  return NextResponse.json(form);
}
