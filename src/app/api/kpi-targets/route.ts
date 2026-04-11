import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// KPI codes that are always visible and cannot be hidden
const MANDATORY_KPI_CODES = ["SUR", "CP", "CLOSINGS", "REVENUE", "MEETINGS_ATTENDED", "MEETINGS_BOOKED", "LEADS"];

const DEFAULT_KPI_TARGETS = [
  // DAILY
  { code: "CLOSINGS_D", label: "Zamknięcia", target: 1, unit: "szt", period: "DAILY", lowerIsBetter: false, visible: true },
  { code: "REVENUE_D", label: "Przychód", target: 5000, unit: "PLN", period: "DAILY", lowerIsBetter: false, visible: true },
  { code: "MEETINGS_BOOKED_D", label: "Spotkania umówione", target: 3, unit: "szt", period: "DAILY", lowerIsBetter: false, visible: true },
  { code: "ATTENDED_D", label: "Spotkania odbyte", target: 2, unit: "szt", period: "DAILY", lowerIsBetter: false, visible: true },
  { code: "UNQUALIFIED_D", label: "Spotkania niekwalifikowane", target: 1, unit: "szt", period: "DAILY", lowerIsBetter: true, visible: true },
  { code: "MEETING_FOLLOWUPS_D", label: "Follow-upy ze spotkań", target: 2, unit: "szt", period: "DAILY", lowerIsBetter: false, visible: true },
  { code: "CALLS_MADE_D", label: "Wykonane telefony", target: 50, unit: "szt", period: "DAILY", lowerIsBetter: false, visible: true },
  { code: "CALLS_RECEIVED_D", label: "Odebrane telefony", target: 10, unit: "szt", period: "DAILY", lowerIsBetter: false, visible: true },
  { code: "SETTING_BOOKED_D", label: "Setting — umówione spotkania", target: 5, unit: "szt", period: "DAILY", lowerIsBetter: false, visible: true },
  { code: "SETTING_FOLLOWUPS_D", label: "Follow-upy z telefonów", target: 3, unit: "szt", period: "DAILY", lowerIsBetter: false, visible: true },
  { code: "AD_SPEND_D", label: "Ad Spend", target: 200, unit: "PLN", period: "DAILY", lowerIsBetter: false, visible: true },
  { code: "CLICKS_D", label: "Kliknięcia", target: 100, unit: "szt", period: "DAILY", lowerIsBetter: false, visible: true },
  { code: "LEADS_D", label: "Leady", target: 5, unit: "szt", period: "DAILY", lowerIsBetter: false, visible: true },
  { code: "VSL_MEETINGS_D", label: "Spotkania z VSL", target: 3, unit: "szt", period: "DAILY", lowerIsBetter: false, visible: true },
  { code: "IMPRESSIONS_D", label: "Wyświetlenia reklamy", target: 1000, unit: "szt", period: "DAILY", lowerIsBetter: false, visible: true },
  // WEEKLY
  { code: "REVENUE", label: "Przychód tygodniowy", target: 25000, unit: "PLN", period: "WEEKLY", lowerIsBetter: false, visible: true },
  { code: "CLOSINGS", label: "Zamknięcia", target: 5, unit: "szt", period: "WEEKLY", lowerIsBetter: false, visible: true },
  { code: "SUR", label: "Show Up Rate", target: 70, unit: "%", period: "WEEKLY", lowerIsBetter: false, visible: true },
  { code: "CP", label: "Closing %", target: 30, unit: "%", period: "WEEKLY", lowerIsBetter: false, visible: true },
  { code: "MEETINGS_ATTENDED", label: "Spotkania odbyte", target: 10, unit: "szt", period: "WEEKLY", lowerIsBetter: false, visible: true },
  { code: "MEETINGS_BOOKED", label: "Spotkania umówione", target: 15, unit: "szt", period: "WEEKLY", lowerIsBetter: false, visible: true },
  { code: "LEADS", label: "Leady", target: 20, unit: "szt", period: "WEEKLY", lowerIsBetter: false, visible: true },
  { code: "CALLS_MADE", label: "Telefony (setting)", target: 250, unit: "szt", period: "WEEKLY", lowerIsBetter: false, visible: true },
  // MONTHLY
  { code: "REVENUE_M", label: "Przychód miesięczny", target: 100000, unit: "PLN", period: "MONTHLY", lowerIsBetter: false, visible: true },
  { code: "CLOSINGS_M", label: "Zamknięcia", target: 20, unit: "szt", period: "MONTHLY", lowerIsBetter: false, visible: true },
  { code: "LEADS_M", label: "Leady", target: 80, unit: "szt", period: "MONTHLY", lowerIsBetter: false, visible: true },
  { code: "CALLS_MADE_M", label: "Telefony (setting)", target: 1000, unit: "szt", period: "MONTHLY", lowerIsBetter: false, visible: true },
  // QUARTERLY
  { code: "REVENUE_Q", label: "Przychód kwartalny", target: 300000, unit: "PLN", period: "QUARTERLY", lowerIsBetter: false, visible: true },
  { code: "CLOSINGS_Q", label: "Zamknięcia", target: 60, unit: "szt", period: "QUARTERLY", lowerIsBetter: false, visible: true },
  { code: "LEADS_Q", label: "Leady", target: 240, unit: "szt", period: "QUARTERLY", lowerIsBetter: false, visible: true },
];

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Brak dostępu" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  const period = searchParams.get("period");

  if (!clientId) return NextResponse.json({ error: "Brak clientId" }, { status: 400 });

  const where: any = { clientId };
  if (period) where.period = period;

  const targets = await prisma.kpiTarget.findMany({ where, orderBy: [{ period: "asc" }, { code: "asc" }] });
  return NextResponse.json(targets);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "LIDER")) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const body = await req.json();
  const { clientId, defaults } = body;

  if (!clientId) return NextResponse.json({ error: "Brak clientId" }, { status: 400 });

  if (defaults) {
    const created = [];
    for (const t of DEFAULT_KPI_TARGETS) {
      const existing = await prisma.kpiTarget.findFirst({ where: { clientId, code: t.code, period: t.period } });
      if (!existing) {
        const result = await prisma.kpiTarget.create({ data: { ...t, clientId } });
        created.push(result);
      }
    }
    return NextResponse.json(created);
  }

  const { code, label, target, unit, period, lowerIsBetter, visible } = body;
  if (!code || !label || target === undefined || !unit || !period) {
    return NextResponse.json({ error: "Brak wymaganych pól" }, { status: 400 });
  }

  const result = await prisma.kpiTarget.create({
    data: { clientId, code, label, target, unit, period, lowerIsBetter: lowerIsBetter ?? false, visible: visible ?? true },
  });
  return NextResponse.json(result);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "LIDER")) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const body = await req.json();
  const { targets } = body;

  if (!targets || !Array.isArray(targets)) {
    return NextResponse.json({ error: "Brak celów" }, { status: 400 });
  }

  const updated = [];
  for (const t of targets) {
    const data: any = {};
    if (t.target !== undefined) data.target = t.target;
    if (t.visible !== undefined) {
      const current = await prisma.kpiTarget.findUnique({ where: { id: t.id } });
      if (!current || !MANDATORY_KPI_CODES.includes(current.code)) {
        data.visible = t.visible;
      }
    }
    if (Object.keys(data).length === 0) continue;
    const result = await prisma.kpiTarget.update({ where: { id: t.id }, data });
    updated.push(result);
  }

  return NextResponse.json(updated);
}
