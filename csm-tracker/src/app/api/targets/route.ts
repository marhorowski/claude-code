import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { KPIS, KPI_BY_CODE } from "@/lib/kpis";
import { requireLeader, requireUser } from "@/lib/server";

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const rows = await prisma.kpiTarget.findMany();
  const overrides = Object.fromEntries(rows.map((r) => [r.code, r.target]));
  return NextResponse.json(
    KPIS.map((k) => ({
      code: k.code, label: k.label, area: k.area, unit: k.unit, lowerIsBetter: k.lowerIsBetter,
      defaultTarget: k.target, target: overrides[k.code] ?? k.target,
    }))
  );
}

// Body: { targets: { [code]: number | null } } — null przywraca standard z dokumentu
export async function PUT(req: Request) {
  const auth = await requireLeader();
  if (auth.error) return auth.error;
  const body = await req.json().catch(() => ({}));
  const targets = body.targets && typeof body.targets === "object" ? body.targets : {};

  const ops = [];
  for (const [code, raw] of Object.entries(targets)) {
    const def = KPI_BY_CODE[code];
    if (!def) continue;
    if (raw === null || Number(raw) === def.target) {
      ops.push(prisma.kpiTarget.deleteMany({ where: { code } }));
      continue;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n === 0) return NextResponse.json({ error: `Nieprawidłowa norma dla ${def.label}` }, { status: 400 });
    ops.push(prisma.kpiTarget.upsert({ where: { code }, create: { code, target: n }, update: { target: n } }));
  }
  await prisma.$transaction(ops);
  return NextResponse.json({ success: true });
}
