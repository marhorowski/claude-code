import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { current, next } = await req.json().catch(() => ({}));
  if (typeof next !== "string" || next.length < 8) {
    return NextResponse.json({ error: "Nowe hasło musi mieć min. 8 znaków" }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { id: auth.user.id } });
  if (!user || typeof current !== "string" || !(await bcrypt.compare(current, user.password))) {
    return NextResponse.json({ error: "Obecne hasło jest nieprawidłowe" }, { status: 400 });
  }
  await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(next, 12) } });
  return NextResponse.json({ success: true });
}
