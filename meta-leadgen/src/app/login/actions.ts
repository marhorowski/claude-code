"use server";

import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, SESSION_COOKIE } from "@/lib/auth";

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export async function login(_: string | null, form: FormData): Promise<string | null> {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return "Brak hasła w konfiguracji (zmienna APP_PASSWORD).";
  if ((process.env.AUTH_SECRET ?? "").length < 32) return "Zmienna AUTH_SECRET musi mieć min. 32 znaki.";
  if (!safeEqual(String(form.get("password") ?? ""), expected)) return "Nieprawidłowe hasło.";
  const session = await createSession();
  cookies().set(SESSION_COOKIE, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: session.maxAge,
  });
  redirect("/");
}

export async function logout() {
  cookies().delete(SESSION_COOKIE);
  redirect("/login");
}
