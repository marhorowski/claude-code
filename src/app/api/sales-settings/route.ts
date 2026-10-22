import { NextRequest, NextResponse } from "next/server";
import { getSessionOrAdmin } from "@/lib/getSession";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSessionOrAdmin();
  if (!session) return NextResponse.json({ error: "Brak dostępu" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "Brak clientId" }, { status: 400 });

  const settings = await prisma.salesSettings.findUnique({ where: { clientId } });
  return NextResponse.json(settings ?? {
    clientId,
    dealSize: 0,
    closerCommissionPct: 0,
    setterCommissionPct: 0,
    fixedMonthlyCosts: 0,
    leadToMeetingRate: 0,
    setterBookingRate: 0,
    vslConversionRate: 0,
  });
}

export async function PUT(req: NextRequest) {
  const session = await getSessionOrAdmin();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const body = await req.json();
  const {
    clientId, dealSize, closerCommissionPct, setterCommissionPct,
    fixedMonthlyCosts, leadToMeetingRate, setterBookingRate, vslConversionRate,
  } = body;
  if (!clientId) return NextResponse.json({ error: "Brak clientId" }, { status: 400 });

  const settings = await prisma.salesSettings.upsert({
    where: { clientId },
    update: { dealSize, closerCommissionPct, setterCommissionPct, fixedMonthlyCosts, leadToMeetingRate, setterBookingRate, vslConversionRate },
    create: { clientId, dealSize, closerCommissionPct, setterCommissionPct, fixedMonthlyCosts, leadToMeetingRate, setterBookingRate, vslConversionRate },
  });

  return NextResponse.json(settings);
}
