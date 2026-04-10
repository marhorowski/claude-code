import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Brak dostępu" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  const quarter = searchParams.get("quarter");
  const year = searchParams.get("year");

  if (!clientId) return NextResponse.json({ error: "Brak clientId" }, { status: 400 });

  const where: any = { clientId };
  if (quarter && year) {
    where.quarter = parseInt(quarter);
    where.year = parseInt(year);
  }

  const forms = await prisma.quarterlyForm.findMany({
    where,
    orderBy: [{ year: "desc" }, { quarter: "desc" }],
  });

  return NextResponse.json(forms);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Brak dostępu" }, { status: 401 });

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Tylko Admin może wypełniać dane kwartalne" }, { status: 403 });
  }

  const body = await req.json();
  const { clientId, quarter, year, ltv, alpvc, notes } = body;

  if (!clientId || !quarter || !year) {
    return NextResponse.json({ error: "Brak wymaganych pól" }, { status: 400 });
  }

  const form = await prisma.quarterlyForm.upsert({
    where: { clientId_quarter_year: { clientId, quarter, year } },
    update: { ltv, alpvc, notes },
    create: { clientId, quarter, year, ltv, alpvc, notes },
  });

  return NextResponse.json(form);
}
