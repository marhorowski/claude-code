import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Brak dostępu" }, { status: 401 });

  let clients;
  if (session.user.role === "ADMIN") {
    clients = await prisma.client.findMany({ orderBy: { name: "asc" } });
  } else {
    const accesses = await prisma.clientAccess.findMany({
      where: { userId: session.user.id },
      include: { client: true },
    });
    clients = accesses.map((a) => a.client);
  }

  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const body = await req.json();
  const { name, strategy } = body;

  if (!name) return NextResponse.json({ error: "Brak nazwy klienta" }, { status: 400 });

  const client = await prisma.client.create({
    data: { name, strategy: strategy || "Paid Lead Gen" },
  });

  // Copy default KPI targets from default client
  const defaultTargets = await prisma.kpiTarget.findMany({
    where: { clientId: "default-client" },
  });

  for (const t of defaultTargets) {
    await prisma.kpiTarget.create({
      data: {
        clientId: client.id,
        code: t.code,
        label: t.label,
        target: t.target,
        unit: t.unit,
        period: t.period,
        lowerIsBetter: t.lowerIsBetter,
      },
    });
  }

  // Assign admin access
  await prisma.clientAccess.create({
    data: { userId: session.user.id, clientId: client.id },
  });

  return NextResponse.json(client);
}
