import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

  return NextResponse.json({
    clientId: tokenRecord.clientId,
    clientName: tokenRecord.client.name,
    label: tokenRecord.label,
    userId: tokenRecord.userId,
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

  if (!tokenRecord.userId) {
    return NextResponse.json({ error: "Token nie jest przypisany do użytkownika" }, { status: 400 });
  }

  const body = await req.json();
  const {
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
    notes,
  } = body;

  if (!date) return NextResponse.json({ error: "Brak daty" }, { status: 400 });

  const clientId = tokenRecord.clientId;
  const userId = tokenRecord.userId;
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
    notes: notes ?? null,
  };

  let form;
  if (existing) {
    form = await prisma.dailyForm.update({ where: { id: existing.id }, data });
  } else {
    form = await prisma.dailyForm.create({ data });
  }

  return NextResponse.json(form);
}
