import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { requireSession } from "./auth";

/** Klient wybrany przez administratora w przełączniku w nagłówku. */
export const ACTIVE_CLIENT_COOKIE = "tracker_client";

export function newFormToken() {
  return randomBytes(18).toString("base64url");
}

/**
 * Klient, którego dane ogląda zalogowana osoba: konto klienta → zawsze jego firma;
 * admin → firma wybrana w przełączniku, a gdy brak wyboru — pierwsza założona. Null = nie ma żadnej firmy.
 */
export async function getActiveClient() {
  const session = await requireSession();
  if (session.role === "CLIENT") {
    return session.cid ? prisma.client.findUnique({ where: { id: session.cid } }) : null;
  }
  const chosen = cookies().get(ACTIVE_CLIENT_COOKIE)?.value;
  const client = chosen ? await prisma.client.findUnique({ where: { id: chosen } }) : null;
  return client ?? prisma.client.findFirst({ orderBy: { createdAt: "asc" } });
}

/** Jak getActiveClient, ale bez firmy przenosi do zakładki Klienci (admin) albo logowania (klient). */
export async function getCurrentClient() {
  const client = await getActiveClient();
  if (client) return client;
  const session = await requireSession();
  redirect(session.role === "ADMIN" ? "/panel/klienci" : "/logowanie");
}
