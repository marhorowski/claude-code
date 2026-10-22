import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { hashPassword, verifyPassword } from "./passwords";
import { REMEMBER_DAYS, SESSION_COOKIE, signSession, verifySession, type Role, type Session } from "./session";

const SESSION_HOURS_WITHOUT_REMEMBER = 12;

export async function getSession(): Promise<Session | null> {
  return verifySession(cookies().get(SESSION_COOKIE)?.value);
}

/** Sesja z ciasteczka + sprawdzenie, że konto nadal istnieje (usunięte konto traci dostęp od razu). */
export async function getValidSession(): Promise<Session | null> {
  const session = await getSession();
  if (!session) return null;
  const exists = await prisma.user.findUnique({ where: { id: session.uid }, select: { id: true } });
  return exists ? session : null;
}

export async function requireSession(): Promise<Session> {
  const session = await getValidSession();
  if (!session) redirect("/logowanie");
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireSession();
  if (session.role !== "ADMIN") redirect("/panel");
  return session;
}

/**
 * Pierwsze konto administratora zakłada się samo przy pierwszym logowaniu
 * danymi z ADMIN_EMAIL i ADMIN_PASSWORD (zmienne środowiskowe), dopóki w bazie nie ma żadnego admina.
 */
async function bootstrapAdmin(email: string, password: string) {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword || email !== adminEmail || password !== adminPassword) return null;
  if (await prisma.user.count({ where: { role: "ADMIN" } })) return null;
  return prisma.user.create({
    data: { email, name: "Administrator", role: "ADMIN", passwordHash: await hashPassword(password) },
  });
}

export async function authenticate(emailRaw: string, password: string) {
  const email = emailRaw.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) return (await verifyPassword(password, user.passwordHash)) ? user : null;
  return bootstrapAdmin(email, password);
}

export async function startSession(user: { id: string; role: string; clientId: string | null }, remember: boolean) {
  const maxAge = remember ? REMEMBER_DAYS * 86_400 : SESSION_HOURS_WITHOUT_REMEMBER * 3_600;
  const token = await signSession({
    uid: user.id,
    role: user.role as Role,
    cid: user.clientId,
    exp: Math.floor(Date.now() / 1000) + maxAge,
  });
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Bez „Zapamiętaj mnie” ciasteczko znika po zamknięciu przeglądarki.
    ...(remember ? { maxAge } : {}),
  });
}

export function endSession() {
  cookies().delete(SESSION_COOKIE);
}
