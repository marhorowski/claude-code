"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { authenticate, endSession, requireSession, startSession } from "@/lib/auth";
import { hashPassword, MIN_PASSWORD_LENGTH, verifyPassword } from "@/lib/passwords";

export type FormState = { ok?: string; error?: string } | null;

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

/** Po zalogowaniu wracamy tylko pod adres w panelu — nigdy na zewnętrzną stronę. */
function safeNext(next: string) {
  return next.startsWith("/panel") && !next.startsWith("//") ? next : "/panel";
}

export async function login(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await authenticate(str(fd, "email"), String(fd.get("password") ?? ""));
  if (!user) {
    await new Promise((r) => setTimeout(r, 600)); // spowalnia zgadywanie haseł
    return { error: "Nieprawidłowy email lub hasło." };
  }
  await startSession(user, fd.get("remember") === "on");
  redirect(safeNext(str(fd, "next")));
}

export async function logout() {
  endSession();
  redirect("/logowanie");
}

export async function changePassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await requireSession();
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("password") ?? "");
  if (next.length < MIN_PASSWORD_LENGTH) return { error: `Nowe hasło musi mieć co najmniej ${MIN_PASSWORD_LENGTH} znaków.` };
  if (next !== String(fd.get("repeat") ?? "")) return { error: "Nowe hasła nie są takie same." };
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.uid } });
  if (!(await verifyPassword(current, user.passwordHash))) return { error: "Obecne hasło jest nieprawidłowe." };
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  return { ok: "Hasło zmienione." };
}
