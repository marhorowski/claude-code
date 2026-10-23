import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireLeader } from "@/lib/server";
import { CSAT_STAGES } from "@/lib/surveys";

export async function GET() {
  const auth = await requireLeader();
  if (auth.error) return auth.error;
  const links = await prisma.surveyLink.findMany({
    orderBy: { createdAt: "desc" },
    include: { csm: { select: { id: true, name: true } }, _count: { select: { responses: true } } },
  });
  return NextResponse.json(links);
}

export async function POST(req: Request) {
  const auth = await requireLeader();
  if (auth.error) return auth.error;
  const body = await req.json().catch(() => ({}));
  const type = body.type === "CSAT" ? "CSAT" : body.type === "NPS" ? "NPS" : null;
  if (!type) return NextResponse.json({ error: "Typ ankiety: NPS albo CSAT" }, { status: 400 });
  const stage = type === "CSAT" ? (CSAT_STAGES.some((s) => s.id === body.stage) ? body.stage : null) : null;
  if (type === "CSAT" && !stage) return NextResponse.json({ error: "Wybierz etap CSAT" }, { status: 400 });

  let csmId: string | null = null;
  if (typeof body.csmId === "string" && body.csmId) {
    const csm = await prisma.user.findUnique({ where: { id: body.csmId } });
    if (!csm) return NextResponse.json({ error: "Nie ma takiego CSM" }, { status: 400 });
    csmId = csm.id;
  }
  const label = String(body.label ?? "").trim().slice(0, 120) || (type === "NPS" ? "NPS" : `CSAT — ${CSAT_STAGES.find((s) => s.id === stage)!.label}`);

  const link = await prisma.surveyLink.create({
    data: { token: randomBytes(18).toString("base64url"), type, stage, csmId, label },
  });
  return NextResponse.json(link, { status: 201 });
}
