import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseThresholds } from "@/lib/grading";
import { requireLeader, requireUser } from "@/lib/server";

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const row = await prisma.setting.findUnique({ where: { key: "thresholds" } });
  return NextResponse.json({ thresholds: parseThresholds(row?.value) });
}

export async function PUT(req: Request) {
  const auth = await requireLeader();
  if (auth.error) return auth.error;
  const body = await req.json().catch(() => ({}));
  const t = body.thresholds ?? {};
  const value = JSON.stringify({ orange: Number(t.orange), green: Number(t.green), god: Number(t.god) });
  const parsed = parseThresholds(value);
  if (parsed.orange !== Number(t.orange) || parsed.green !== Number(t.green) || parsed.god !== Number(t.god)) {
    return NextResponse.json({ error: "Progi muszą rosnąć: czerwony < pomarańczowy < zielony" }, { status: 400 });
  }
  await prisma.setting.upsert({ where: { key: "thresholds" }, create: { key: "thresholds", value }, update: { value } });
  return NextResponse.json({ thresholds: parsed });
}
