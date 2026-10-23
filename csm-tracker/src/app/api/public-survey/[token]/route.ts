import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function findLink(token: string) {
  const link = await prisma.surveyLink.findUnique({ where: { token } });
  return link && link.active ? link : null;
}

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const link = await findLink(params.token);
  if (!link) return NextResponse.json({ error: "Ankieta nie istnieje lub została zamknięta" }, { status: 404 });
  return NextResponse.json({ type: link.type, stage: link.stage });
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const link = await findLink(params.token);
  if (!link) return NextResponse.json({ error: "Ankieta nie istnieje lub została zamknięta" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const score = Number(body.score);
  const [min, max] = link.type === "NPS" ? [0, 10] : [1, 5];
  if (!Number.isInteger(score) || score < min || score > max) {
    return NextResponse.json({ error: `Ocena musi być w skali ${min}–${max}` }, { status: 400 });
  }
  const company = String(body.company ?? "").trim().slice(0, 120);
  if (!company) return NextResponse.json({ error: "Podaj nazwę firmy" }, { status: 400 });
  const comment = String(body.comment ?? "").trim().slice(0, 2000) || null;

  await prisma.surveyResponse.create({
    data: { linkId: link.id, type: link.type, stage: link.stage, csmId: link.csmId, score, company, comment },
  });
  return NextResponse.json({ success: true });
}
