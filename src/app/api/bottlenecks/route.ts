import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Brak dostępu" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  const status = searchParams.get("status");

  if (!clientId) return NextResponse.json({ error: "Brak clientId" }, { status: 400 });

  const where: any = { clientId };
  if (status) where.status = status;

  const bottlenecks = await prisma.bottleneck.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(bottlenecks);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const body = await req.json();
  const { clientId, kpiCode, title, description, actions } = body;

  if (!clientId || !kpiCode || !title || !description || !actions) {
    return NextResponse.json({ error: "Brak wymaganych pól" }, { status: 400 });
  }

  const bottleneck = await prisma.bottleneck.create({
    data: {
      clientId,
      kpiCode,
      title,
      description,
      actions: JSON.stringify(actions),
      isAuto: false,
      status: "ACTIVE",
    },
  });

  return NextResponse.json(bottleneck);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Brak dostępu" }, { status: 401 });

  if (session.user.role === "CLOSER" || session.user.role === "SETTER") {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const body = await req.json();
  const { id, status } = body;

  if (!id || !status) return NextResponse.json({ error: "Brak wymaganych pól" }, { status: 400 });

  const bottleneck = await prisma.bottleneck.update({
    where: { id },
    data: {
      status: status,
      resolvedAt: status === "RESOLVED" ? new Date() : null,
    },
  });

  return NextResponse.json(bottleneck);
}
