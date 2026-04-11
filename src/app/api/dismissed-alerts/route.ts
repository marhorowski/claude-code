import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json([], { status: 200 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  if (!clientId) return NextResponse.json([]);

  const alerts = await prisma.dismissedAlert.findMany({
    where: { clientId, userId: session.user.id },
    select: { alertKey: true },
  });

  return NextResponse.json(alerts.map((a) => a.alertKey));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Brak dostępu" }, { status: 401 });

  const { clientId, alertKey } = await req.json();
  if (!clientId || !alertKey) return NextResponse.json({ error: "Brak pól" }, { status: 400 });

  await prisma.dismissedAlert.upsert({
    where: { userId_clientId_alertKey: { userId: session.user.id, clientId, alertKey } },
    update: {},
    create: { userId: session.user.id, clientId, alertKey },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Brak dostępu" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  const alertKey = searchParams.get("alertKey");

  if (!clientId || !alertKey) return NextResponse.json({ error: "Brak pól" }, { status: 400 });

  await prisma.dismissedAlert.deleteMany({
    where: { userId: session.user.id, clientId, alertKey },
  });

  return NextResponse.json({ success: true });
}
