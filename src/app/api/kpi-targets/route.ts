import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Brak dostępu" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  const period = searchParams.get("period");

  if (!clientId) return NextResponse.json({ error: "Brak clientId" }, { status: 400 });

  const where: any = { clientId };
  if (period) where.period = period;

  const targets = await prisma.kpiTarget.findMany({ where, orderBy: { code: "asc" } });
  return NextResponse.json(targets);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const body = await req.json();
  const { targets } = body;

  if (!targets || !Array.isArray(targets)) {
    return NextResponse.json({ error: "Brak celów" }, { status: 400 });
  }

  const updated = [];
  for (const t of targets) {
    const result = await prisma.kpiTarget.update({
      where: { id: t.id },
      data: { target: t.target },
    });
    updated.push(result);
  }

  return NextResponse.json(updated);
}
