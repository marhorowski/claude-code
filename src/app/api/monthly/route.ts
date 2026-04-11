import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Brak dostępu" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  if (!clientId) return NextResponse.json({ error: "Brak clientId" }, { status: 400 });

  const where: any = { clientId };
  if (month && year) {
    where.month = parseInt(month);
    where.year = parseInt(year);
  }

  const forms = await prisma.monthlyForm.findMany({
    where,
    orderBy: [{ year: "desc" }, { month: "desc" }],
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
  const { clientId, month, year, targetRevenue, enge, aov, ar, leadToClose, notes } = body;

  if (!clientId || !month || !year) {
    return NextResponse.json({ error: "Brak wymaganych pól" }, { status: 400 });
  }

  const form = await prisma.monthlyForm.upsert({
    where: { clientId_month_year: { clientId, month, year } },
    update: { targetRevenue, enge, aov, ar, leadToClose, notes },
    create: { clientId, month, year, targetRevenue, enge, aov, ar, leadToClose, notes },
  });

  return NextResponse.json(form);
}
