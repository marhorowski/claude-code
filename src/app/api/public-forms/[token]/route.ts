import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getISOWeek, getWeekBounds } from "@/lib/calculations";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const tokenRecord = await prisma.publicFormToken.findUnique({
    where: { token: params.token },
    include: { client: true },
  });

  if (!tokenRecord) {
    return NextResponse.json({ error: "Nieprawidłowy token" }, { status: 404 });
  }

  // Return users for this client so the form can show a user picker
  const accesses = await prisma.clientAccess.findMany({
    where: { clientId: tokenRecord.clientId },
    include: { user: { select: { id: true, name: true, role: true } } },
  });

  const usersList = accesses.map((a) => ({ id: a.user.id, name: a.user.name, role: a.user.role }));

  // Ensure the token's fixed user is always in the list (even if not in clientAccess)
  if (tokenRecord.userId && !usersList.find((u) => u.id === tokenRecord.userId)) {
    const fixedUser = await prisma.user.findUnique({
      where: { id: tokenRecord.userId },
      select: { id: true, name: true, role: true },
    });
    if (fixedUser) usersList.unshift(fixedUser);
  }

  return NextResponse.json({
    clientId: tokenRecord.clientId,
    clientName: tokenRecord.client.name,
    label: tokenRecord.label,
    userId: tokenRecord.userId,
    users: usersList,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const tokenRecord = await prisma.publicFormToken.findUnique({
    where: { token: params.token },
  });

  if (!tokenRecord) {
    return NextResponse.json({ error: "Nieprawidłowy token" }, { status: 404 });
  }

  const body = await req.json();
  const {
    date,
    selectedUserId,
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
  } = body;

  if (!date) return NextResponse.json({ error: "Brak daty" }, { status: 400 });

  // Use the userId chosen in the form (allows picker override), fall back to token's fixed user
  const userId = selectedUserId || tokenRecord.userId;
  if (!userId) {
    return NextResponse.json({ error: "Wybierz użytkownika" }, { status: 400 });
  }

  const clientId = tokenRecord.clientId;
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

  // Auto-aggregate into WeeklyForm
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

    if (!existingWeekly?.lockedAt) {
      const weeklyData = {
        clientId, weekNumber, year,
        weekStart: wStart, weekEnd: wEnd,
        totalLeads: existingWeekly?.totalLeads ?? totalLeads,
        totalCallsMade, totalMeetingsBooked, totalPlannedMeetings,
        totalAttended, totalClosings, totalRevenue,
        adSpend: adSpend > 0 ? adSpend : existingWeekly?.adSpend ?? null,
        cpl: adSpend > 0 && totalLeads > 0 ? adSpend / totalLeads : existingWeekly?.cpl ?? null,
        notes: existingWeekly?.notes ?? null,
        lockedAt: null,
      };
      if (existingWeekly) {
        await prisma.weeklyForm.update({ where: { id: existingWeekly.id }, data: weeklyData });
      } else {
        await prisma.weeklyForm.create({ data: weeklyData });
      }
    }
  } catch {}

  return NextResponse.json(form);
}
