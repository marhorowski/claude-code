import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Jednorazowe utworzenie konta lidera. Chronione tokenem SETUP_TOKEN.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!process.env.SETUP_TOKEN || token !== process.env.SETUP_TOKEN) {
    return NextResponse.json({ error: "Nieautoryzowany dostęp" }, { status: 401 });
  }

  const existing = await prisma.user.findFirst();
  if (existing) {
    return NextResponse.json({ message: "Aplikacja jest już skonfigurowana", status: "already_done" });
  }

  const password = "LiderCSM2026!";
  await prisma.user.create({
    data: {
      email: "lider@agencja.pl",
      password: await bcrypt.hash(password, 12),
      name: "Lider CSM",
      role: "LIDER",
      fte: 0,
    },
  });

  return NextResponse.json({
    success: true,
    message: "Konto lidera utworzone. Zmień hasło po pierwszym logowaniu (Ustawienia → Moje konto).",
    login: { email: "lider@agencja.pl", haslo: password },
  });
}
