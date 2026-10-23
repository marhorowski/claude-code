import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireLeader } from "@/lib/server";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireLeader();
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (body.role === "LIDER" || body.role === "CSM") data.role = body.role;
  if (body.fte !== undefined) {
    const fte = Number(body.fte);
    if (!Number.isFinite(fte) || fte < 0 || fte > 2) return NextResponse.json({ error: "Etat musi być w zakresie 0–2" }, { status: 400 });
    data.fte = fte;
  }
  if (typeof body.active === "boolean") data.active = body.active;
  if (typeof body.password === "string" && body.password) {
    if (body.password.length < 8) return NextResponse.json({ error: "Hasło musi mieć min. 8 znaków" }, { status: 400 });
    data.password = await bcrypt.hash(body.password, 12);
  }
  if (params.id === auth.user.id && (data.role === "CSM" || data.active === false)) {
    return NextResponse.json({ error: "Nie możesz odebrać sobie roli lidera ani się dezaktywować" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data,
    select: { id: true, email: true, name: true, role: true, fte: true, active: true },
  });
  return NextResponse.json(user);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireLeader();
  if (auth.error) return auth.error;
  if (params.id === auth.user.id) return NextResponse.json({ error: "Nie możesz usunąć własnego konta" }, { status: 400 });
  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
