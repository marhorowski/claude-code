import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isLeader, requireLeader, requireUser } from "@/lib/server";

const publicFields = { id: true, email: true, name: true, role: true, fte: true, active: true } as const;

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const users = await prisma.user.findMany({
    where: isLeader(auth.user) ? {} : { id: auth.user.id },
    select: publicFields,
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const auth = await requireLeader();
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim();
  const password = String(body.password ?? "");
  const role = body.role === "LIDER" ? "LIDER" : "CSM";
  const fte = Number(body.fte ?? 1);

  if (!email.includes("@") || !name) return NextResponse.json({ error: "Podaj imię i poprawny email" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Hasło musi mieć min. 8 znaków" }, { status: 400 });
  if (!Number.isFinite(fte) || fte < 0 || fte > 2) return NextResponse.json({ error: "Etat musi być w zakresie 0–2" }, { status: 400 });
  if (await prisma.user.findUnique({ where: { email } })) {
    return NextResponse.json({ error: "Użytkownik z tym emailem już istnieje" }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: { email, name, role, fte, password: await bcrypt.hash(password, 12) },
    select: publicFields,
  });
  return NextResponse.json(user, { status: 201 });
}
