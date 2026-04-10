import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  // Closer/Setter see only their own data
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
