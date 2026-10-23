import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireLeader } from "@/lib/server";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireLeader();
  if (auth.error) return auth.error;
  const body = await req.json().catch(() => ({}));
  const data: { active?: boolean; label?: string } = {};
  if (typeof body.active === "boolean") data.active = body.active;
  if (typeof body.label === "string" && body.label.trim()) data.label = body.label.trim().slice(0, 120);
  const link = await prisma.surveyLink.update({ where: { id: params.id }, data });
  return NextResponse.json(link);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireLeader();
  if (auth.error) return auth.error;
  await prisma.surveyLink.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
